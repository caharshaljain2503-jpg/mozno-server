import imagekit from "../configs/imageKit.js";
import Blog from "../models/blog.model.js";
import mongoose from "mongoose";
import Comment from '../models/comment.model.js'
import fs from "fs/promises";
import path from "path";

const normalizeCategory = (category) =>
  String(category || "")
    .trim()
    .replace(/\s+/g, " ");

const validateCategory = (category) => {
  const normalizedCategory = normalizeCategory(category);

  if (!normalizedCategory) {
    return { error: "Category is required." };
  }

  if (normalizedCategory.length > 60) {
    return { error: "Category must be 60 characters or fewer." };
  }

  return { category: normalizedCategory };
};

const hasImageKitConfig =
  !!process.env.IMAGEKIT_PUBLIC_KEY &&
  !!process.env.IMAGEKIT_PRIVATE_KEY &&
  !!process.env.IMAGEKIT_URL_ENDPOINT;

const slugifyFilePart = (value) =>
  String(value || "image")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";

const uploadBlogImage = async (imageFile, req) => {
  if (hasImageKitConfig) {
    const fileBase64 = imageFile.buffer.toString("base64");

    const response = await imagekit.upload({
      file: fileBase64,
      fileName: imageFile.originalname,
      folder: "/blogs",
    });

    return imagekit.url({
      path: response.filePath,
      transformation: [
        { quality: "auto" },
        { format: "webp" },
        { width: "1280" },
      ],
    });
  }

  if (process.env.NODE_ENV === "production") {
    throw Object.assign(
      new Error(
        "Image upload is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.",
      ),
      { statusCode: 503 },
    );
  }

  const extension =
    path.extname(imageFile.originalname).toLowerCase() ||
    `.${String(imageFile.mimetype || "image/jpeg").split("/")[1] || "jpg"}`;
  const fileName = `${Date.now()}-${slugifyFilePart(
    imageFile.originalname,
  )}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "blogs");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), imageFile.buffer);

  return `${req.protocol}://${req.get("host")}/uploads/blogs/${fileName}`;
};

export const addBlog = async (req, res) => {
  try {
    const {
      title,
      subTitle,
      paragraph,
      description,
      category,
      isPublished,
      author: authorId,
      bylineName,
      bylineRole,
    } = req.body;
    const imageFile = req.file;

    if (!title || !subTitle || !paragraph || !description || !category || !imageFile) {
      return res.status(400).json({
        success: false,
        message: "Title, summary, opening paragraph, description, category, and image are required.",
      });
    }

    const categoryValidation = validateCategory(category);
    if (categoryValidation.error) {
      return res.status(400).json({
        success: false,
        message: categoryValidation.error,
      });
    }

    const image = await uploadBlogImage(imageFile, req);

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    const author = authorId || req.user?.id;
    if (!author) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(author)) {
      return res.status(400).json({
        success: false,
        message: "Invalid author selected.",
      });
    }

    // Create the blog
    const blog = new Blog({
      title,
      subTitle: subTitle.trim(),
      paragraph: paragraph.trim(),
      description,
      category: categoryValidation.category,
      image,
      slug,
      isPublished: isPublished === true || isPublished === "true",
      author,
      bylineName: String(bylineName || "").trim(),
      bylineRole: String(bylineRole || "").trim(),
    });

    await blog.save();

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    console.error("Add Blog Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Internal server error",
    });
  }
};

