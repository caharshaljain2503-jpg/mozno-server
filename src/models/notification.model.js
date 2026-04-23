import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Core fields
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    
    // Notification type and category
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
      index: true,
    },
    category: {
      type: String,
      enum: ["api", "system", "user", "security", "blog", "lead", "admin"],
      default: "system",
      index: true,
    },
    
    // Status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Optional action button
    action: {
      label: {
        type: String,
        trim: true,
        maxlength: 50,
      },
      url: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },
    
    // Metadata
    icon: {
      type: String,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
    
    // For system/bulk notifications
    isGlobal: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for faster queries
notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ category: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Auto-delete expired notifications
notificationSchema.pre("save", function(next) {
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.remove();
  }
  next();
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;