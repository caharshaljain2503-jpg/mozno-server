import mongoose from "mongoose";

const partnerLogoSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: [true, "Logo image URL is required"],
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

partnerLogoSchema.index({ isActive: 1, order: 1 });

const PartnerLogo = mongoose.model("PartnerLogo", partnerLogoSchema);

export default PartnerLogo;
