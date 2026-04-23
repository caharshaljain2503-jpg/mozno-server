import mongoose from "mongoose";
import FAQ from "../models/faq.model.js";
import SiteContent from "../models/sitecontent.model.js";

const extractYouTubeVideoId = (url) => {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1];
    return "";
  } catch {
    return "";
  }
};

const extractChannelIdFromHtml = (html) => {
  if (!html) return "";
  const match = html.match(/"channelId":"(UC[^"]+)"/);
  return match?.[1] || "";
};

const resolveYouTubeChannelId = async (channelUrl) => {
  if (!channelUrl) return "";
  try {
    const direct = channelUrl.match(/channel\/(UC[\w-]+)/);
    if (direct?.[1]) return direct[1];
    const response = await fetch(channelUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) return "";
    const html = await response.text();
    return extractChannelIdFromHtml(html);
  } catch {
    return "";
  }
};

const fetchLatestYouTubeVideos = async (channelUrl, limit = 8) => {
  try {
    const channelId = await resolveYouTubeChannelId(channelUrl);
    if (!channelId) return [];
    const rssResponse = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!rssResponse.ok) return [];
    const xml = await rssResponse.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, limit);
    return entries
      .map((entry, index) => {
        const raw = entry[1];
        const title = raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] || `Video ${index + 1}`;
        const videoId = raw.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1] || "";
        const link = raw.match(/<link rel="alternate" href="([^"]+)"/)?.[1] || "";
        const id = videoId || extractYouTubeVideoId(link);
        if (!id) return null;
        return { title, videoId: id, url: link, views: "" };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

const parseAnswerToArray = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "string" ? x.trim() : String(x)))
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    // Multiline text support (admin textarea -> paragraphs)
    return raw
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
};

const filterEnabledSocialPosts = (posts) => {
  if (!Array.isArray(posts)) return [];
  return posts.filter((p) => p && p.enabled !== false);
};

export const getPublicSettings = async (req, res) => {
  try {
    const [faqs, siteContent] = await Promise.all([
      FAQ.find({ status: "published" }).sort({ order: 1, createdAt: -1 }).lean(),
      SiteContent.findOne().lean(),
    ]);

    let socialMedia = { ...(siteContent?.socialMedia || {}) };
    if (socialMedia?.links?.youtube?.enabled && socialMedia?.links?.youtube?.url) {
      const hasManualVideos = Array.isArray(socialMedia.youtubeVideos) && socialMedia.youtubeVideos.length > 0;
      if (!hasManualVideos) {
        const autoVideos = await fetchLatestYouTubeVideos(socialMedia.links.youtube.url);
        if (autoVideos.length > 0) {
          socialMedia = { ...socialMedia, youtubeVideos: autoVideos };
        }
      }
    }

    socialMedia = {
      ...socialMedia,
      youtubeVideos: filterEnabledSocialPosts(socialMedia.youtubeVideos),
      linkedinPosts: filterEnabledSocialPosts(socialMedia.linkedinPosts),
      instagramPosts: filterEnabledSocialPosts(socialMedia.instagramPosts),
      twitterPosts: filterEnabledSocialPosts(socialMedia.twitterPosts),
      facebookPosts: filterEnabledSocialPosts(socialMedia.facebookPosts),
      redditPosts: filterEnabledSocialPosts(socialMedia.redditPosts),
    };

    return res.status(200).json({
      faqs: faqs.map((f) => ({ q: f.q, a: f.a || [] })),
      socialMedia,
      siteContent: siteContent?.published ? siteContent : null,
    });
  } catch (error) {
    console.error("getPublicSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public settings",
    });
  }
};

// ================= ADMIN: LIST =================
export const getAllFaqsAdmin = async (req, res) => {
  try {
    const faqs = await FAQ.find({})
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      faqs,
    });
  } catch (error) {
    console.error("getAllFaqsAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
    });
  }
};

// ================= ADMIN: CREATE =================
export const createFaq = async (req, res) => {
  try {
    const { q, a, question, answer, status = "draft", order = 0 } = req.body;

    const faqQ = (q || question || "").trim();
    if (!faqQ) {
      return res.status(400).json({
        success: false,
        message: "Question (q) is required",
      });
    }

    const answerArr = parseAnswerToArray(a ?? answer);

    const faq = await FAQ.create({
      q: faqQ,
      a: answerArr,
      status: ["published", "draft"].includes(status) ? status : "draft",
      order: typeof order === "number" ? order : parseInt(order, 10) || 0,
    });

    return res.status(201).json({
      success: true,
      faq,
    });
  } catch (error) {
    console.error("createFaq error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create FAQ",
    });
  }
};

// ================= ADMIN: UPDATE =================
export const updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ id",
      });
    }

    const {
      q,
      a,
      question,
      answer,
      status,
      order,
    } = req.body;

    const faqQ = q ?? question;
    const nextQuestion = typeof faqQ === "string" ? faqQ.trim() : undefined;

    const nextAnswer = a ?? answer;
    const nextAnswerArr = nextAnswer !== undefined ? parseAnswerToArray(nextAnswer) : undefined;

    const update = {};
    if (nextQuestion) update.q = nextQuestion;
    if (nextAnswerArr !== undefined) update.a = nextAnswerArr;
    if (status && ["published", "draft"].includes(status)) update.status = status;
    if (order !== undefined) {
      update.order = typeof order === "number" ? order : parseInt(order, 10) || 0;
    }

    const updated = await FAQ.findByIdAndUpdate(id, update, { new: true }).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      faq: updated,
    });
  } catch (error) {
    console.error("updateFaq error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
    });
  }
};

// ================= ADMIN: DELETE =================
export const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ id",
      });
    }

    const deleted = await FAQ.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted",
    });
  } catch (error) {
    console.error("deleteFaq error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
    });
  }
};

// ================= ADMIN: TOGGLE STATUS =================
export const toggleFaqStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ id",
      });
    }

    const existing = await FAQ.findById(id).lean();
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    const nextStatus = existing.status === "published" ? "draft" : "published";

    const updated = await FAQ.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true }
    ).lean();

    return res.status(200).json({
      success: true,
      faq: updated,
    });
  } catch (error) {
    console.error("toggleFaqStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle FAQ status",
    });
  }
};

