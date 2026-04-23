import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      trim: true,
      default: null,
    },

    service: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Admin workflow
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true,
    },

    // Email queue tracking
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },

    // Optional metadata
    ipAddress: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/* -------------------- Indexes -------------------- */

// Fast admin filtering
contactSchema.index({ status: 1, createdAt: -1 });

// Soft dedupe (NOT unique)
contactSchema.index(
  { email: 1, service: 1, createdAt: -1 },
  { name: "email_service_idx" },
);

const User = mongoose.model("Contact", contactSchema);

export default User;
