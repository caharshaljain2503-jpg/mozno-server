// models/JobApplication.js
import mongoose, { Schema, model } from "mongoose";

const jobApplicantSchema = new Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { 
      type: String, 
      required: true, 
      trim: true 
    },
    resume: { 
      type: String, 
      required: true 
    },
    coverLetter: { 
      type: String, 
      default: "" 
    },
    status: {
      type: String,
      enum: ["new", "interviewed", "shortlisted", "rejected", "hired"],
      default: "new",
    },
    internalNote: { 
      type: String, 
      default: "" 
    },
  },
  { timestamps: true }
);


jobApplicantSchema.index({ jobId: 1, email: 1 }, { unique: true });

const JobApplication = model("JobApplication", jobApplicantSchema);
export default JobApplication;