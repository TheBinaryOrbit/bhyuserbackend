import express from "express";
import { getAppContent, getAllAppContents, upsertAppContent } from "../controllers/appContent.controller.js";

const router = express.Router();

router.get("/", getAllAppContents);
router.get("/:type", getAppContent);
router.post("/", upsertAppContent); // For setting initial data or updating

export default router;
