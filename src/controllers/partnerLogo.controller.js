import mongoose from "mongoose";
import PartnerLogo from "../models/partnerLogo.model.js";
import imagekit from "../configs/imageKit.js";

async function uploadLogoBuffer(buffer, originalname) {
  const fileBase64 = Buffer.isBuffer(buffer) ? buffer.toString("base64") : buffer;
  const response = await imagekit.upload({
    file: fileBase64,
    fileName: originalname || `partner-logo-${Date.now()}.png`,
    folder: "/partner-logos",
  });
  const optimizedUrl = imagekit.url({
    path: response.filePath,
    transformation: [{ quality: "auto" }, { format: "webp" }, { width: "400" }],
  });
  return optimizedUrl || response.url;
}

export const getPublicPartnerLogos = async (req, res) => {
  try {
    const logos = await PartnerLogo.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
    return res.status(200).json({
      success: true,
      partnerLogos: logos,
    });
  } catch (error) {
    console.error("getPublicPartnerLogos error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner logos",
    });
  }
};

export const getAllPartnerLogosAdmin = async (req, res) => {
  try {
    const logos = await PartnerLogo.find({}).sort({ order: 1, createdAt: 1 }).lean();
    return res.status(200).json({
      success: true,
      partnerLogos: logos,
    });
  } catch (error) {
    console.error("getAllPartnerLogosAdmin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner logos",
    });
  }
};

export const createPartnerLogo = async (req, res) => {
  try {
    const { name, order, isActive } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Logo image file is required",
      });
    }

    const imageUrl = await uploadLogoBuffer(imageFile.buffer, imageFile.originalname);

    const maxOrder = await PartnerLogo.findOne().sort({ order: -1 }).select("order").lean();
    const nextOrder =
      typeof order !== "undefined" && order !== ""
        ? parseInt(order, 10)
        : (maxOrder?.order ?? -1) + 1;

    const logo = new PartnerLogo({
      imageUrl,
      name: typeof name === "string" ? name.trim() : "",
      order: Number.isFinite(nextOrder) ? nextOrder : 0,
      isActive: isActive === "false" || isActive === false ? false : true,
    });

    await logo.save();

    return res.status(201).json({
      success: true,
      message: "Partner logo added",
      partnerLogo: logo,
    });
  } catch (error) {
    console.error("createPartnerLogo error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create partner logo",
    });
  }
};

export const updatePartnerLogo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid logo ID" });
    }

    const logo = await PartnerLogo.findById(id);
    if (!logo) {
      return res.status(404).json({ success: false, message: "Partner logo not found" });
    }

    const { name, order, isActive } = req.body;
    if (typeof name === "string") logo.name = name.trim();
    if (order !== undefined && order !== "") {
      const n = parseInt(order, 10);
      if (Number.isFinite(n)) logo.order = n;
    }
    if (isActive === "true" || isActive === true) logo.isActive = true;
    if (isActive === "false" || isActive === false) logo.isActive = false;

    if (req.file) {
      logo.imageUrl = await uploadLogoBuffer(req.file.buffer, req.file.originalname);
    }

    await logo.save();

    return res.status(200).json({
      success: true,
      message: "Partner logo updated",
      partnerLogo: logo,
    });
  } catch (error) {
    console.error("updatePartnerLogo error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update partner logo",
    });
  }
};

export const deletePartnerLogo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid logo ID" });
    }

    const logo = await PartnerLogo.findByIdAndDelete(id);
    if (!logo) {
      return res.status(404).json({ success: false, message: "Partner logo not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Partner logo deleted",
    });
  } catch (error) {
    console.error("deletePartnerLogo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete partner logo",
    });
  }
};

export const reorderPartnerLogos = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderedIds must be a non-empty array",
      });
    }

    const validIds = orderedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== orderedIds.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid id in orderedIds",
      });
    }

    const bulkOps = validIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index } },
      },
    }));

    await PartnerLogo.bulkWrite(bulkOps);

    const logos = await PartnerLogo.find({}).sort({ order: 1, createdAt: 1 }).lean();
    return res.status(200).json({
      success: true,
      message: "Order updated",
      partnerLogos: logos,
    });
  } catch (error) {
    console.error("reorderPartnerLogos error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reorder logos",
    });
  }
};
