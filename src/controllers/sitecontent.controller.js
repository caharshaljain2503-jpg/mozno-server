import SiteContent from "../models/sitecontent.model.js";

/** Default posts for new SiteContent documents (matches former website hardcoded data). */
const DEFAULT_SOCIAL_POSTS = {
  youtubeVideos: [
    { title: "5 Wealth Building Principles", videoId: "hlja_xt6ZmI", views: "12K", enabled: true },
    { title: "Power of Compound Interest", videoId: "xTAL07asRco", views: "8.5K", enabled: true },
    { title: "Mindset for Financial Success", videoId: "m8npMzoaUus", views: "15K", enabled: true },
    {
      title: "Common Investment Mistakes",
      videoId: "c1y2qG7Blyk",
      views: "9.2K",
      enabled: true,
      badge: "AWARENESS ALERT",
    },
    {
      title: "Multiple Income Streams",
      videoId: "LcgaitbBjq4",
      views: "11K",
      enabled: true,
      badge: "AWARENESS ALERT",
    },
    { title: "Financial Literacy Basics", videoId: "281ZDb8di_Y", views: "7.8K", enabled: true },
    { title: "SMART Financial Goals", videoId: "esTTCTSc1H0", views: "6.5K", enabled: true },
  ],
  linkedinPosts: [
    {
      title: "Wealth Management",
      embedUrl:
        "https://www.linkedin.com/embed/feed/update/urn:li:share:7426578391170142208?collapsed=1",
      enabled: true,
    },
    {
      title: "Investment Tips",
      embedUrl:
        "https://www.linkedin.com/embed/feed/update/urn:li:share:7426224097799507969?collapsed=1",
      enabled: true,
    },
    {
      title: "Financial Planning",
      embedUrl:
        "https://www.linkedin.com/embed/feed/update/urn:li:share:7424767640570712064?collapsed=1",
      enabled: true,
    },
    {
      title: "Market Analysis",
      embedUrl:
        "https://www.linkedin.com/embed/feed/update/urn:li:share:7423322189241704450?collapsed=1",
      enabled: true,
    },
    {
      title: "Career Growth",
      embedUrl:
        "https://www.linkedin.com/embed/feed/update/urn:li:share:7422626482054918145?collapsed=1",
      enabled: true,
    },
    {
      title: "Professional Tips",
      embedUrl:
        "https://www.linkedin.com/embed/feed/update/urn:li:share:7421886063817715713?collapsed=1",
      enabled: true,
    },
  ],
  instagramPosts: [
    { title: "Instagram Reel", url: "https://www.instagram.com/reel/C7sFIJhy4nV/", enabled: true },
    { title: "Instagram Reel", url: "https://www.instagram.com/reel/C7D6b6gys0E/", enabled: true },
    { title: "Instagram Reel", url: "https://www.instagram.com/reel/C6wTaevSiQm/", enabled: true },
  ],
  twitterPosts: [],
  facebookPosts: [],
  redditPosts: [],
};

const defaultPayload = {
  published: false,
  aboutStats: {
    enabled: true,
    items: [
      { value: "500+", label: "Happy Clients" },
      { value: "₹50Cr+", label: "Wealth Managed" },
      { value: "98%", label: "Client Retention" },
      { value: "12+", label: "Years Experience" },
    ],
  },
  aboutJourney: {
    enabled: true,
    badgeText: "Our Journey",
    headingPrefix: "Milestones That",
    headingHighlight: "Define Us",
    description:
      "From a vision to becoming a trusted name in Indian wealth management",
    items: [
      {
        year: "2020",
        title: "Company Founded",
        description:
          "Mozno Wealth established in Mumbai with a vision to democratize wealth management",
      },
      {
        year: "2021",
        title: "Regulatory Approvals",
        description:
          "AMFI & APMI registrations secured, ensuring compliant operations",
      },
      {
        year: "2022",
        title: "Tech Platform Launch",
        description:
          "Digital wealth management platform for seamless client experience",
      },
      {
        year: "2023",
        title: "500+ Clients",
        description: "Crossed the milestone of 500 satisfied clients across India",
      },
      {
        year: "2024",
        title: "National Expansion",
        description:
          "Services expanded across 20+ Indian cities with pan-India presence",
      },
    ],
  },
  contactStats: {
    enabled: true,
    items: [
      { value: "24/7", label: "Support Available" },
      { value: "< 2hrs", label: "Response Time" },
      { value: "500+", label: "Clients Served" },
      { value: "Pan India", label: "Service Coverage" },
    ],
  },
  socialMedia: {
    enabled: true,
    links: {
      youtube: { enabled: true, url: "https://www.youtube.com/@awareness_initiative" },
      linkedin: { enabled: true, url: "https://www.linkedin.com/in/harshalvjain/" },
      instagram: { enabled: true, url: "https://www.instagram.com/the_awareness_initiative" },
      twitter: { enabled: false, url: "" },
      facebook: { enabled: false, url: "" },
      reddit: { enabled: false, url: "" },
    },
    ...DEFAULT_SOCIAL_POSTS,
  },
};

