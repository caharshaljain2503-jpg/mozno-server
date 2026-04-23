import SiteSettings from "../models/sitesettings.model.js";
import SiteContent from "../models/sitecontent.model.js";
import FAQ from "../models/faq.model.js";

// ================= PUBLIC SETTINGS =================
export const getPublicSettings = async (req, res) => {
  try {
    const [faqs, siteContent, siteSettings] = await Promise.all([
      FAQ.find({ status: "published" }).sort({ order: 1, createdAt: -1 }).lean(),
      SiteContent.findOne().lean(),
      SiteSettings.findOne().lean(),
    ]);

    // Get or create default site settings
    let settings = siteSettings;
    if (!settings) {
      settings = await SiteSettings.create({
        siteTitle: "Mozno Wealth - Your Personal CFO",
        siteDescription: "Comprehensive wealth management solutions tailored for you. Expert financial planning, investment advisory, and wealth optimization services.",
      });
    }

    return res.status(200).json({
      success: true,
      faqs: faqs.map((f) => ({ q: f.q, a: f.a || [] })),
      siteContent: siteContent?.published ? siteContent : null,
      siteSettings: {
        siteTitle: settings.siteTitle,
        siteDescription: settings.siteDescription,
        contactInfo: settings.contactInfo,
        socialLinks: settings.socialLinks,
      },
    });
  } catch (error) {
    console.error("getPublicSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public settings",
    });
  }
};

// ================= ADMIN: GET SETTINGS =================
export const getSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne().lean();
    
    if (!settings) {
      settings = await SiteSettings.create({
        siteTitle: "Mozno Wealth - Your Personal CFO",
        siteDescription: "Comprehensive wealth management solutions tailored for you. Expert financial planning, investment advisory, and wealth optimization services.",
      });
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("getSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
    });
  }
};

// ================= ADMIN: UPDATE SETTINGS =================
export const updateSettings = async (req, res) => {
  try {
    const {
      siteTitle,
      siteDescription,
      logo,
      favicon,
      contactInfo,
      googleAnalyticsId,
      socialLinks,
    } = req.body;

    let settings = await SiteSettings.findOne();
    
    if (!settings) {
      settings = new SiteSettings({
        siteTitle: "Mozno Wealth - Your Personal CFO",
        siteDescription: "Comprehensive wealth management solutions tailored for you.",
      });
    }

    // Update fields if provided
    if (siteTitle !== undefined) settings.siteTitle = siteTitle;
    if (siteDescription !== undefined) settings.siteDescription = siteDescription;
    if (logo !== undefined) settings.logo = logo;
    if (favicon !== undefined) settings.favicon = favicon;
    if (googleAnalyticsId !== undefined) settings.googleAnalyticsId = googleAnalyticsId;
    
    // Update contact info
    if (contactInfo) {
      if (!settings.contactInfo) settings.contactInfo = {};
      if (contactInfo.phone !== undefined) settings.contactInfo.phone = contactInfo.phone;
      if (contactInfo.email !== undefined) settings.contactInfo.email = contactInfo.email;
      if (contactInfo.whatsapp !== undefined) settings.contactInfo.whatsapp = contactInfo.whatsapp;
      if (contactInfo.address !== undefined) settings.contactInfo.address = contactInfo.address;
      if (contactInfo.mapLink !== undefined) settings.contactInfo.mapLink = contactInfo.mapLink;
    }

    // Update social links
    if (socialLinks) {
      if (!settings.socialLinks) settings.socialLinks = {};
      if (socialLinks.facebook !== undefined) settings.socialLinks.facebook = socialLinks.facebook;
      if (socialLinks.twitter !== undefined) settings.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.instagram !== undefined) settings.socialLinks.instagram = socialLinks.instagram;
      if (socialLinks.linkedin !== undefined) settings.socialLinks.linkedin = socialLinks.linkedin;
      if (socialLinks.youtube !== undefined) settings.socialLinks.youtube = socialLinks.youtube;
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("updateSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update settings",
    });
  }
};