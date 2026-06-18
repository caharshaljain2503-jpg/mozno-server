import { z } from "zod";

export const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(50, "Full name must be at most 50 characters"),

  email: z
    .string()
    .trim()
    .email("Invalid email address"),

  phone: z
    .string()
    .trim()
    .min(7, "Invalid phone number")
    .max(20, "Invalid phone number"),

  company: z.preprocess(
    (v) => (v === null || v === undefined ? "" : String(v).trim()),
    z.string().max(100, "Company name is too long"),
  ),

  service: z
    .string()
    .trim()
    .min(2, "Service field is required"),

  message: z.preprocess(
    (v) => (v === null || v === undefined ? "" : String(v).trim()),
    z.string().max(1000, "Message must be at most 1000 characters"),
  ),

  recaptchaToken: z
    .string()
    .trim()
    .min(1, "Please complete the CAPTCHA."),
});

/** Pre-questionnaire leads (Financial Health / Risk Profiling) with Google reCAPTCHA */
export const assessmentLeadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters")
    .max(50, "Full name must be at most 50 characters"),

  email: z.string().trim().email("Invalid email address"),

  phone: z.string().trim().min(7, "Invalid phone number").max(20, "Invalid phone number"),

  message: z.preprocess(
    (v) => (v === null || v === undefined ? "" : String(v).trim()),
    z.string().max(1000, "Message must be at most 1000 characters"),
  ),

  service: z.enum(["financial-health-questionnaire", "risk-profiling-questionnaire"]),

  recaptchaToken: z.string().trim().min(1, "Please complete the CAPTCHA."),
});
