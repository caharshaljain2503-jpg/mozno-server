import { Router } from "express";
import { getMarketOverview } from "../controllers/market.controller.js";

const marketRouter = Router();

marketRouter.get("/overview", getMarketOverview);

export default marketRouter;
