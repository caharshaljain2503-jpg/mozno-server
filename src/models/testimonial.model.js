// models/testimonial.model.js
import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    designation: {
      type: String,
      trim: true,
      maxlength: [100, "Designation cannot exceed 100 characters"],
      default: "",
    },

    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
      default: "",
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      default: 5,
    },

    content: {
      type: String,
      required: [true, "Testimonial content is required"],
      trim: true,
      minlength: [10, "Content must be at least 10 characters"],
      maxlength: [2000, "Content cannot exceed 2000 characters"],
    },

    avatar: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["published", "draft"],
      default: "draft",
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    approved: {
      type: Boolean,
      default: false,
      index: true,
    },

    likes: {
      type: Number,
      default: 0,
      min: 0,
    },

    comments: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional metadata
    source: {
      type: String,
      enum: ["manual", "google", "facebook", "website", "email"],
      default: "manual",
    },

    order: {
      type: Number,
      default: 0,
    },

    // For tracking who added/modified
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for common queries
testimonialSchema.index({ status: 1, featured: -1, createdAt: -1 });
testimonialSchema.index({ approved: 1, status: 1 });
testimonialSchema.index({ name: "text", company: "text", content: "text" });

// Virtual for formatted date
testimonialSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
});

// Ensure virtuals are included in JSON output
testimonialSchema.set("toJSON", { virtuals: true });
testimonialSchema.set("toObject", { virtuals: true });

const Testimonial = mongoose.model("Testimonial", testimonialSchema);

export default Testimonial;
