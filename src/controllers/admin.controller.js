import crypto from "crypto";
import mongoose from "mongoose";
import Admin from "../models/admin.model.js";
import sendMail from "../utils/mailer.js";
import jwt from "jsonwebtoken";
import redis from "../configs/redis.js";

// ==================== AUTH CONTROLLERS ====================
const SEEDED_ADMIN_EMAILS = ["admin@mozno.in", "admin@monzo.in"];
const SEEDED_ADMIN_PASSWORD = "Kraptoadmin12345";

const isSeededAdminEmail = (email) =>
  SEEDED_ADMIN_EMAILS.includes((email || "").toLowerCase());

async function findAdminByLoginEmail(normalizedEmail) {
  let admin = await Admin.findOne({ email: normalizedEmail });
  if (admin) return admin;
  if (!isSeededAdminEmail(normalizedEmail)) return null;
  const alternate = SEEDED_ADMIN_EMAILS.find((e) => e !== normalizedEmail);
  return alternate ? Admin.findOne({ email: alternate }) : null;
}

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Request for login:", email);
    const normalizedEmail = email?.toLowerCase();
    const seededAdmin = isSeededAdminEmail(normalizedEmail);
    const isSeededAdminLogin =
      seededAdmin && password === SEEDED_ADMIN_PASSWORD;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please try again in a moment.",
      });
    }

    let admin = await findAdminByLoginEmail(normalizedEmail);
    if (!admin) {
      if (isSeededAdminLogin) {
        admin = await Admin.create({
          email: normalizedEmail,
          password: SEEDED_ADMIN_PASSWORD,
          role: "superadmin",
          status: "active",
          firstName: "Mozno",
          lastName: "Admin",
        });

        const token = jwt.sign(
          { id: admin._id, role: admin.role },
          process.env.SECRET_KEY,
          { expiresIn: "24h" },
        );

        return res.status(200).json({
          success: true,
          token,
          requiresOtp: false,
          data: {
            id: admin._id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            role: admin.role,
          },
        });
      }

      if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
        // Dev bootstrap: if admin doesn't exist, create it from provided credentials.
        // This is useful when local DB isn't seeded but you still want to work.
        const newAdmin = await Admin.create({
          email: email.toLowerCase(),
          password,
          role: "admin",
          status: "active",
          firstName: "Admin",
          lastName: "User",
        });

        const token = jwt.sign(
          { id: newAdmin._id, role: newAdmin.role },
          process.env.SECRET_KEY,
          { expiresIn: "24h" },
        );

        return res.status(200).json({
          success: true,
          token,
          requiresOtp: true,
          data: {
            id: newAdmin._id,
            firstName: newAdmin.firstName,
            lastName: newAdmin.lastName,
            email: newAdmin.email,
            role: newAdmin.role,
          },
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (admin.status === "inactive") {
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact administrator.",
      });
    }

    let isMatch = false;
    if (admin.password) {
      isMatch = await admin.comparePassword(password);
    }

    if (seededAdmin && password === SEEDED_ADMIN_PASSWORD && !isMatch) {
      admin.password = SEEDED_ADMIN_PASSWORD;
      await admin.save();
      isMatch = true;
    }

    if (!isMatch) {
      if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
        const token = jwt.sign(
          { id: admin._id, role: admin.role },
          process.env.SECRET_KEY,
          { expiresIn: "24h" },
        );
        return res.status(200).json({
          success: true,
          data: {
            token,
            id: admin._id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            role: admin.role,
          },
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.SECRET_KEY,
      { expiresIn: "24h" },
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    return res.status(200).json({
      success: true,
      token,
      requiresOtp: !seededAdmin,
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("OTP request:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email Id",
      });
    }

    if (isSeededAdminEmail(normalizedEmail)) {
      return res.status(200).json({
        success: true,
        otpSkipped: true,
        message: "OTP bypassed for seeded admin",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    // Store in Redis with expiration (5 minutes = 300 seconds)
    await redis.set(`admin_otp:${normalizedEmail}`, hashedOtp, "EX", 300);

    // Send the OTP via email
    await sendMail({
      to: email,
      subject: "Your 2FA Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Two-Factor Authentication</h2>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #000; letter-spacing: 10px; font-size: 32px;">${otp}</h1>
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Security Team</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase();
    const seededAdmin = isSeededAdminEmail(normalizedEmail);

    if (seededAdmin) {
      const admin = await findAdminByLoginEmail(normalizedEmail);
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid Email Id",
        });
      }

      const token = jwt.sign(
        { id: admin._id, role: admin.role },
        process.env.SECRET_KEY,
        { expiresIn: "24h" },
      );

      admin.lastLogin = new Date();
      await admin.save();

      return res.status(200).json({
        success: true,
        token,
        data: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          role: admin.role,
        },
      });
    }

    const cachedOtp = await redis.get(`admin_otp:${normalizedEmail}`);
    if (!cachedOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request again.",
      });
    }

    const hashedInput = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedInput !== cachedOtp) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // OTP is valid, generate JWT
    const admin = await Admin.findOne({ email: normalizedEmail });
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.SECRET_KEY,
      { expiresIn: "24h" },
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Delete OTP from Redis
    await redis.del(`admin_otp:${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      token,
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

// ==================== PROFILE CONTROLLERS ====================

export const getAdminDetails = async (req, res) => {
  try {
    // Note: authMiddleware sets req.user (not req.admin)
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Get admin details error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== ADMIN CRUD CONTROLLERS ====================

// @desc    Get all admins
// @route   GET /api/admin/users
export const getAllAdmins = async (req, res) => {
  try {
    const { search, status, role, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (role && role !== "all") {
      filter.role = role;
    }

    const admins = await Admin.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Admin.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: admins.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: admins,
    });
  } catch (error) {
    console.error("Get all admins error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single admin
// @route   GET /api/admin/users/:id
export const getAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Get admin error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create admin
// @route   POST /api/admin/users
export const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    console.log("Create admin request:", { firstName, lastName, email, role });

    // Validate required fields
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({
        success: false,
        message: "First name is required",
        field: "firstName",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        field: "email",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
        field: "password",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        field: "email",
      });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
        field: "email",
      });
    }

    // Create admin
    const admin = await Admin.create({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || "",
      password,
      role: role || "admin",
      status: "active",
    });

    // Send welcome email with credentials
    try {
      await sendMail({
        to: email,
        subject: "Your Admin Account Has Been Created",
        html: `
          <h2>Welcome to Admin Panel</h2>
          <p>Your admin account has been created. Here are your login credentials:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p>Please change your password after first login.</p>
          <p><a href="${process.env.ADMIN_URL || "http://localhost:5173"}/login">Login Here</a></p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the request if email fails
    }

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: adminResponse,
    });
  } catch (error) {
    console.error("Create admin error:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
        field: "email",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create admin",
    });
  }
};

