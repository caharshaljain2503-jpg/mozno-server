import Notification from "../models/notification.model.js";
import mongoose from "mongoose";

// ============= GET NOTIFICATIONS =============

export const getAllNotifications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      read, 
      type, 
      category 
    } = req.query;

    // Build query
    const query = {};
    
    // Filter by user or global
    if (req.user?.id) {
      query.$or = [
        { userId: req.user.id },
        { isGlobal: true }
      ];
    } else {
      query.isGlobal = true;
    }

    // Apply filters
    if (read !== undefined) query.read = read === "true";
    if (type) query.type = type;
    if (category) query.category = category;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findById(id).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Get notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification",
    });
  }
};

// ============= CREATE NOTIFICATIONS =============

export const createNotification = async (req, res) => {
  try {
    const { 
      title, 
      message, 
      type = "info", 
      category = "system", 
      action, 
      userId, 
      isGlobal = false,
      expiresAt 
    } = req.body;

    // Validation
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Title must be less than 200 characters",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message must be less than 2000 characters",
      });
    }

    // Create notification
    const notification = new Notification({
      title: title.trim(),
      message: message.trim(),
      type,
      category,
      action,
      userId: userId || req.user?.id,
      isGlobal,
      expiresAt,
    });

    await notification.save();

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notification",
    });
  }
};

// Bulk create notifications (for system events)
export const createBulkNotifications = async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Notifications array is required",
      });
    }

    const createdNotifications = await Notification.insertMany(notifications);

    return res.status(201).json({
      success: true,
      message: `${createdNotifications.length} notifications created`,
      notifications: createdNotifications,
    });
  } catch (error) {
    console.error("Bulk create notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notifications",
    });
  }
};

// ============= UPDATE NOTIFICATIONS =============

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const query = req.user?.id 
      ? { $or: [{ userId: req.user.id }, { isGlobal: true }], read: false }
      : { isGlobal: true, read: false };

    const result = await Notification.updateMany(
      query,
      { read: true }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

// ============= DELETE NOTIFICATIONS =============

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    const query = req.user?.id 
      ? { $or: [{ userId: req.user.id }, { isGlobal: true }] }
      : { isGlobal: true };

    const result = await Notification.deleteMany(query);

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} notifications cleared`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear all notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications",
    });
  }
};

// ============= NOTIFICATION STATS =============

export const getNotificationStats = async (req, res) => {
  try {
    const query = req.user?.id 
      ? { $or: [{ userId: req.user.id }, { isGlobal: true }] }
      : { isGlobal: true };

    const [total, unread, byType, byCategory] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, read: false }),
      Notification.aggregate([
        { $match: query },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Notification.aggregate([
        { $match: query },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        unread,
        byType: byType.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        byCategory: byCategory.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      },
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification stats",
    });
  }
};