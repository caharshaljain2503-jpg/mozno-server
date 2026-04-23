import Analytics from "../models/analytics.model.js";

// Track page visit
export const trackVisit = async (req, res) => {
  try {
    const {
      visitorId,
      sessionId,
      page,
      referrer,
      device,
      browser,
      os
    } = req.body;

    // Get country from IP (simplified)
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    // Check if new user
    const existingUser = await Analytics.findOne({ visitorId });
    const isNewUser = !existingUser;

    const visit = await Analytics.create({
      visitorId,
      sessionId,
      page,
      referrer,
      device,
      browser,
      os,
      ip,
      country: req.body.country || 'Unknown',
      isNewUser
    });

    res.status(201).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update session duration
export const updateDuration = async (req, res) => {
  try {
    const { sessionId, duration } = req.body;

    await Analytics.updateMany(
      { sessionId },
      { duration }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await Analytics.getDashboardStats();
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get recent visits
export const getRecentVisits = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const visits = await Analytics.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('visitorId page createdAt device');

    res.json({ success: true, data: visits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get daily visits for chart
export const getDailyVisits = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const dailyVisits = await Analytics.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          visits: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: dailyVisits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};