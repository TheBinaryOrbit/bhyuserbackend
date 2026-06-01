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
            sessionId: OTPStatus.sessionId, // Replace with real sessionId if using a service
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

        // default login
        if(phoneNumber === "6203821043" && OTP === "123456"){
            let customer = await Customer.findOne({ phoneNumber: phoneNumber });

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
                    id: customer ? customer._id : null,
                    title: customer ? customer.title : null,
                    name: customer ? customer.name : null,
                    phoneNumber: phoneNumber,
                    token: generateToken({ id: customer ? customer._id : null, phoneNumber: phoneNumber })
                }
            });
        }


        const OTPStatus = await verifyOTPWithPhoneNumber(phoneNumber, OTP, sessionId);

        if(!OTPStatus.status) {
            return res.status(401).json({ error: "Invalid OTP." });
        }
        

        const customer = await Customer.findOne({ phoneNumber: phoneNumber });

        if (!customer) {
            return res.status(200).json({
                message: "OTP verified successfully.",
                userStatus: 404,
            });
    
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
            title: customer.title,
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


const VALID_TITLES = ['Mr.', 'Ms.', 'Mrs.'];

export const createUser = async (req, res) => {
    try {
        const { title, name, phoneNumber , fcmToken } = req.body;

        if (!name || !phoneNumber) {
            return res.status(400).json({ error: "All fields (name, phoneNumber) are required." });
        }

        if (title && !VALID_TITLES.includes(title)) {
            return res.status(400).json({ error: `Invalid title. Must be one of: ${VALID_TITLES.join(', ')}` });
        }

        // Second check - just before creating (race condition safety)
        const userExistsBeforeCreate = await Customer.findOne({ phoneNumber });
        if (userExistsBeforeCreate) {
            return res.status(409).json({ error: "Phone number already registered (retry check)." });
        }

        const newUser = await Customer.create({
            title,
            name,
            phoneNumber,
            fcmToken
        });
        return res.status(201).json({
            message: "Customer created successfully.",
            customer: {
                id: newUser._id,
                title: newUser.title,
                name: newUser.name,
                phoneNumber: newUser.phoneNumber,
                fcmToken: newUser.fcmToken,
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

export const updateCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { title, name, email } = req.body;

        if (title && !VALID_TITLES.includes(title)) {
            return res.status(400).json({ error: `Invalid title. Must be one of: ${VALID_TITLES.join(', ')}` });
        }

        const updateFields = {};
        if (title !== undefined) updateFields.title = title;
        if (name  !== undefined) updateFields.name  = name;
        if (email !== undefined) updateFields.email = email;

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ error: "No valid fields provided for update." });
        }

        const updatedCustomer = await Customer.findByIdAndUpdate(
            customerId,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ error: "Customer not found." });
        }

        return res.status(200).json({
            message: "Customer updated successfully.",
            customer: updatedCustomer
        });
    } catch (error) {
        console.error("updateCustomer Error:", error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: "Internal Server Error" });
    }
};


export const getCustomerProfile = async (req, res) => {
    try {
        const customerId = req.params.customerId;

        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({ error: "Customer not found." });
        }
        return res.status(200).json({ customer });
    } catch (error) {
        console.error("getCustomerProfile Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}