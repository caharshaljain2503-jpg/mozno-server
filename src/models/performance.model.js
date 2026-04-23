import { mongoose } from "mongoose";

const visitSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  page: {
    type: String,
    default: '/'
  },
  
  ip: {
    type: String,
    index: true
  },
  
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: String,
    timezone: String,
    postal: String
  },
  
  deviceInfo: {
    userAgent: String,
    browser: String,
    os: String,
    device: String,
    referer: String,
    screenResolution: String
  },
  
  sessionId: String,
  
  timeSpent: Number, 
  interactions: Number,
  
}, {
  timestamps: true
});

visitSchema.index({ userId: 1, timestamp: -1 });
visitSchema.index({ 'location.country': 1 });
visitSchema.index({ timestamp: -1, page: 1 });


export const Visit = mongoose.model("Visit",visitSchema)