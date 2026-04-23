import Job from '../models/job.model.js';

// @desc    Create a new job
// @route   POST /api/jobs
// @access  Private (Admin/Recruiter)
export const createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      createdBy: req.user?._id || null
    };

    const job = await Job.create(jobData);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create job'
    });
  }
};

// @desc    Get all jobs with filtering and pagination
// @route   GET /api/jobs
// @access  Public/Private
export const getAllJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      department,
      jobType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.jobStatus = status;
    if (department) filter.department = department;
    if (jobType) filter.jobType = jobType;
    
    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute queries
    const jobs = await Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch jobs'
    });
  }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public/Private
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch job'
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Admin/Recruiter)
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update job'
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Admin/Recruiter)
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete job'
    });
  }
};

// @desc    Change job status (open/closed)
// @route   PATCH /api/jobs/:id/status
// @access  Private (Admin/Recruiter)
export const changeJobStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'closed', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    job.jobStatus = status;
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job status changed to ${status}`,
      data: job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update job status'
    });
  }
};

// @desc    Get job statistics
// @route   GET /api/jobs/stats/overview
// @access  Private (Admin)
export const getJobStats = async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const openJobs = await Job.countDocuments({ jobStatus: 'open' });
    const closedJobs = await Job.countDocuments({ jobStatus: 'closed' });
    const draftJobs = await Job.countDocuments({ jobStatus: 'draft' });

    // Jobs by department
    const jobsByDepartment = await Job.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Jobs by type
    const jobsByType = await Job.aggregate([
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent jobs
    const recentJobs = await Job.find()
      .sort('-createdAt')
      .limit(5)
      .select('jobTitle department jobStatus createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totals: {
          total: totalJobs,
          open: openJobs,
          closed: closedJobs,
          draft: draftJobs
        },
        byDepartment: jobsByDepartment,
        byType: jobsByType,
        recent: recentJobs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch job statistics'
    });
  }
};