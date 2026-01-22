import mongoose from "mongoose";

const RequestSchema = new mongoose.Schema({
    driver : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    vehicle : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    requestRaisedBy : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestStatus : {
        type: String,
        required: true,
        trim: true,
        enum : ['PENDING' , 'APPROVED' ,'DECLINED' , 'COMPLETED']
    },
    fare : {
        type: Number,
        required: true,
        min: 0
    },
    requestedFor : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Ride',
        required  :true
    }
});

export const Request = mongoose.model("Request", RequestSchema);