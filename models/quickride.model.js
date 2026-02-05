import mongoose from "mongoose";

const QuickRideSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true,
        trim: true
    },
    from: {
        type: String,
        required: true,
        trim: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    distance: {
        type: Number,
        required: true,
        min: 0
    },
    tag: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

export const QuickRide = mongoose.model("QuickRide", QuickRideSchema);
