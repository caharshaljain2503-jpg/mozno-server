import mongoose from "mongoose";

const statItemSchema = new mongoose.Schema(
  {
    value: { type: String, default: "" },
    label: { type: String, default: "" },
  },
  { _id: false }
);

const milestoneItemSchema = new mongoose.Schema(
  {
    year: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const socialPostSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, default: "" },
    embedUrl: { type: String, default: "" },
    videoId: { type: String, default: "" },
    views: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    badge: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    authorName: { type: String, default: "" },
  },
  { _id: false }
);

const socialLinkSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema(
  {
    published: { type: Boolean, default: false },
    aboutStats: {
      enabled: { type: Boolean, default: true },
      items: { type: [statItemSchema], default: [] },
    },
    aboutJourney: {
      enabled: { type: Boolean, default: true },
      badgeText: { type: String, default: "Our Journey" },
      headingPrefix: { type: String, default: "Milestones That" },
      headingHighlight: { type: String, default: "Define Us" },
      description: {
        type: String,
        default: "From a vision to becoming a trusted name in Indian wealth management",
      },
      items: { type: [milestoneItemSchema], default: [] },
    },
    contactStats: {
      enabled: { type: Boolean, default: true },
      items: { type: [statItemSchema], default: [] },
    },
    socialMedia: {
      enabled: { type: Boolean, default: true },
      links: {
        youtube: { type: socialLinkSchema, default: { enabled: true, url: "" } },
        linkedin: { type: socialLinkSchema, default: { enabled: true, url: "" } },
        instagram: { type: socialLinkSchema, default: { enabled: true, url: "" } },
        twitter: { type: socialLinkSchema, default: { enabled: false, url: "" } },
        facebook: { type: socialLinkSchema, default: { enabled: false, url: "" } },
        reddit: { type: socialLinkSchema, default: { enabled: false, url: "" } },
      },
      youtubeVideos: { type: [socialPostSchema], default: [] },
      linkedinPosts: { type: [socialPostSchema], default: [] },
      instagramPosts: { type: [socialPostSchema], default: [] },
      twitterPosts: { type: [socialPostSchema], default: [] },
      facebookPosts: { type: [socialPostSchema], default: [] },
      redditPosts: { type: [socialPostSchema], default: [] },
    },
  },
  { timestamps: true }
);

const SiteContent = mongoose.model("SiteContent", siteContentSchema);
export default SiteContent;

