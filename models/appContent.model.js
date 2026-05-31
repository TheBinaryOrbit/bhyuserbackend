import mongoose from "mongoose";

const AppContentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true,
    enum: ['privacy_policy', 'terms_conditions', 'about_us'],
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true, // This will store HTML content
  }
}, {
  timestamps: true
});

const AppContent = mongoose.model("AppContent", AppContentSchema);
export default AppContent;
