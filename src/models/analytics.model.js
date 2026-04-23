// models/Analytics.js
import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  page: {
    type: String,
    required: true
  },
  referrer: String,
  device: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet'],
    default: 'desktop'
  },
  browser: String,
  os: String,
  country: String,
  city: String,
  ip: String,
  duration: {
    type: Number,
    default: 0
  },
  isNewUser: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ page: 1 });
analyticsSchema.index({ device: 1 });
analyticsSchema.index({ country: 1 });

// Get dashboard stats
analyticsSchema.statics.getDashboardStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalVisits,
    todayVisits,
    uniqueUsers,
    deviceStats,
    topCountries,
    topPages
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ createdAt: { $gte: today } }),
    this.distinct('visitorId').then(ids => ids.length),
    this.aggregate([
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  // Calculate averages
  const avgStats = await this.aggregate([
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
        totalSessions: { $addToSet: '$sessionId' }
      }
    }
  ]);

  const avgDuration = avgStats[0]?.avgDuration || 0;
  const totalSessions = avgStats[0]?.totalSessions?.length || 1;
  const pagesPerSession = totalVisits / totalSessions;

  // Bounce rate (sessions with only 1 page view)
  const bounceData = await this.aggregate([
    { $group: { _id: '$sessionId', pageCount: { $sum: 1 } } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      bounced: { $sum: { $cond: [{ $eq: ['$pageCount', 1] }, 1, 0] } }
    }}
  ]);

  const bounceRate = bounceData[0] 
    ? ((bounceData[0].bounced / bounceData[0].total) * 100).toFixed(1)
    : 0;

  // New users percentage
  const newUsersCount = await this.countDocuments({ isNewUser: true });
  const newUsersPercentage = ((newUsersCount / totalVisits) * 100).toFixed(0);

  return {
    totalVisits,
    todayVisits,
    uniqueUsers,
    avgSessionDuration: formatDuration(avgDuration),
    bounceRate: `${bounceRate}%`,
    pagesPerSession: pagesPerSession.toFixed(1),
    newUsersPercentage: `${newUsersPercentage}%`,
    deviceStats,
    topCountries,
    topPages,
    lastUpdated: new Date()
  };
};

// Helper to format duration
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

export default mongoose.model('Analytics', analyticsSchema);

