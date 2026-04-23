import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    jobType: {
      type: String,
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
      trim: true,
    },
    requirements: {
      type: String,
      required: true,
      trim: true,
    },
    jobStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    postedBy: {
      type: String,
      default: "Admin",
    },
  },
  { timestamps: true },
);

const Jobs = mongoose.model("Jobs", jobSchema);

export default Jobs;
