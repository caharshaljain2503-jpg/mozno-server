import { z } from "zod";
import { contactSchema, assessmentLeadSchema } from "../validator/user.schema.js";
import emailQueue from "../queues/email.queue.js";
import redis from "../configs/redis.js";
import User from "../models/user.model.js";
import { verifyRecaptchaV2 } from "../utils/recaptcha.util.js";
import { signAssessmentCaptcha, verifyAssessmentCaptcha } from "../utils/assessmentCaptcha.util.js";

const EMAIL_DEDUPE_TTL = 60 * 5; // 5 minutes

const ASSESSMENT_SERVICE_LABEL = {
  "financial-health-questionnaire": "Financial Health (Questionnaire)",
  "risk-profiling-questionnaire": "Risk Profiling (Questionnaire)",
};

function formatAssessmentMessage(serviceKey, raw) {
  const head =
    serviceKey === "financial-health-questionnaire"
      ? "Financial Health Check"
      : "Risk Profiling";
  return `[${head} — pre-questionnaire signup]\n\n${String(raw).trim()}`;
}

export const getAssessmentChallenge = (req, res) => {
  try {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const exp = Date.now() + 15 * 60 * 1000;
    const sig = signAssessmentCaptcha(n1, n2, exp);
    return res.status(200).json({
      success: true,
      n1,
      n2,
      exp,
      sig,
    });
  } catch (e) {
    console.error("getAssessmentChallenge:", e);
    return res.status(500).json({
      success: false,
      message: "Could not create verification challenge.",
    });
  }
};

async function upsertContactLead({
  fullName,
  email,
  phone,
  company,
  service,
  message,
  req,
}) {
  const country = req.headers["x-vercel-ip-country"] || "Unknown";
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedService = service.trim();

  let contact = await User.findOne({
    email: normalizedEmail,
    service: normalizedService,
  }).lean();

  let isNewContact = false;

  if (contact) {
    contact = await User.findOneAndUpdate(
      { email: normalizedEmail, service: normalizedService },
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        company: company?.trim() || null,
        message: message.trim(),
        status: "new",
        emailStatus: "pending",
        country,
      },
      { new: true },
    );
  } else {
    isNewContact = true;
    contact = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      company: company?.trim() || null,
      service: normalizedService,
      message: message.trim(),
      status: "new",
      emailStatus: "pending",
      country,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  const redisKey = `email_lock:${normalizedEmail}:${normalizedService}`;
  const alreadyQueued = await redis.get(redisKey);

  if (!alreadyQueued) {
    await redis.setex(redisKey, EMAIL_DEDUPE_TTL, "1");

    await emailQueue.add(
      "send-contact-confirmation",
      {
        contactId: contact._id.toString(),
        email: normalizedEmail,
        fullName: contact.fullName,
        service: normalizedService,
      },
      {
        jobId: `contact-email-${contact._id}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    console.log(`📬 Email job queued for: ${normalizedEmail}`);
  } else {
    console.log(`⏭️ Email already queued for: ${normalizedEmail} (dedupe TTL: ${EMAIL_DEDUPE_TTL}s)`);
  }

  return { contact, isNewContact };
}

export const contactForm = async (req, res) => {
  try {
    let fullName;
    let email;
    let phone;
    let company;
    let service;
    let message;
    if (req.body?.assessmentCaptcha && typeof req.body.assessmentCaptcha === "object") {
      // Handle both assessment leads AND regular contact form with math captcha
      const isAssessmentLead = req.body.service === "financial-health-questionnaire" || 
                               req.body.service === "risk-profiling-questionnaire";
      
      if (isAssessmentLead) {
        const validated = assessmentLeadSchema.parse(req.body);
        const ac = validated.assessmentCaptcha;
        if (
          !verifyAssessmentCaptcha({
            n1: ac.n1,
            n2: ac.n2,
            answer: ac.answer,
            exp: ac.exp,
            sig: ac.sig,
          })
        ) {
          return res.status(400).json({
            success: false,
            message: "Wrong answer or expired verification. Please solve the math again.",
          });
        }
        fullName = validated.fullName;
        email = validated.email;
        phone = validated.phone;
        company = null;
        service = ASSESSMENT_SERVICE_LABEL[validated.service];
        message = formatAssessmentMessage(validated.service, validated.message);
      } else {
        // Regular contact form with math captcha
        const validated = contactSchema.omit({ recaptchaToken: true }).parse(req.body);
        const ac = req.body.assessmentCaptcha;
        if (
          !verifyAssessmentCaptcha({
            n1: ac.n1,
            n2: ac.n2,
            answer: ac.answer,
            exp: ac.exp,
            sig: ac.sig,
          })
        ) {
          return res.status(400).json({
            success: false,
            message: "Wrong answer or expired verification. Please solve the math again.",
          });
        }
        fullName = validated.fullName;
        email = validated.email;
        phone = validated.phone;
        company = validated.company;
        service = validated.service;
        message = validated.message;
      }
    } else {
      const validatedData = contactSchema.parse(req.body);
      fullName = validatedData.fullName;
      email = validatedData.email;
      phone = validatedData.phone;
      company = validatedData.company;
      service = validatedData.service;
      message = validatedData.message;
      const { recaptchaToken } = validatedData;

      if (!process.env.RECAPTCHA_SECRET_KEY) {
        console.error("RECAPTCHA_SECRET_KEY is not set — contact form CAPTCHA disabled");
        return res.status(503).json({
          success: false,
          message: "Form temporarily unavailable. Please try again later.",
        });
      }

      const captchaOk = await verifyRecaptchaV2(recaptchaToken, req.ip);
      if (!captchaOk) {
        return res.status(400).json({
          success: false,
          message: "CAPTCHA verification failed. Please try again.",
        });
      }
    }

    const { isNewContact } = await upsertContactLead({
      fullName,
      email,
      phone,
      company,
      service,
      message,
      req,
    });

    return res.status(isNewContact ? 201 : 200).json({
      success: true,
      message: isNewContact
        ? "Form submitted successfully. We'll contact you soon!"
        : "Your request has been updated successfully.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues?.[0];
      return res.status(400).json({
        success: false,
        message: first?.message || "Validation failed",
      });
    }

    console.error("❌ Contact form error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};
