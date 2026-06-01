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
    },
    slug: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

QuickRideSchema.index({ customerId: 1, slug: 1 }, { unique: true });

const generateSlug = (tag) => {
    return tag
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove special characters
        .replace(/\s+/g, '_')    // replace spaces with underscores
        .replace(/-+/g, '_');    // replace hyphens with underscores
};

QuickRideSchema.pre('save', function (next) {
    if (this.isModified('tag')) {
        this.slug = generateSlug(this.tag);
    }
    next();
});

QuickRideSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    
    // Handle both direct updates and $set updates
    if (update.tag) {
        update.slug = generateSlug(update.tag);
    } else if (update.$set && update.$set.tag) {
        update.$set.slug = generateSlug(update.$set.tag);
    }
    
    next();
});

export const QuickRide = mongoose.model("QuickRide", QuickRideSchema);