export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("Blog request by slug:", slug);

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Blog slug is required",
      });
    }

    // Find blog by slug and make sure it's published
    const blog = await Blog.findOne({
      slug,
      isPublished: true,
      isDeleted: false,
    }).populate({
      path: "author",
      select: "firstName lastName email role",
    });
    console.log(blog);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found or not published",
      });
    }

    const comments = await Comment.countDocuments({
      blogId: blog._id,
      status: "approved",
      isApproved: true,
    });

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      blog: {
        ...blog.toObject(),
        comments,
      },
    });
  } catch (error) {
    console.error("Get Blog By Slug Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllBlog = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch total count for pagination info
    const totalBlogs = await Blog.countDocuments({
      isPublished: true,
      isDeleted: false,
    });

    // Fetch paginated blogs, sort by newest first
    const blogs = await Blog.find({ isPublished: true, isDeleted: false })
      .populate({
        path: "author",
        select: "firstName lastName email role",
      })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    const blogIds = blogs.map((blog) => blog._id);
    const commentCounts = await Comment.aggregate([
      {
        $match: {
          blogId: { $in: blogIds },
          status: "approved",
          isApproved: true,
        },
      },
      { $group: { _id: "$blogId", count: { $sum: 1 } } },
    ]);
    const commentCountMap = new Map(
      commentCounts.map((item) => [String(item._id), item.count]),
    );
    const blogsWithActivity = blogs.map((blog) => ({
      ...blog,
      views: Number(blog.views || 0),
      likes: Number(blog.likes || 0),
      comments: commentCountMap.get(String(blog._id)) || 0,
    }));

    const totalPages = Math.ceil(totalBlogs / limit);

    console.log(`All blog Fetching request - Page ${page}, Limit ${limit}`);

    return res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      blogs: blogsWithActivity,
    });
  } catch (error) {
    console.error("Get All Blogs Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const recordBlogView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid blog ID" });
    }

    const blog = await Blog.findOneAndUpdate(
      { _id: id, isPublished: true, isDeleted: false },
      { $inc: { views: 1 } },
      { new: true, select: "views likes" },
    );

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    return res.status(200).json({
      success: true,
      views: blog.views,
      likes: blog.likes,
    });
  } catch (error) {
    console.error("Record blog view error:", error);
    return res.status(500).json({ success: false, message: "Failed to record view" });
  }
};

export const toggleBlogLike = async (req, res) => {
  try {
    const { id } = req.params;
    const visitorId = String(req.body?.visitorId || "").trim().slice(0, 120);

    if (!mongoose.Types.ObjectId.isValid(id) || !visitorId) {
      return res.status(400).json({
        success: false,
        message: "Valid blog and visitor IDs are required",
      });
    }

    const existingBlog = await Blog.findOne({
      _id: id,
      isPublished: true,
      isDeleted: false,
    }).select("+likedBy likes");

    if (!existingBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const liked = existingBlog.likedBy.includes(visitorId);
    const update = liked
      ? { $pull: { likedBy: visitorId }, $inc: { likes: -1 } }
      : { $addToSet: { likedBy: visitorId }, $inc: { likes: 1 } };

    const blog = await Blog.findByIdAndUpdate(id, update, {
      new: true,
      select: "likes views likedBy",
    }).select("+likedBy");

    return res.status(200).json({
      success: true,
      liked: !liked,
      likes: Math.max(0, Number(blog.likes || 0)),
      views: Number(blog.views || 0),
    });
  } catch (error) {
    console.error("Toggle blog like error:", error);
    return res.status(500).json({ success: false, message: "Failed to update like" });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const { blogId } = req.params;
    console.log("Blog request by ID:", blogId);
    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required",
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(blogId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Blog ID format",
      });
    }

    const blog = await Blog.findById(blogId).populate({
      path: "author",
      select: "firstName lastName email role",
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      blog,
    });
  } catch (error) {
    console.error("Get Blog By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const toggleBlogVisibility = async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required",
      });
    }

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found by ID",
      });
    }

    blog.isPublished = !blog.isPublished;

    await blog.save();

    return res.status(200).json({
      success: true,
      message: `Blog is now ${blog.isPublished ? "published" : "draft"}`,
      blog,
    });
  } catch (error) {
    console.error("Toggle Blog Visibility Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const handleDeleteBlogs = async (req, res) => {
  try {
    const { blogId } = req.params;

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required to delete a blog",
      });
    }

    const blog = await Blog.findByIdAndDelete(blogId);

    //delete all comments associated with blog
    await Comment.deleteMany({ blog: blogId });

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      blog,
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const EditBlogs = async (req, res) => {
  try {
    const { blogId } = req.params;
    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required",
      });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const {
      title,
      subTitle,
      paragraph,
      description,
      category,
      isPublished,
      author,
      bylineName,
      bylineRole,
    } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (!title || !subTitle || !paragraph || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, summary, opening paragraph, description, and category are required.",
      });
    }

    const categoryValidation = validateCategory(category);
    if (categoryValidation.error) {
      return res.status(400).json({
        success: false,
        message: categoryValidation.error,
      });
    }

    // Handle image upload if a new file is provided
    let image = blog.image; // keep old image if no new file
    if (imageFile) {
      image = await uploadBlogImage(imageFile, req);
    }

    // Update slug if title changed
    const slug =
      title !== blog.title
        ? title
            .toLowerCase()
            .trim()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "")
        : blog.slug;

    // Update blog fields
    blog.title = title;
    blog.subTitle = subTitle.trim();
    blog.paragraph = paragraph.trim();
    blog.description = description;
    blog.category = categoryValidation.category;
    blog.bylineName = String(bylineName || "").trim();
    blog.bylineRole = String(bylineRole || "").trim();
    if (author) {
      if (!mongoose.Types.ObjectId.isValid(author)) {
        return res.status(400).json({
          success: false,
          message: "Invalid author selected.",
        });
      }
      blog.author = author;
    }
    blog.isPublished =
      typeof isPublished === "undefined"
        ? blog.isPublished
        : isPublished === true || isPublished === "true"; // keep old value if not provided
    blog.slug = slug;
    blog.image = image;

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Edit Blog Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Internal server error",
    });
  }
};

