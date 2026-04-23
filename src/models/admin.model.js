// models/Admin.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema(
  {
    avatar: {
      type: String,
      default: "",
    },
    firstName: {
      type: String,
      default: "mozno",
    },
    lastName: {
      type: String,
      default: "Admin",
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "admin",
      enum: ["admin", "superadmin"],
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.lastPasswordChange = Date.now();
});

// Compare password method
adminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Get full name
adminSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Transform output
adminSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Admin", adminSchema);