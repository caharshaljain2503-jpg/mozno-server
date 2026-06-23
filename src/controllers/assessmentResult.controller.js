import { z } from "zod";
import SiteSettings from "../models/sitesettings.model.js";
import { submitWeb3Form } from "../utils/web3forms.js";

const assessmentResultSchema = z.object({
  assessmentKind: z.enum(["financial-health", "risk-profiling"]),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  totalScore: z.number().int(),
  profileLabel: z.string(),
  answers: z.record(z.string(), z.any()),
});

function buildText({ fullName, email, phone, assessmentKind, profileLabel, totalScore, answers }) {
  const kindTitle =
    assessmentKind === "financial-health"
      ? "Financial Health"
      : "Risk Profiling";

  const answerLines = Object.entries(answers || {})
    .map(([key, value]) => {
      if (!value || typeof value !== "object") {
        return `Q${key}: ${String(value ?? "")}`;
      }

      return [
        `Q${key}`,
        value.section ? `Section: ${value.section}` : null,
        value.question ? `Question: ${value.question}` : null,
        value.answer ? `Answer: ${value.answer}` : null,
        value.score !== undefined ? `Score: ${value.score}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `${kindTitle} Assessment Result`,
    `Result: ${profileLabel}`,
    `Total score: ${totalScore}`,
    fullName ? `Name: ${fullName}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    "",
    "Answers:",
    answerLines || "No answers provided",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function renderEmailContent(template, values) {
  return template.replace(
    /{{\s*(assessmentType|profileLabel|totalScore|name|email|phone|answers)\s*}}/g,
    (_, key) => String(values[key] ?? ""),
  );
}

export const submitAssessmentResult = async (req, res) => {
  try {
    const parsed = assessmentResultSchema.parse(req.body);

    if (!process.env.WEB3FORMS_ACCESS_KEY) {
      return res.status(503).json({
        success: false,
        message: "WEB3FORMS_ACCESS_KEY is not configured",
      });
    }

    const subject =
      parsed.assessmentKind === "financial-health"
        ? "Financial Health assessment result"
        : "Risk Profiling assessment result";

    const text = buildText({
      fullName: parsed.fullName,
      assessmentKind: parsed.assessmentKind,
      email: parsed.email,
      phone: parsed.phone,
      profileLabel: parsed.profileLabel,
      totalScore: parsed.totalScore,
      answers: parsed.answers,
    });

    const settings = await SiteSettings.findOne()
      .select("assessmentEmailContent")
      .lean();

    const message = settings?.assessmentEmailContent?.trim()
      ? renderEmailContent(settings.assessmentEmailContent, {
          assessmentType:
            parsed.assessmentKind === "financial-health"
              ? "Financial Health"
              : "Risk Profiling",
          profileLabel: parsed.profileLabel,
          totalScore: parsed.totalScore,
          name: parsed.fullName || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
          answers: text.split("\nAnswers:\n")[1] || "No answers provided",
        })
      : text;

    await submitWeb3Form({
      subject,
      from_name: "Mozno Wealth Website",
      replyto: parsed.email || "no-reply@mozno.in",
      message,
    });

    return res.status(200).json({
      success: true,
      message: "Assessment result received.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.issues?.[0]?.message || "Validation failed" });
    }
    console.error("submitAssessmentResult error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to submit assessment result",
    });
  }
};
