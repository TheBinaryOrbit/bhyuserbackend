import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, "Please enter a valid Indian phone number"]
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
    },
    fcmToken: {
        type: String,
        trim: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },
    lastLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        updatedAt: { type: Date }
    },
    socketId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Create geospatial index for location-based queries
CustomerSchema.index({ location: '2dsphere' });

export const Customer = mongoose.model("Customer", CustomerSchema);