import mongoose from "mongoose";


const RideSchema = new mongoose.Schema({
    to : {
        type: String,
        required: true,
        trim: true
    },
    from : {
        type: String,
        required: true,
        trim: true
    },
    pickUpDateTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    vehicleType : {
        type: String,
        required: true,
        trim: true,
        enum : ['HATCHBACK' , 'SEDAN' ,'ERTIGA' , 'SUV' , 'INNOVA' , 'INNOVA CRYSTA', 'AUTO', 'BIKE', 'MUV']
    },
    passangerCount : {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    fare : {
        type: Number,
        required: true,
        min: 0
    },
    estimatedDistance: {
        type: Number,
        default: 0,
        min: 0
    },
    rideType : {
        type: String,
        required: true,
        trim: true,
        enum : ['QUICKRIDE' , 'OUTSTATION']
    },
    bookedBy : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    assingTo : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    rideStatus : {
        type: String,
        required: true,
        trim: true,
        enum : ['PENDING' , 'ACCEPTED' ,'ONGOING' ,'COMPLETED' , 'CANCELLED', 'DEFAULTED'],
        default: 'PENDING'
    },
    defaultReason: {
        type: String,
        trim: true
    },
    startOtp: {
        type: String,
        select: false  // Don't include in queries by default for security
    },
    startOtpExpiresAt: {
        type: Date,
        select: false
    }
})

export const Ride = mongoose.model("Ride", RideSchema);