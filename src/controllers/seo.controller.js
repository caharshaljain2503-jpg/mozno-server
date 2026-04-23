import SEO from "../models/seo.model.js";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============= GET SETTINGS =============

export const getSeoSettings = async (req, res) => {
  try {
    const settings = await SEO.getSettings();
    
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get SEO settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch SEO settings",
    });
  }
};

// ============= UPDATE SETTINGS =============

export const updateSeoSettings = async (req, res) => {
  try {
    const {
      // General
      siteTitle,
      siteDescription,
      siteKeywords,
      
      // Analytics
      googleAnalyticsId,
      googleTagManagerId,
      facebookPixelId,
      microsoftClarityId,
      
      // Social Links
      socialLinks,
      
      // Open Graph
      ogTitle,
      ogDescription,
      ogImageAlt,
      ogType,
      
      // Twitter
      twitterCard,
      twitterSite,
      twitterCreator,
      twitterTitle,
      twitterDescription,
      twitterImageAlt,
      
      // Robots & Indexing
      robotsTxt,
      metaRobots,
      
      // Sitemap
      sitemapEnabled,
      sitemapPriority,
      sitemapChangefreq,
      
      // Schema
      organizationSchema,
      localBusinessSchema,
      
      // Custom HTML
      customHeadHtml,
      customFooterHtml,
      
      // Performance
      enableCdn,
      enableMinification,
      enableLazyLoading,
      
      // Security
      enableHttpsRedirect,
      enableWwwRedirect,
      enableTrailingSlash,
      
      // Contact
      contactEmail,
      contactPhone,
      contactAddress,
      
      // Branding Alt Text
      logoAlt,
    } = req.body;

    // Handle file uploads
    let logo = undefined;
    let favicon = undefined;
    let ogImage = undefined;
    let twitterImage = undefined;

    if (req.files) {
      if (req.files.logo) {
        logo = `/uploads/seo/${req.files.logo[0].filename}`;
      }
      if (req.files.favicon) {
        favicon = `/uploads/seo/${req.files.favicon[0].filename}`;
      }
      if (req.files.ogImage) {
        ogImage = `/uploads/seo/${req.files.ogImage[0].filename}`;
      }
      if (req.files.twitterImage) {
        twitterImage = `/uploads/seo/${req.files.twitterImage[0].filename}`;
      }
    }

    // Get or create settings
    let settings = await SEO.findOne();
    
    if (!settings) {
      settings = new SEO();
    }

    // Update fields
    if (siteTitle !== undefined) settings.siteTitle = siteTitle;
    if (siteDescription !== undefined) settings.siteDescription = siteDescription;
    if (siteKeywords !== undefined) settings.siteKeywords = siteKeywords;
    if (logo !== undefined) settings.logo = logo;
    if (favicon !== undefined) settings.favicon = favicon;
    if (logoAlt !== undefined) settings.logoAlt = logoAlt;
    
    // Analytics
    if (googleAnalyticsId !== undefined) settings.googleAnalyticsId = googleAnalyticsId;
    if (googleTagManagerId !== undefined) settings.googleTagManagerId = googleTagManagerId;
    if (facebookPixelId !== undefined) settings.facebookPixelId = facebookPixelId;
    if (microsoftClarityId !== undefined) settings.microsoftClarityId = microsoftClarityId;
    
    // Social Links
    if (socialLinks !== undefined) {
      settings.socialLinks = {
        ...settings.socialLinks,
        ...socialLinks,
      };
    }
    
    // Open Graph
    if (ogTitle !== undefined) settings.ogTitle = ogTitle;
    if (ogDescription !== undefined) settings.ogDescription = ogDescription;
    if (ogImage !== undefined) settings.ogImage = ogImage;
    if (ogImageAlt !== undefined) settings.ogImageAlt = ogImageAlt;
    if (ogType !== undefined) settings.ogType = ogType;
    
    // Twitter
    if (twitterCard !== undefined) settings.twitterCard = twitterCard;
    if (twitterSite !== undefined) settings.twitterSite = twitterSite;
    if (twitterCreator !== undefined) settings.twitterCreator = twitterCreator;
    if (twitterTitle !== undefined) settings.twitterTitle = twitterTitle;
    if (twitterDescription !== undefined) settings.twitterDescription = twitterDescription;
    if (twitterImage !== undefined) settings.twitterImage = twitterImage;
    if (twitterImageAlt !== undefined) settings.twitterImageAlt = twitterImageAlt;
    
    // Robots & Indexing
    if (robotsTxt !== undefined) settings.robotsTxt = robotsTxt;
    if (metaRobots !== undefined) settings.metaRobots = metaRobots;
    
    // Sitemap
    if (sitemapEnabled !== undefined) settings.sitemapEnabled = sitemapEnabled;
    if (sitemapPriority !== undefined) settings.sitemapPriority = sitemapPriority;
    if (sitemapChangefreq !== undefined) settings.sitemapChangefreq = sitemapChangefreq;
    
    // Schema
    if (organizationSchema !== undefined) settings.organizationSchema = organizationSchema;
    if (localBusinessSchema !== undefined) settings.localBusinessSchema = localBusinessSchema;
    
    // Custom HTML
    if (customHeadHtml !== undefined) settings.customHeadHtml = customHeadHtml;
    if (customFooterHtml !== undefined) settings.customFooterHtml = customFooterHtml;
    
    // Performance
    if (enableCdn !== undefined) settings.enableCdn = enableCdn;
    if (enableMinification !== undefined) settings.enableMinification = enableMinification;
    if (enableLazyLoading !== undefined) settings.enableLazyLoading = enableLazyLoading;
    
    // Security
    if (enableHttpsRedirect !== undefined) settings.enableHttpsRedirect = enableHttpsRedirect;
    if (enableWwwRedirect !== undefined) settings.enableWwwRedirect = enableWwwRedirect;
    if (enableTrailingSlash !== undefined) settings.enableTrailingSlash = enableTrailingSlash;
    
    // Contact
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (contactAddress !== undefined) settings.contactAddress = contactAddress;
    
    // Metadata
    settings.version = (settings.version || 0) + 1;
    settings.lastUpdatedBy = req.user?.id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "SEO settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Update SEO settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update SEO settings",
    });
  }
};

