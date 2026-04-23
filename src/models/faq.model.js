import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    // Matches frontend FAQSection shape: { q, a }
    q: { type: String, required: true, trim: true, maxlength: 500 },
    a: {
      type: [String],
      default: [],
      // Each element becomes one paragraph in FAQSection.
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "draft",
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

faqSchema.index({ status: 1, order: 1, createdAt: -1 });

const FAQ = mongoose.model("FAQ", faqSchema);
export default FAQ;

