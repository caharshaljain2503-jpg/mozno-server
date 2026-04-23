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
        default: "106, Shyamkamal 'C' Building, Agarwal Market, Vile Parle East, Mumbai - 400 057",
        trim: true,
      },
      mapLink: {
        type: String,
        default: "https://maps.app.goo.gl/VQSp7vAJ3kTvGcW47",
        trim: true,
      },
    },

    // Analytics
    googleAnalyticsId: {
      type: String,
      default: "",
      trim: true,
    },

    // Social Media
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      linkedin: { type: String, default: "https://www.linkedin.com/in/harshalvjain/" },
      youtube: { type: String, default: "https://www.youtube.com/@awareness_initiative" },
    },
  },
  { timestamps: true },
);

const SiteSettings = model("SiteSettings", siteSettingsSchema);
export default SiteSettings;
