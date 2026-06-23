import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    subTitle: {
      type: String,
      required: true,
    },
    paragraph: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    image: {
      type: String,
      required: true,
      validate: {
        validator: (v) =>
          /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(?:[?#].*)?$/i.test(v),
        message: (props) => `${props.value} is not a valid image URL!`,
      },
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    bylineName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    bylineRole: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: {
      type: [String],
      default: [],
      select: false,
    },
  },
  { timestamps: true },
);

blogSchema.pre("save", async function () {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");
  }
});

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
