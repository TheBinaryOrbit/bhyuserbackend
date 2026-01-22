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
        enum : ['HATCHBACK' , 'SEDAN' ,'ERTIGA' , 'SUV' , 'INNOVA' , 'INNOVA CRYSTA']
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
        enum : ['PENDING' , 'ACCEPTED' ,'ONGOING' ,'COMPLETED' , 'CANCELLED'],
        default: 'PENDING'
    }
})

export const Ride = mongoose.model("Ride", RideSchema);