// ============= ROBOTS.TXT =============

export const getRobotsTxt = async (req, res) => {
  try {
    const settings = await SEO.getSettings();
    
    res.header("Content-Type", "text/plain");
    return res.send(settings.robotsTxt);
  } catch (error) {
    console.error("Get robots.txt error:", error);
    return res.status(500).send("User-agent: *\nDisallow: /");
  }
};

// ============= SITEMAP.XML =============

export const getSitemap = async (req, res) => {
  try {
    const settings = await SEO.getSettings();
    
    if (!settings.sitemapEnabled) {
      return res.status(404).send("Sitemap disabled");
    }

    // You would generate sitemap dynamically here
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${req.get("host")}/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://${req.get("host")}/about</loc>
    <priority>0.8</priority>
    <changefreq>monthly</changefreq>
  </url>
</urlset>`;

    res.header("Content-Type", "application/xml");
    return res.send(sitemap);
  } catch (error) {
    console.error("Get sitemap error:", error);
    return res.status(500).send("Error generating sitemap");
  }
};

// ============= SCHEMA.JSON =============

export const getSchemaJson = async (req, res) => {
  try {
    const settings = await SEO.getSettings();
    
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        settings.organizationSchema,
        settings.localBusinessSchema,
      ].filter(Boolean),
    };

    res.header("Content-Type", "application/ld+json");
    return res.json(schema);
  } catch (error) {
    console.error("Get schema error:", error);
    return res.status(500).json({ error: "Error generating schema" });
  }
};

// ============= PREVIEW =============

export const previewSeo = async (req, res) => {
  try {
    const settings = await SEO.getSettings();
    
    // Generate preview HTML
    const preview = {
      title: settings.siteTitle,
      description: settings.siteDescription,
      og: {
        title: settings.ogTitle || settings.siteTitle,
        description: settings.ogDescription || settings.siteDescription,
        image: settings.ogImage || settings.logo,
        type: settings.ogType,
      },
      twitter: {
        card: settings.twitterCard,
        title: settings.twitterTitle || settings.siteTitle,
        description: settings.twitterDescription || settings.siteDescription,
        image: settings.twitterImage || settings.ogImage || settings.logo,
        site: settings.twitterSite,
        creator: settings.twitterCreator,
      },
    };

    return res.status(200).json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error("Preview SEO error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate preview",
    });
  }
};