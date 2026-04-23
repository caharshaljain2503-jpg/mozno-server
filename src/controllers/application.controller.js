import JobApplication from "../models/career/applicant.model.js";
import imagekit from "../configs/imageKit.js";
import sendMail from "../utils/mailer.js";

export const applyJob = async (req, res) => {
  try {
    const { jobId, jobTitle, name, email, phone, coverLetter } = req.body;
    
    console.log(`Applicant: ${name} (${email}) applying for ${jobTitle}`);

    // ✅ Basic validation
    if (!jobId || !jobTitle || !name || !email || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: "All required fields are mandatory" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Resume file is required" 
      });
    }

    // ✅ Check if already applied (before uploading file)
    const alreadyApplied = await JobApplication.findOne({
      jobId,
      email: email.toLowerCase().trim()
    });

    if (alreadyApplied) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this position."
      });
    }

    // 1️⃣ Upload resume to ImageKit
    const uploadResult = await imagekit.upload({
      file: req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: "/resumes",
    });

    // 2️⃣ Save applicant to MongoDB
    const applicant = new JobApplication({
      jobId,
      jobTitle,
      name,
      email,
      phone,
      coverLetter: coverLetter || "",
      resume: uploadResult.url,
    });

    await applicant.save();

    // 3️⃣ Send confirmation email (non-blocking)
    sendMail({
      to: email,
      subject: "Thanks for applying at Krapto Technology 🚀",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { margin: 0; padding: 0; background-color: #f4f8f7; font-family: Arial, Helvetica, sans-serif; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #14b8a6, #0ea5a4); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
    .content { padding: 30px; color: #333333; }
    .content h3 { margin-top: 0; font-size: 20px; }
    .highlight { color: #14b8a6; font-weight: bold; }
    .info-box { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 15px; margin: 20px 0; border-radius: 6px; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { display: inline-block; background: #14b8a6; color: #ffffff; padding: 12px 28px; border-radius: 30px; font-size: 14px; font-weight: bold; text-decoration: none; }
    .footer { background: #f9fafb; text-align: center; padding: 15px; font-size: 12px; color: #777777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Krapto Technology</h1>
    </div>
    <div class="content">
      <h3>Hello ${name}, 👋</h3>
      <p>Thank you for applying at <span class="highlight">Krapto Technology</span>.</p>
      <div class="info-box">
        We have successfully received your application for <b>${jobTitle}</b>.
      </div>
      <p>Our expert team will review your resume and get back to you within <b>24–48 hours</b>.</p>
      <div class="cta">
        <a href="https://kraptotechnologies.com" target="_blank">
          Visit Krapto Technology 🚀
        </a>
      </div>
      <p>Best Regards,<br/><b>Krapto Technology Team</b></p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Krapto Technology. All rights reserved.
    </div>
  </div>
</body>
</html>
      `,
    }).catch(err => console.error("Email sending failed:", err.message));

    // 4️⃣ Send response to frontend
    res.status(201).json({
      success: true,
      message: "Application submitted successfully. A confirmation email has been sent.",
      data: applicant,
    });

  } catch (error) {
    console.error(error);
    
    // ✅ Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: "You have already applied for this position." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Something went wrong. Please try again." 
    });
  }
};


export const getAllApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      jobId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;

    // Text search (name, email, jobTitle)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { jobTitle: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Execute queries
    const applications = await JobApplication.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("jobId", "jobTitle department location jobStatus")
      .lean();

    const total = await JobApplication.countDocuments(filter);

    // Get statistics
    const stats = await JobApplication.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusCounts = {};
    stats.forEach((stat) => {
      statusCounts[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: applications,
      stats: statusCounts,
    });
  } catch (error) {
    console.error("Get all applications error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch applications",
    });
  }
};


export const getApplicationById = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id)
      .populate(
        "jobId",
        "jobTitle department location jobStatus jobDescription requirements",
      )
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error("Get application by id error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch application",
    });
  }
};


export const changeApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (
      !["new", "shortlisted", "interviewed", "rejected", "hired"].includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    application.status = status;
    await application.save();

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      data: application,
    });
  } catch (error) {
    console.error("Change application status error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update application status",
    });
  }
};


export const addInternalNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (!note?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note is required",
      });
    }

    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    application.internalNote = note.trim();
    await application.save();

    res.status(200).json({
      success: true,
      message: "Internal note added successfully",
      data: application,
    });
  } catch (error) {
    console.error("Add internal note error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add internal note",
    });
  }
};


export const deleteApplication = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    await application.deleteOne();

    res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    console.error("Delete application error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete application",
    });
  }
};


export const bulkDeleteApplications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Application IDs are required",
      });
    }

    const result = await JobApplication.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} applications deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete applications error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete applications",
    });
  }
};


export const downloadResume = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (!application.resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // Redirect to the resume URL
    res.redirect(application.resume);
  } catch (error) {
    console.error("Download resume error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to download resume",
    });
  }
};


export const getApplicationStats = async (req, res) => {
  try {
    // Total applications by status
    const statusStats = await JobApplication.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Applications by job
    const jobStats = await JobApplication.aggregate([
      { $group: { _id: "$jobTitle", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Daily applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await JobApplication.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Recent applications
    const recentApplications = await JobApplication.find()
      .sort("-createdAt")
      .limit(5)
      .select("name jobTitle status createdAt")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusStats,
        byJob: jobStats,
        daily: dailyStats,
        recent: recentApplications,
        total: await JobApplication.countDocuments(),
      },
    });
  } catch (error) {
    console.error("Get application stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch application statistics",
    });
  }
};


export const exportApplicationsCSV = async (req, res) => {
  try {
    const { status, jobId, fromDate, toDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (jobId) filter.jobId = jobId;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const applications = await JobApplication.find(filter)
      .populate("jobId", "jobTitle department")
      .sort("-createdAt")
      .lean();

    // Define CSV headers
    const headers = [
      "Application ID",
      "Applicant Name",
      "Email",
      "Phone",
      "Job Title",
      "Department",
      "Applied Date",
      "Status",
      "Resume URL",
      "Cover Letter",
      "Internal Note",
    ];

    // Convert to CSV rows
    const csvRows = applications.map((app) =>
      [
        app._id.toString(),
        `"${app.name.replace(/"/g, '""')}"`,
        `"${app.email}"`,
        `"${app.phone || ""}"`,
        `"${app.jobTitle.replace(/"/g, '""')}"`,
        `"${app.jobId?.department || ""}"`,
        new Date(app.createdAt).toISOString().split("T")[0],
        app.status,
        app.resume || "",
        `"${app.coverLetter?.replace(/"/g, '""') || ""}"`,
        `"${app.internalNote?.replace(/"/g, '""') || ""}"`,
      ].join(","),
    );

    const csvContent = [headers.join(","), ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=applications-${new Date().toISOString().split("T")[0]}.csv`,
    );

    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Export applications error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to export applications",
    });
  }
};
