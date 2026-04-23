import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: [
      'Wealth Management',
      'Financial Advisory',
      'Investment Banking',
      'Portfolio Management',
      'Private Banking',
      'Risk Management',
      'Tax Planning',
      'Estate Planning',
      'Retirement Planning',
      'Alternative Investments',
      'Research & Analysis',
      'Compliance & Legal'
    ]
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative']
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid', 'On-site'],
    default: 'Full-time'
  },
  jobDescription: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true
  },
  requirements: {
    type: String,
    required: [true, 'Requirements are required'],
    trim: true
  },
  jobStatus: {
    type: String,
    enum: ['open', 'closed', 'draft'],
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  applicationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for search functionality
jobSchema.index({ 
  jobTitle: 'text', 
  department: 'text', 
  location: 'text',
  jobDescription: 'text' 
});

const Job = mongoose.model('Job', jobSchema);

export default Job;