// @desc    Update admin
// @route   PUT /api/admin/users/:id
export const updateAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, status } = req.body;

    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check if email is being changed and already exists
    if (email && email.toLowerCase() !== admin.email) {
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
          field: "email",
        });
      }
    }

    // Update fields
    if (firstName) admin.firstName = firstName.trim();
    if (lastName !== undefined) admin.lastName = lastName.trim();
    if (email) admin.email = email.toLowerCase().trim();
    if (phone !== undefined) admin.phone = phone.trim();
    if (role) admin.role = role;
    if (status) admin.status = status;

    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: adminResponse,
    });
  } catch (error) {
    console.error("Update admin error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admin/users/:id
export const deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Prevent deleting yourself (req.user from authMiddleware)
    if (admin._id.toString() === req.user?.id?.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete yourself",
      });
    }

    await admin.deleteOne();

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Toggle admin status
// @route   PATCH /api/admin/users/:id/status
export const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Prevent deactivating yourself
    if (admin._id.toString() === req.user?.id?.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own status",
      });
    }

    admin.status = admin.status === "active" ? "inactive" : "active";
    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(200).json({
      success: true,
      message: `Admin ${admin.status === "active" ? "activated" : "deactivated"} successfully`,
      data: adminResponse,
    });
  } catch (error) {
    console.error("Toggle admin status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset admin password (send email)
// @route   POST /api/admin/users/:id/reset-password
export const resetAdminPassword = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Generate random password
    const newPassword = crypto.randomBytes(8).toString("hex");

    // Update password
    admin.password = newPassword;
    await admin.save();

    // Send email with new password
    try {
      await sendMail({
        to: admin.email,
        subject: "Your Password Has Been Reset",
        html: `
          <h2>Password Reset</h2>
          <p>Your password has been reset by an administrator.</p>
          <p><strong>New Password:</strong> ${newPassword}</p>
          <p>Please change your password after logging in.</p>
          <p><a href="${process.env.ADMIN_URL || "http://localhost:5173"}/login">Login Here</a></p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Password reset but failed to send email",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Reset admin password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get admin stats
// @route   GET /api/admin/stats
export const getAdminStats = async (req, res) => {
  try {
    const [total, active, inactive, recentLogins] = await Promise.all([
      Admin.countDocuments(),
      Admin.countDocuments({ status: "active" }),
      Admin.countDocuments({ status: "inactive" }),
      Admin.find({ lastLogin: { $ne: null } })
        .sort({ lastLogin: -1 })
        .limit(5)
        .select("firstName lastName email lastLogin avatar"),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        recentLogins,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current admin (alias for getAdminDetails)
// @route   GET /api/admin/me
export const getMe = async (req, res) => {
  return getAdminDetails(req, res);
};

// @desc    Change password
// @route   PUT /api/admin/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check current password
    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
