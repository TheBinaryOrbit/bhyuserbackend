import mongoose from "mongoose";
import dotenv from "dotenv";
import AppContent from "./models/appContent.model.js";

dotenv.config();

const seedData = [
  {
    type: "privacy_policy",
    title: "Privacy Policy",
    content: `
      <h1>Privacy Policy</h1>
      <p>Last updated: June 1, 2026</p>
      <p>Your privacy is important to us. This policy explains how we collect and use your data.</p>
      <h2>1. Information We Collect</h2>
      <ul>
        <li>Phone number</li>
        <li>Location data for ride matching</li>
        <li>Device information</li>
      </ul>
      <h2>2. How We Use Data</h2>
      <p>We use your data strictly to provide ride-sharing services and improve user experience.</p>
    `
  },
  {
    type: "terms_conditions",
    title: "Terms and Conditions",
    content: `
      <h1>Terms & Conditions</h1>
      <p>Welcome to BHY. By using our app, you agree to these terms.</p>
      <h2>1. User Obligations</h2>
      <p>Users must provide accurate information and behave respectfully towards drivers.</p>
      <h2>2. Cancellation Policy</h2>
      <p>Cancellations after 5 minutes of booking may incur a fee.</p>
    `
  },
  {
    type: "about_us",
    title: "About Us",
    content: `
      <h1>About BHY</h1>
      <p>BHY (Book Here You) is a revolutionary ride-sharing platform focused on transparency and efficiency.</p>
      <p>Our mission is to provide affordable and reliable transportation for everyone, everywhere.</p>
      <p>Contact us at: support@bhy.com</p>
    `
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Delete existing content to avoid duplicates for this seed run
    await AppContent.deleteMany({});

    await AppContent.insertMany(seedData);
    console.log("App content seeded successfully!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedDB();
