// controllers/dashboard.controller.js
import Admin from "../models/admin.model.js";
import Analytics from "../models/analytics.model.js";
import JobApplication from "../models/career/applicant.model.js";
import Blog from "../models/blog.model.js";
import Comment from "../models/comment.model.js";
import Contact from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Testimonial from "../models/testimonial.model.js";

// Helper function to safely extract Promise.allSettled results
const extractValue = (result, defaultValue = 0) => {
  if (result?.status === "fulfilled") {
    const value = result.value;
    if (typeof value === "number") return value;
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && "count" in value) return value.count;
    return value ?? defaultValue;
  }
  console.warn("Promise rejected:", result?.reason?.message || result?.reason);
  return defaultValue;
};

const extractArray = (result, defaultValue = []) => {
  if (result?.status === "fulfilled") {
    const value = result.value;
    if (Array.isArray(value)) return value;
    return defaultValue;
  }
  console.warn("Promise rejected:", result?.reason?.message || result?.reason);
  return defaultValue;
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0m 0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

const calculateGrowth = (current, previous) => {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const { timeRange = "month" } = req.query;

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate = new Date(today);
    let previousStartDate = new Date(today);
    let previousEndDate = new Date(today);

    switch (timeRange) {
      case "day":
        startDate = new Date(today);
        previousStartDate = new Date(today);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(today);
        break;
      case "week":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        break;
      case "year":
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate = new Date(startDate);
        break;
      case "month":
      default:
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        previousEndDate = new Date(startDate);
        break;
    }

    // Build all queries
    const queries = [
      // Analytics (0-10)
      Analytics.countDocuments().catch(() => 0),
      Analytics.countDocuments({ createdAt: { $gte: startDate, $lte: now } }).catch(() => 0),
      Analytics.countDocuments({ createdAt: { $gte: previousStartDate, $lt: previousEndDate } }).catch(() => 0),
      Analytics.countDocuments({ createdAt: { $gte: today } }).catch(() => 0),
      Analytics.distinct("visitorId").catch(() => []),
      Analytics.aggregate([
        { $match: { device: { $exists: true, $ne: null } } },
        { $group: { _id: "$device", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
      Analytics.aggregate([
        { $match: { country: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).catch(() => []),
      Analytics.aggregate([
        { $match: { page: { $exists: true, $ne: null } } },
        { $group: { _id: "$page", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).catch(() => []),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            visits: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
          },
        },
        {
          $project: {
            _id: 1,
            visits: 1,
            uniqueVisitors: { $size: "$uniqueVisitors" },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
      Analytics.aggregate([
        { $match: { duration: { $exists: true, $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: "$duration" },
            totalSessions: { $addToSet: "$sessionId" },
          },
        },
      ]).catch(() => []),
      Analytics.aggregate([
        { $group: { _id: "$sessionId", pageCount: { $sum: 1 } } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            bouncedSessions: { $sum: { $cond: [{ $eq: ["$pageCount", 1] }, 1, 0] } },
          },
        },
      ]).catch(() => []),

      // Blogs (11-15)
      Blog.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0),
      Blog.countDocuments({ isPublished: true, isDeleted: { $ne: true } }).catch(() => 0),
      Blog.countDocuments({ isPublished: false, isDeleted: { $ne: true } }).catch(() => 0),
      Blog.countDocuments({ createdAt: { $gte: startDate }, isDeleted: { $ne: true } }).catch(() => 0),
      Blog.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title slug subTitle isPublished createdAt image category")
        .lean()
        .catch(() => []),

      // Contacts (16-21)
      Contact.countDocuments().catch(() => 0),
      Contact.countDocuments({ createdAt: { $gte: startDate, $lte: now } }).catch(() => 0),
      Contact.countDocuments({ createdAt: { $gte: previousStartDate, $lt: previousEndDate } }).catch(() => 0),
      Contact.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("fullName email phone service status createdAt company")
        .lean()
        .catch(() => []),
      Contact.aggregate([
        { $group: { _id: { $ifNull: ["$status", "new"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
      Contact.aggregate([
        { $group: { _id: { $ifNull: ["$service", "General"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).catch(() => []),

      // Comments (22-24)
      Comment.countDocuments().catch(() => 0),
      Comment.countDocuments({ status: "pending" }).catch(() => 0),
      Comment.countDocuments({ status: "approved" }).catch(() => 0),

      // Testimonials (25-28)
      Testimonial.countDocuments().catch(() => 0),
      Testimonial.countDocuments({ status: "published" }).catch(() => 0),
      Testimonial.countDocuments({ featured: true }).catch(() => 0),
      Testimonial.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, totalRatings: { $sum: 1 } } },
      ]).catch(() => []),

      // Applications (29-32)
      JobApplication.countDocuments().catch(() => 0),
      JobApplication.countDocuments({ status: "new" }).catch(() => 0),
      JobApplication.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email jobTitle status createdAt")
        .lean()
        .catch(() => []),
      JobApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).catch(() => []),

      // Notifications (33-35)
      Notification.countDocuments({ read: false }).catch(() => 0),
      Notification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title message type category read createdAt action")
        .lean()
        .catch(() => []),
      Notification.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]).catch(() => []),

      // Admins (36-38)
      Admin.countDocuments().catch(() => 0),
      Admin.countDocuments({ status: "active" }).catch(() => 0),
      Admin.find({ lastLogin: { $ne: null } })
        .sort({ lastLogin: -1 })
        .limit(5)
        .select("firstName lastName email lastLogin role status avatar")
        .lean()
        .catch(() => []),
    ];

    const results = await Promise.allSettled(queries);

    // Extract all values
    const totalVisits = extractValue(results[0], 0);
    const currentPeriodVisits = extractValue(results[1], 0);
    const previousPeriodVisits = extractValue(results[2], 0);
    const todayVisits = extractValue(results[3], 0);
    const uniqueVisitorsArray = extractArray(results[4], []);
    const deviceStatsRaw = extractArray(results[5], []);
    const topCountriesRaw = extractArray(results[6], []);
    const topPagesRaw = extractArray(results[7], []);
    const dailyVisitsRaw = extractArray(results[8], []);
    const sessionStatsRaw = extractArray(results[9], []);
    const bounceDataRaw = extractArray(results[10], []);

    const totalBlogs = extractValue(results[11], 0);
    const publishedBlogs = extractValue(results[12], 0);
    const draftBlogs = extractValue(results[13], 0);
    const currentPeriodBlogs = extractValue(results[14], 0);
    const recentBlogsRaw = extractArray(results[15], []);

    const totalContacts = extractValue(results[16], 0);
    const currentPeriodContacts = extractValue(results[17], 0);
    const previousPeriodContacts = extractValue(results[18], 0);
    const recentContactsRaw = extractArray(results[19], []);
    const contactsByStatusRaw = extractArray(results[20], []);
    const leadsByServiceRaw = extractArray(results[21], []);

    const totalComments = extractValue(results[22], 0);
    const pendingComments = extractValue(results[23], 0);
    const approvedComments = extractValue(results[24], 0);

    const totalTestimonials = extractValue(results[25], 0);
    const publishedTestimonials = extractValue(results[26], 0);
    const featuredTestimonials = extractValue(results[27], 0);
    const avgRatingRaw = extractArray(results[28], []);

    const totalApplications = extractValue(results[29], 0);
    const newApplications = extractValue(results[30], 0);
    const recentApplicationsRaw = extractArray(results[31], []);
    const applicationsByStatusRaw = extractArray(results[32], []);

    const unreadNotifications = extractValue(results[33], 0);
    const recentNotificationsRaw = extractArray(results[34], []);
    const notificationsByTypeRaw = extractArray(results[35], []);

    const totalAdmins = extractValue(results[36], 0);
    const activeAdmins = extractValue(results[37], 0);
    const recentLoginsRaw = extractArray(results[38], []);

    // Calculate derived values
    const uniqueUsers = Array.isArray(uniqueVisitorsArray) ? uniqueVisitorsArray.length : 0;
    const visitsGrowth = calculateGrowth(currentPeriodVisits, previousPeriodVisits);
    const leadsGrowth = calculateGrowth(currentPeriodContacts, previousPeriodContacts);

    const avgDuration = sessionStatsRaw[0]?.avgDuration || 0;
    const totalSessions = sessionStatsRaw[0]?.totalSessions?.length || Math.max(totalVisits, 1);
    const pagesPerSession = totalVisits > 0 ? (totalVisits / totalSessions).toFixed(1) : "0";

    const bounceRate =
      bounceDataRaw[0]?.totalSessions > 0
        ? ((bounceDataRaw[0].bouncedSessions / bounceDataRaw[0].totalSessions) * 100).toFixed(1)
        : "0";

    const conversionRate = totalVisits > 0 ? ((totalContacts / totalVisits) * 100).toFixed(2) : "0";
    const avgRating = avgRatingRaw[0]?.avgRating?.toFixed(1) || "0";

    // Format all data
    const deviceDistribution = deviceStatsRaw.map((device) => ({
      device: device._id || "unknown",
      visits: device.count || 0,
      percentage: totalVisits > 0 ? Number(((device.count / totalVisits) * 100).toFixed(1)) : 0,
    }));

    const topCountries = topCountriesRaw.map((country) => ({
      country: country._id || "Unknown",
      visits: country.count || 0,
    }));

    const topPages = topPagesRaw.map((page, index) => ({
      page: page._id || "/",
      visits: page.count || 0,
      rank: index + 1,
    }));

    const dailyVisits = dailyVisitsRaw.map((item) => ({
      date: item._id,
      day: new Date(item._id).toLocaleDateString("en-US", { weekday: "short" }),
      visits: item.visits || 0,
      uniqueVisitors: item.uniqueVisitors || 0,
    }));

    const contactsByStatus = contactsByStatusRaw.map((item) => ({
      status: item._id || "new",
      count: item.count || 0,
    }));

    const leadsByService = leadsByServiceRaw.map((item) => ({
      service: item._id || "General",
      count: item.count || 0,
    }));

    const recentBlogs = recentBlogsRaw.map((blog) => ({
      id: blog._id,
      title: blog.title || "Untitled",
      subtitle: blog.subTitle || "",
      slug: blog.slug || "",
      status: blog.isPublished ? "published" : "draft",
      category: blog.category || "Uncategorized",
      image: blog.image || null,
      date: blog.createdAt,
    }));

    const recentLeads = recentContactsRaw.map((contact) => ({
      id: contact._id,
      name: contact.fullName || "Anonymous",
      email: contact.email || "",
      phone: contact.phone || "",
      service: contact.service || "General",
      company: contact.company || "",
      status: contact.status || "new",
      date: contact.createdAt,
    }));

    const recentApplications = recentApplicationsRaw.map((app) => ({
      id: app._id,
      name: app.name || "Unknown",
      email: app.email || "",
      position: app.jobTitle || "Not specified",
      status: app.status || "new",
      date: app.createdAt,
    }));

    const applicationsByStatus = applicationsByStatusRaw.map((item) => ({
      status: item._id || "new",
      count: item.count || 0,
    }));

    const recentNotifications = recentNotificationsRaw.map((n) => ({
      id: n._id,
      title: n.title || "",
      message: n.message || "",
      type: n.type || "info",
      category: n.category || "system",
      read: n.read || false,
      action: n.action || null,
      date: n.createdAt,
    }));

    const notificationsByType = notificationsByTypeRaw.map((item) => ({
      type: item._id || "info",
      count: item.count || 0,
    }));

    const recentAdminLogins = recentLoginsRaw.map((admin) => ({
      id: admin._id,
      name: `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Admin",
      email: admin.email || "",
      role: admin.role || "admin",
      status: admin.status || "active",
      avatar: admin.avatar || null,
      lastLogin: admin.lastLogin,
    }));

    // Build response
    const dashboardData = {
      stats: {
        totalVisits,
        todayVisits,
        uniqueUsers,
        visitsGrowth,
        totalLeads: totalContacts,
        leadsGrowth,
        newLeadsToday: currentPeriodContacts,
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        totalTestimonials,
        publishedTestimonials,
        featuredTestimonials,
        avgRating,
        totalComments,
        pendingComments,
        approvedComments,
        totalApplications,
        newApplications,
        unreadNotifications,
        totalAdmins,
        activeAdmins,
      },
      performance: {
        avgSessionDuration: formatDuration(avgDuration),
        bounceRate: `${bounceRate}%`,
        pagesPerSession,
        conversionRate: `${conversionRate}%`,
      },
      charts: {
        dailyVisits,
        deviceDistribution,
        topPages,
        topCountries,
        contactsByStatus,
        leadsByService,
        applicationsByStatus,
        notificationsByType,
      },
      recent: {
        leads: recentLeads,
        blogs: recentBlogs,
        applications: recentApplications,
        notifications: recentNotifications,
        adminLogins: recentAdminLogins,
      },
      summary: {
        month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        totalTraffic: totalVisits,
        newLeads: currentPeriodContacts,
        newBlogs: currentPeriodBlogs,
        avgRating,
        goalCompletion: Math.min(
          Math.round((currentPeriodContacts / Math.max(totalContacts * 0.1, 1)) * 100),
          100
        ),
      },
      meta: {
        timeRange,
        startDate,
        endDate: now,
        generatedAt: new Date(),
      },
    };

    return res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get quick stats
// @route   GET /api/admin/dashboard/quick-stats
export const getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayVisits,
      todayLeads,
      newLeads,
      unreadNotifications,
      pendingComments,
      newApplications,
      draftBlogs,
    ] = await Promise.all([
      Analytics.countDocuments({ createdAt: { $gte: today } }).catch(() => 0),
      Contact.countDocuments({ createdAt: { $gte: today } }).catch(() => 0),
      Contact.countDocuments({ status: "new" }).catch(() => 0),
      Notification.countDocuments({ read: false }).catch(() => 0),
      Comment.countDocuments({ status: "pending" }).catch(() => 0),
      JobApplication.countDocuments({ status: "new" }).catch(() => 0),
      Blog.countDocuments({ isPublished: false, isDeleted: { $ne: true } }).catch(() => 0),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        todayVisits,
        todayLeads,
        newLeads,
        unreadNotifications,
        pendingComments,
        newApplications,
        draftBlogs,
      },
    });
  } catch (error) {
    console.error("Quick Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quick stats",
    });
  }
};

// @desc    Get analytics overview
// @route   GET /api/admin/dashboard/analytics
export const getAnalyticsOverview = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [dailyVisits, hourlyDistribution, topReferrers] = await Promise.all([
      Analytics.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            visits: { $sum: 1 },
            uniqueVisitors: { $addToSet: "$visitorId" },
          },
        },
        {
          $project: {
            _id: 1,
            visits: 1,
            uniqueVisitors: { $size: "$uniqueVisitors" },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
      Analytics.aggregate([
        { $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
        { $group: { _id: { $hour: "$createdAt" }, visits: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
      Analytics.aggregate([
        {
          $match: {
            referrer: { $exists: true, $ne: null, $ne: "" },
            createdAt: { $gte: startDate },
          },
        },
        { $group: { _id: "$referrer", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).catch(() => []),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        dailyVisits: dailyVisits.map((item) => ({
          date: item._id,
          visits: item.visits,
          uniqueVisitors: item.uniqueVisitors,
        })),
        hourlyDistribution: hourlyDistribution.map((item) => ({
          hour: item._id,
          visits: item.visits,
        })),
        topReferrers: topReferrers.map((item) => ({
          referrer: item._id,
          visits: item.count,
        })),
      },
    });
  } catch (error) {
    console.error("Analytics Overview Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics overview",
    });
  }
};