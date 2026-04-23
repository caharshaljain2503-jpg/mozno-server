// controllers/contact.controller.js
import mongoose from "mongoose"; // ADD THIS IMPORT
import Contact from '../models/user.model.js'

// Get all leads
export const getAllLeads = async (req, res) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error("getAllLeads error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching leads",
    });
  }
};

// Get lead by ID
export const getLeadsById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Lead ID is required",
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Lead ID format",
      });
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      contact, // Changed from 'lead' to 'contact' for consistency
    });
  } catch (error) {
    console.error("getLeadsById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead",
    });
  }
};

// Update lead status
export const setLeadStatus = async (req, res) => {
  try {
    const { status, contactId } = req.body;

    if (!status || !contactId) {
      return res.status(400).json({
        success: false,
        message: "Status and contactId are required",
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Contact ID format",
      });
    }

    const allowedStatuses = ["new", "read", "replied"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { status },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Status updated successfully",
      contact: updatedContact,
    });
  } catch (error) {
    console.error("setLeadStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lead status",
    });
  }
};