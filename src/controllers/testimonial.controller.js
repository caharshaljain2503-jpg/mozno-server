// controllers/testimonial.controller.js
import mongoose from "mongoose";
import Testimonial from "../models/testimonial.model.js";

// Get all testimonials
export const getAllTestimonials = async (req, res) => {
  try {
    const {
      status,
      featured,
      approved,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 50,
    } = req.query;

    // Build filter object
    const filter = {};

    if (status && ["published", "draft"].includes(status)) {
      filter.status = status;
    }

    if (featured !== undefined) {
      filter.featured = featured === "true";
    }

    if (approved !== undefined) {
      filter.approved = approved === "true";
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Testimonial.countDocuments(filter),
    ]);

    // Calculate stats
    const stats = await Testimonial.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          draft: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          featured: {
            $sum: { $cond: ["$featured", 1, 0] },
          },
          approved: {
            $sum: { $cond: ["$approved", 1, 0] },
          },
          totalLikes: { $sum: "$likes" },
          totalComments: { $sum: "$comments" },
          avgRating: { $avg: "$rating" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      testimonials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      stats: stats[0] || {
        total: 0,
        published: 0,
        draft: 0,
        featured: 0,
        approved: 0,
        totalLikes: 0,
        totalComments: 0,
        avgRating: 0,
      },
    });
  } catch (error) {
    console.error("getAllTestimonials error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get testimonial by ID
export const getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID format",
      });
    }

    const testimonial = await Testimonial.findById(id).lean();

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    return res.status(200).json({
      success: true,
      testimonial,
    });
  } catch (error) {
    console.error("getTestimonialById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonial",
    });
  }
};

// Get published testimonials (public endpoint)
export const getPublishedTestimonials = async (req, res) => {
  try {
    const { featured, limit = 10, approved } = req.query;

    const filter = {
      status: "published",
    };

    // Optional strict filter: /api/testimonials/public?approved=true
    if (approved !== undefined) {
      filter.approved = approved === "true";
    }

    if (featured === "true") {
      filter.featured = true;
    }

    const testimonials = await Testimonial.find(filter)
      .sort({ featured: -1, order: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .select("-createdBy -updatedBy")
      .lean();

    return res.status(200).json({
      success: true,
      testimonials,
    });
  } catch (error) {
    console.error("getPublishedTestimonials error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
    });
  }
};

// Create testimonial
export const createTestimonial = async (req, res) => {
  try {
    const {
      name,
      designation,
      company,
      rating,
      content,
      avatar,
      status,
      featured,
      approved,
      source,
      order,
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Testimonial content is required",
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const testimonial = new Testimonial({
      name: name.trim(),
      designation: designation?.trim() || "",
      company: company?.trim() || "",
      rating: rating || 5,
      content: content.trim(),
      avatar: avatar || null,
      status: status || "draft",
      featured: featured || false,
      approved: approved || false,
      source: source || "manual",
      order: order || 0,
      createdBy: req.admin?._id || null,
    });

    await testimonial.save();

    return res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      testimonial,
    });
  } catch (error) {
    console.error("createTestimonial error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create testimonial",
    });
  }
};

// Update testimonial
export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID format",
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.likes;
    delete updateData.comments;

    // Add updatedBy
    updateData.updatedBy = req.admin?._id || null;

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.designation) updateData.designation = updateData.designation.trim();
    if (updateData.company) updateData.company = updateData.company.trim();
    if (updateData.content) updateData.content = updateData.content.trim();

    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      testimonial,
    });
  } catch (error) {
    console.error("updateTestimonial error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update testimonial",
    });
  }
};

// Delete testimonial
export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID format",
      });
    }

    const testimonial = await Testimonial.findByIdAndDelete(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully",
    });
  } catch (error) {
    console.error("deleteTestimonial error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete testimonial",
    });
  }
};

// Toggle status (publish/draft)
export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID format",
      });
    }

    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    testimonial.status = testimonial.status === "published" ? "draft" : "published";
    testimonial.updatedBy = req.admin?._id || null;
    await testimonial.save();

    return res.status(200).json({
      success: true,
      message: `Testimonial ${testimonial.status === "published" ? "published" : "unpublished"} successfully`,
      testimonial,
    });
  } catch (error) {
    console.error("toggleStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle testimonial status",
    });
  }
};

// Toggle featured
export const toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID format",
      });
    }

    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    testimonial.featured = !testimonial.featured;
    testimonial.updatedBy = req.admin?._id || null;
    await testimonial.save();

    return res.status(200).json({
      success: true,
      message: `Testimonial ${testimonial.featured ? "marked as" : "removed from"} featured`,
      testimonial,
    });
  } catch (error) {
    console.error("toggleFeatured error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle featured status",
    });
  }
};

// Toggle approval
export const toggleApproval = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid testimonial ID format",
      });
    }

    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found",
      });
    }

    testimonial.approved = !testimonial.approved;
    testimonial.updatedBy = req.admin?._id || null;
    await testimonial.save();

    return res.status(200).json({
      success: true,
      message: `Testimonial ${testimonial.approved ? "approved" : "unapproved"} successfully`,
      testimonial,
    });
  } catch (error) {
    console.error("toggleApproval error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle approval status",
    });
  }
};

// Bulk update status
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Testimonial IDs are required",
      });
    }

    if (!status || !["published", "draft"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status (published/draft) is required",
      });
    }

    // Validate all IDs
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid testimonial IDs provided",
      });
    }

    const result = await Testimonial.updateMany(
      { _id: { $in: validIds } },
      {
        $set: {
          status,
          updatedBy: req.admin?._id || null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} testimonial(s) updated successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("bulkUpdateStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update testimonials",
    });
  }
};

// Bulk delete
export const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Testimonial IDs are required",
      });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid testimonial IDs provided",
      });
    }

    const result = await Testimonial.deleteMany({ _id: { $in: validIds } });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} testimonial(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("bulkDelete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete testimonials",
    });
  }
};

// Update order
export const updateOrder = async (req, res) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: "Orders array is required",
      });
    }

    const bulkOps = orders
      .filter((item) => mongoose.Types.ObjectId.isValid(item.id))
      .map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { order: item.order } },
        },
      }));

    if (bulkOps.length > 0) {
      await Testimonial.bulkWrite(bulkOps);
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("updateOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order",
    });
  }
};