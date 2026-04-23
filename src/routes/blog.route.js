import { Router } from "express";
import { getBlogBySlug,getAllBlog,getAllComments,addComments, getCommentsByBlogId } from "../controllers/blog.controller.js";


const blogRouter = Router();

blogRouter.get("/",getAllBlog);
blogRouter.get("/:slug",getBlogBySlug)
blogRouter.get("/comments/:id", getCommentsByBlogId);
blogRouter.post("/add-comment", addComments);

export default blogRouter;