import { Router } from "express";
import { getBlogBySlug,getAllBlog,addComments, getCommentsByBlogId, recordBlogView, toggleBlogLike } from "../controllers/blog.controller.js";


const blogRouter = Router();

blogRouter.get("/",getAllBlog);
blogRouter.get("/comments/:id", getCommentsByBlogId);
blogRouter.post("/add-comment", addComments);
blogRouter.post("/:id/view", recordBlogView);
blogRouter.post("/:id/like", toggleBlogLike);
blogRouter.get("/:slug",getBlogBySlug)

export default blogRouter;
