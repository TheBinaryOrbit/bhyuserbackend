import { User } from "../models/user.model.js";

/**
 * @route   POST /api/user/update-profile-pic/:userId
 * @desc    Update user profile picture
 * @access  Private
 */
export const updateProfilePicture = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload an image"
            });
        }

        // The URL path to be saved in the database
        const profileImageUrl = `/uploads/${req.file.filename}`;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { profilePicture: profileImageUrl } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile picture updated successfully",
            profilePicture: updatedUser.profilePicture
        });
    } catch (error) {
        console.error("updateProfilePicture Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("getUserProfile Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
