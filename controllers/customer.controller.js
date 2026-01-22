import { Customer } from "../models/customer.model.js";
import { sendOTP, verifyOTPWithPhoneNumber } from "../utils/otp.js";
import { generateToken } from "../config/jwt.config.js";

export const GetOTP = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        console.log("Get OTP :" + phoneNumber);
        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required." });
        }

        const OTPStatus = await sendOTP(phoneNumber);

        console.log("OTP Status:", OTPStatus);

        if (!OTPStatus.status) {
            return res.status(503).json({ error: "Failed to send OTP. Service unavailable." });
        }

        return res.status(200).json({
            message: "OTP sent successfully.",
            sessionId: OTPStatus.sessionId || "mock-session-id", // Replace with real sessionId if using a service
        });
    } catch (error) {
        console.error("GetOTP Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


export const verifyOTP = async (req, res) => {
    try {
        const { phoneNumber, OTP, sessionId, fcmToken } = req.body;


        if (!phoneNumber || !OTP || !sessionId) {
            const missingFields = [];
            if (!phoneNumber) missingFields.push("phoneNumber");
            if (!OTP) missingFields.push("OTP");
            if (!sessionId) missingFields.push("sessionId");
            return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
        }


        const OTPStatus = await verifyOTPWithPhoneNumber(phoneNumber, OTP, sessionId);

        if (!OTPStatus) {
            return res.status(400).json({ error: "Invalid or expired OTP." });
        }

        const customer = await Customer.findOne({ phoneNumber: phoneNumber });

        if (!customer) {
            return res.status(404).json({ error: "User not found. Please register first." });
        }

        await Customer.findOneAndUpdate(
            { phoneNumber: phoneNumber },
            {
                $set: {
                    fcmToken: fcmToken
                }
            },
            { new: true }
        )

        return res.status(200).json({
            message: "OTP verified successfully.",
            userStatus: 200,
            user: {
                id: customer._id,
                name: customer.name,
                phoneNumber: customer.phoneNumber,
                token: generateToken({ id: customer._id, phoneNumber: customer.phoneNumber })
            }
        });
    } catch (error) {
        console.error("verifyOTP Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


export const createUser = async (req, res) => {
    try {
        const { name, phoneNumber } = req.body;

        if (!name || !phoneNumber) {
            return res.status(400).json({ error: "All fields (name, phoneNumber) are required." });
        }

        // Second check - just before creating (race condition safety)
        const userExistsBeforeCreate = await Customer.findOne({ phoneNumber });
        if (userExistsBeforeCreate) {
            return res.status(409).json({ error: "Phone number already registered (retry check)." });
        }

        const newUser = await Customer.create({
            name,
            phoneNumber
        });
        return res.status(201).json({
            message: "Customer created successfully.",
            customer: {
                id: newUser._id,
                name: newUser.name,
                phoneNumber: newUser.phoneNumber,
                token: generateToken({ id: newUser._id, phoneNumber: newUser.phoneNumber })
            }
        });
    } catch (error) {
        console.error("CreateUser Error:", error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }

        // Catch duplicate key error from MongoDB in case two parallel requests slip past checks
        if (error.code === 11000 && error.keyValue?.phoneNumber) {
            return res.status(409).json({ error: "Phone number already registered" });
        }

        return res.status(500).json({ error: "Internal Server Error" });
    }
};


export const getCustomerProfile = async (req, res) => {
    try {
        const cust = req.customer;
        
        const customer = await Customer.findById(cust.id);

        if (!customer) {
            return res.status(404).json({ error: "Customer not found." });
        }
        return res.status(200).json({ customer });
    } catch (error) {
        console.error("getCustomerProfile Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}