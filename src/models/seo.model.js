import mongoose from "mongoose";

const seoSchema = new mongoose.Schema(
  {
    // ============= GENERAL SETTINGS =============
    siteTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "Mozno Advisory",
    },
    siteDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: "Comprehensive financial advisory and wealth management services",
    },
    siteKeywords: {
      type: [String],
      default: ["financial advisory", "wealth management", "investment planning"],
    },
    
    // ============= BRANDING =============
    logo: {
      type: String,
      default: null,
    },
    logoAlt: {
      type: String,
      default: "Company Logo",
    },
    favicon: {
      type: String,
      default: null,
    },
    
    // ============= ANALYTICS =============
    googleAnalyticsId: {
      type: String,
      trim: true,
      default: null,
      match: [/^(G|UA|AW)-[A-Z0-9-]+$/, "Invalid Google Analytics ID"],
    },
    googleTagManagerId: {
      type: String,
      trim: true,
      default: null,
      match: [/^GTM-[A-Z0-9]+$/, "Invalid Google Tag Manager ID"],
    },
    facebookPixelId: {
      type: String,
      trim: true,
      default: null,
      match: [/^[0-9]+$/, "Invalid Facebook Pixel ID"],
    },
    microsoftClarityId: {
      type: String,
      trim: true,
      default: null,
    },
    
    // ============= SOCIAL MEDIA =============
    socialLinks: {
      facebook: { type: String, trim: true, default: null },
      twitter: { type: String, trim: true, default: null },
      instagram: { type: String, trim: true, default: null },
      linkedin: { type: String, trim: true, default: null },
      youtube: { type: String, trim: true, default: null },
      pinterest: { type: String, trim: true, default: null },
      github: { type: String, trim: true, default: null },
      whatsapp: { type: String, trim: true, default: null },
      telegram: { type: String, trim: true, default: null },
    },
    
    // ============= OPEN GRAPH (Facebook/LinkedIn) =============
    ogTitle: {
      type: String,
      trim: true,
      maxlength: 95,
      default: null,
    },
    ogDescription: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    ogImage: {
      type: String,
      default: null,
    },
    ogImageAlt: {
      type: String,
      trim: true,
      default: null,
    },
    ogType: {
      type: String,
      enum: ["website", "article", "profile", "book", "music", "video"],
      default: "website",
    },
    
    // ============= TWITTER CARDS =============
    twitterCard: {
      type: String,
      enum: ["summary", "summary_large_image", "app", "player"],
      default: "summary_large_image",
    },
    twitterSite: {
      type: String,
      trim: true,
      default: null,
    },
    twitterCreator: {
      type: String,
      trim: true,
      default: null,
    },
    twitterTitle: {
      type: String,
      trim: true,
      maxlength: 70,
      default: null,
    },
    twitterDescription: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    twitterImage: {
      type: String,
      default: null,
    },
    twitterImageAlt: {
      type: String,
      trim: true,
      default: null,
    },
    
    // ============= ROBOTS & INDEXING =============
    robotsTxt: {
      type: String,
      default: "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /private\nSitemap: https://mozno.in/sitemap.xml",
    },
    metaRobots: {
      type: String,
      enum: ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"],
      default: "index,follow",
    },
    
    // ============= SITEMAP =============
    sitemapEnabled: {
      type: Boolean,
      default: true,
    },
    sitemapPriority: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    sitemapChangefreq: {
      type: String,
      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
      default: "weekly",
    },
    
    // ============= SCHEMA MARKUP =============
    organizationSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Mozno Advisory",
        "url": "https://mozno.in",
        "logo": "https://mozno.in/logo.png",
        "sameAs": [],
      },
    },
    localBusinessSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    
    // ============= CUSTOM HEADERS =============
    customHeadHtml: {
      type: String,
      default: null,
    },
    customFooterHtml: {
      type: String,
      default: null,
    },
    
    // ============= PERFORMANCE =============
    enableCdn: {
      type: Boolean,
      default: true,
    },
    enableMinification: {
      type: Boolean,
      default: true,
    },
    enableLazyLoading: {
      type: Boolean,
      default: true,
    },
    
    // ============= SECURITY =============
    enableHttpsRedirect: {
      type: Boolean,
      default: true,
    },
    enableWwwRedirect: {
      type: Boolean,
      default: false,
    },
    enableTrailingSlash: {
      type: Boolean,
      default: false,
    },
    
    // ============= CONTACT =============
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: null,
    },
    contactAddress: {
      type: String,
      trim: true,
      default: null,
    },
    
    // ============= METADATA =============
    version: {
      type: Number,
      default: 1,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure only one settings document exists
seoSchema.statics.getSettings = async function() {
  const settings = await this.findOne();
  if (settings) return settings;
  return this.create({}); // Create default settings
};

const SEO = mongoose.model("SEO", seoSchema);
export default SEO;