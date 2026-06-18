import { z } from "zod";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAnswer(value) {
  if (!value || typeof value !== "object") {
    return escapeHtml(value);
  }

  const parts = [];
  if (value.section) parts.push(`<span style="color:#64748b;">${escapeHtml(value.section)}</span>`);
  if (value.question) parts.push(`<b>${escapeHtml(value.question)}</b>`);
  if (value.answer) parts.push(`Answer: ${escapeHtml(value.answer)}`);
  if (value.score !== undefined) parts.push(`Score: ${escapeHtml(value.score)}`);

  return parts.length ? parts.join("<br/>") : escapeHtml(JSON.stringify(value));
}

function buildHtml({ fullName, email, phone, assessmentKind, profileLabel, totalScore, answers }) {
  const kindTitle =
    assessmentKind === "financial-health"
      ? "Financial Health"
      : "Risk Profiling";

  const answersLines = Object.entries(answers || {})
    .map(([k, v]) => {
      return `<li style="margin-bottom:10px;"><b>Q${escapeHtml(k)}</b><br/>${formatAnswer(v)}</li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background:#f4f8f7; margin:0; padding:0;">
  <div style="max-width:650px; margin:30px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #14b8a6, #0ea5a4); padding:26px 28px; color:#fff; text-align:left;">
      <h1 style="margin:0; font-size:22px; letter-spacing:0.5px;">Mozno Wealth — ${kindTitle} Result</h1>
      <p style="margin:8px 0 0; opacity:0.95; font-size:13px;">Submitted via website assessment</p>
    </div>

    <div style="padding:26px 28px; color:#333;">
      <p style="margin:0 0 10px;">
        <b>Result:</b> ${escapeHtml(profileLabel)}
      </p>
      <p style="margin:0 0 18px;">
        <b>Total score:</b> ${escapeHtml(totalScore)}
      </p>

      ${fullName ? `<p style="margin:0 0 8px;"><b>Name:</b> ${escapeHtml(fullName)}</p>` : ""}
      ${email ? `<p style="margin:0 0 8px;"><b>Email:</b> ${escapeHtml(email)}</p>` : ""}
      ${phone ? `<p style="margin:0 0 18px;"><b>Phone:</b> ${escapeHtml(phone)}</p>` : ""}

      <div style="background:#f0fdfa; border-left:4px solid #14b8a6; padding:14px 16px; border-radius:6px;">
        <b>Answers</b>
        <ul style="margin:10px 0 0; padding-left:18px; line-height:1.6;">
          ${answersLines || "<li>No answers provided</li>"}
        </ul>
      </div>

      <p style="margin:18px 0 0; font-size:12px; color:#666; line-height:1.5;">
        Generated automatically by the assessment form. Not investment advice.
      </p>
    </div>

    <div style="background:#f9fafb; text-align:center; padding:14px; font-size:12px; color:#777;">
      © ${new Date().getFullYear()} Mozno Wealth
    </div>
  </div>
</body>
</html>`;
}

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

export const submitAssessmentResult = async (req, res) => {
  try {
    const parsed = assessmentResultSchema.parse(req.body);

    if (!process.env.WEB3FORMS_ACCESS_KEY) {
      return res.status(503).json({
        success: false,
        message: "WEB3FORMS_ACCESS_KEY is not configured",
      });
    }

    const html = buildHtml({
      fullName: parsed.fullName,
      assessmentKind: parsed.assessmentKind,
      email: parsed.email,
      phone: parsed.phone,
      profileLabel: parsed.profileLabel,
      totalScore: parsed.totalScore,
      answers: parsed.answers,
    });

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

    await submitWeb3Form({
      subject,
      from_name: parsed.fullName || "Mozno Wealth Website",
      email: parsed.email || "no-reply@mozno.in",
      phone: parsed.phone || "",
      assessment_kind: parsed.assessmentKind,
      profile_label: parsed.profileLabel,
      total_score: String(parsed.totalScore),
      message: text,
      html,
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