const getOrCreate = async () => {
  let doc = await SiteContent.findOne();
  if (!doc) doc = await SiteContent.create(defaultPayload);
  return doc;
};

export const getSiteContentAdmin = async (_req, res) => {
  try {
    const doc = await getOrCreate();
    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error("getSiteContentAdmin error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch site content" });
  }
};

/** Sample post bundles for admin “fill defaults” (same as new-site seed). */
export const getDefaultSocialPosts = async (_req, res) => {
  try {
    return res.status(200).json({ success: true, data: DEFAULT_SOCIAL_POSTS });
  } catch (error) {
    console.error("getDefaultSocialPosts error:", error);
    return res.status(500).json({ success: false, message: "Failed to load defaults" });
  }
};

export const updateSiteContentAdmin = async (req, res) => {
  try {
    const current = await getOrCreate();
    const patch = req.body || {};

    if (patch.published !== undefined) current.published = !!patch.published;

    if (patch.aboutStats) {
      current.aboutStats.enabled = !!patch.aboutStats.enabled;
      if (Array.isArray(patch.aboutStats.items)) current.aboutStats.items = patch.aboutStats.items;
    }

    if (patch.aboutJourney) {
      current.aboutJourney.enabled = !!patch.aboutJourney.enabled;
      if (patch.aboutJourney.badgeText !== undefined) current.aboutJourney.badgeText = patch.aboutJourney.badgeText;
      if (patch.aboutJourney.headingPrefix !== undefined) current.aboutJourney.headingPrefix = patch.aboutJourney.headingPrefix;
      if (patch.aboutJourney.headingHighlight !== undefined) current.aboutJourney.headingHighlight = patch.aboutJourney.headingHighlight;
      if (patch.aboutJourney.description !== undefined) current.aboutJourney.description = patch.aboutJourney.description;
      if (Array.isArray(patch.aboutJourney.items)) current.aboutJourney.items = patch.aboutJourney.items;
    }

    if (patch.contactStats) {
      current.contactStats.enabled = !!patch.contactStats.enabled;
      if (Array.isArray(patch.contactStats.items)) current.contactStats.items = patch.contactStats.items;
    }

    if (patch.socialMedia) {
      current.socialMedia.enabled = !!patch.socialMedia.enabled;

      if (patch.socialMedia.links && typeof patch.socialMedia.links === "object") {
        const platforms = ["youtube", "linkedin", "instagram", "twitter", "facebook", "reddit"];
        platforms.forEach((platform) => {
          if (patch.socialMedia.links[platform]) {
            current.socialMedia.links[platform] = {
              enabled: !!patch.socialMedia.links[platform].enabled,
              url: patch.socialMedia.links[platform].url || "",
            };
          }
        });
      }

      if (Array.isArray(patch.socialMedia.youtubeVideos)) current.socialMedia.youtubeVideos = patch.socialMedia.youtubeVideos;
      if (Array.isArray(patch.socialMedia.linkedinPosts)) current.socialMedia.linkedinPosts = patch.socialMedia.linkedinPosts;
      if (Array.isArray(patch.socialMedia.instagramPosts)) current.socialMedia.instagramPosts = patch.socialMedia.instagramPosts;
      if (Array.isArray(patch.socialMedia.twitterPosts)) current.socialMedia.twitterPosts = patch.socialMedia.twitterPosts;
      if (Array.isArray(patch.socialMedia.facebookPosts)) current.socialMedia.facebookPosts = patch.socialMedia.facebookPosts;
      if (Array.isArray(patch.socialMedia.redditPosts)) current.socialMedia.redditPosts = patch.socialMedia.redditPosts;
    }

    await current.save();
    return res.status(200).json({ success: true, data: current, message: "Site content updated" });
  } catch (error) {
    console.error("updateSiteContentAdmin error:", error);
    return res.status(500).json({ success: false, message: "Failed to update site content" });
  }
};