export const addComments = async (req, res) => {
  try {
    const { blogId, name, content, parentComment = null } = req.body;
    console.log(
      `Add Comment request with comment ID:${blogId} with content:${content}`,
    );
    if (!blogId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Blog and content are required",
      });
    }

    const comment = await Comment.create({
      blogId: blogId,
      name: name?.trim() || "Anonymous",
      content: content.trim(),
      parentComment,
      status: "approved",
      isApproved: true,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "Comment submitted and awaiting review",
      data: comment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

export const getBlogsComment = async (req, res) => {
  try {
    const { blogId } = req.params;
    console.log("get comments for blog:", blogId);

    if (!blogId) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required",
      });
    }

    const comments = await Comment.find({
      blogId: new mongoose.Types.ObjectId(blogId),
    });

    // console.log("comments get", comments);
    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllBlogAdmin = async (req, res) => {
  try {
    const blogs = await Blog.find({})
      .populate({
        path: "author",
        select: "firstName lastName email role",
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, message: "All blogs data(Admin)", blogs });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getBlogBySlugAdmin = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("Admin blog request by slug:", slug);

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Blog slug is required",
      });
    }

    // Find blog by slug (admin can see all except deleted)
    const blog = await Blog.findOne({
      slug,
      isDeleted: false,
    }).populate({
      path: "author",
      select: "username email",
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      blog,
    });
  } catch (error) {
    console.error("Get Blog By Slug Admin Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllComments = async (req, res) => {
  try {
    const {id} = req.params();
    console.log("all comments")
    const comments = await Comment.find({id})
      .populate("blog")
      .sort({ createdAt: -1 });
    res.json({ success: true, comments });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getCommentsByBlogId = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching comments for blog:", id);
    
    // Fetch comments and optionally populate blog details
    const comments = await Comment.find({ 
      blogId: id,
      parentComment: null 
    })
    .populate("blogId", "title slug") // This will populate the blog details
    .sort({ createdAt: -1 });
    
    // For each comment, fetch its replies
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ 
          parentComment: comment._id,
          blogId: id 
        })
        .populate("blogId", "title slug")
        .sort({ createdAt: 1 });
        
        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    res.json({ 
      success: true, 
      comments: commentsWithReplies 
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const deleteCommentById = async (req, res) => {
  try {
    const { blogId } = req.body;
    await Comment.findByIdAndDelete(blogId);
    res.json({ success: true, message: "Comment Deleted successfully" });
  } catch (error) {
    res.json({ success: true, message: error.message });
  }
};

export const changeCommentStatus = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "approved", "rejected"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    comment.status = status;

    comment.isApproved = true;

    await comment.save();

    return res.status(200).json({
      success: true,
      message: `Comment ${status} successfully`,
      data: comment,
    });
  } catch (error) {
    console.error("Change comment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment status",
    });
  }
};
