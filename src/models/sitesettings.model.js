import { Schema, model } from "mongoose";

const siteSettingsSchema = new Schema(
  {
    // General SEO
    siteTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    siteDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    // Branding
    logo: {
      type: String, // URL or file path
      default: "",
    },
    favicon: {
      type: String, // URL or file path
      default: "",
    },

    // Contact Information
    contactInfo: {
      phone: {
        type: String,
        default: "+91 98205 07696",
        trim: true,
      },
      email: {
        type: String,
        default: "contact@mozno.in",
        trim: true,
      },
      whatsapp: {
        type: String,
        default: "https://wa.me/919820507696",
        trim: true,
      },
      address: {
        type: String,
        default: "C, 106, Shyam Kamal Rd, next to Rajwadi Chai, above IIFL Office, Agarwal Market, Vile Parle East, Vile Parle, Mumbai, Maharashtra 400057",
        trim: true,
      },
      mapLink: {
        type: String,
        default: "https://share.google/VNKicOtItWUL4lP5P",
        trim: true,
      },
      mapEmbedUrl: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // Analytics
    googleAnalyticsId: {
      type: String,
      default: "",
      trim: true,
    },

    // Assessment notification email
    assessmentEmailContent: {
      type: String,
      default: [
        "{{assessmentType}} Assessment Result",
        "",
        "Result: {{profileLabel}}",
        "Total score: {{totalScore}}",
        "Name: {{name}}",
        "Email: {{email}}",
        "Phone: {{phone}}",
        "",
        "Answers:",
        "{{answers}}",
      ].join("\n"),
      maxlength: 20000,
    },

    // Social Media
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "https://www.linkedin.com/in/harshalvjain/" },
      youtube: { type: String, default: "https://www.youtube.com/@theawarenessinitiative" },
    },
  },
  { timestamps: true },
);

const SiteSettings = model("SiteSettings", siteSettingsSchema);
export default SiteSettings;
