import AppContent from "../models/appContent.model.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";

/**
 * @route   GET /api/app-content/:type
 * @desc    Get app content by type (privacy_policy, terms_conditions, about_us)
 * @access  Public
 */
export const getAppContent = async (req, res) => {
  try {
    const { type } = req.params;

    // Validate type
    const validTypes = ['privacy_policy', 'terms_conditions', 'about_us'];
    if (!validTypes.includes(type)) {
      return sendError(res, 400, "Invalid content type. Must be one of: " + validTypes.join(", "));
    }

    const content = await AppContent.findOne({ type });

    if (!content) {
      return sendError(res, 404, `Content for ${type} not found`);
    }

    return sendSuccess(res, 200, `${content.title} fetched successfully`, content);
  } catch (error) {
    console.error("Error in getAppContent:", error);
    return sendError(res, 500, "Internal server error", error.message);
  }
};

/**
 * @route   GET /api/app-content
 * @desc    Get all app contents
 * @access  Public
 */
export const getAllAppContents = async (req, res) => {
  try {
    const contents = await AppContent.find();
    return sendSuccess(res, 200, "All app contents fetched successfully", contents);
  } catch (error) {
    console.error("Error in getAllAppContents:", error);
    return sendError(res, 500, "Internal server error", error.message);
  }
};

/**
 * @route   POST /api/app-content
 * @desc    Create or update app content (Admin use)
 * @access  Public (Should be private in production)
 */
export const upsertAppContent = async (req, res) => {
  try {
    const { type, title, content } = req.body;

    if (!type || !title || !content) {
      return sendError(res, 400, "Type, title and content are required");
    }

    const appContent = await AppContent.findOneAndUpdate(
      { type },
      { type, title, content },
      { new: true, upsert: true }
    );

    return sendSuccess(res, 200, "App content updated successfully", appContent);
  } catch (error) {
    console.error("Error in upsertAppContent:", error);
    return sendError(res, 500, "Internal server error", error.message);
  }
};
