import Jobs from "../models/job.model.js";
import mongoose from "mongoose";

export const getAllJobs = async (req, res) => {
  try {
    console.log("all jobs posts requests");
    const posts = await Jobs.find({ jobStatus: "open" });
    console.log(posts)
    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Get All Jobs Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching jobs",
    });
  }
};

export const getJobbyId = async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log("job posts request by ID", jobId);
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Job ID",
      });
    }

    const job = await Jobs.findOne({
      _id: jobId,
      jobStatus: "open",
    }).select("-__v");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found or no longer available",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Get Job By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching job",
    });
  }
};
