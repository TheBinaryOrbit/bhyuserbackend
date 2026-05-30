import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  // Mandatory fields for creating account
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
  city: {
    type: String,
    required: true,
    trim: true
  },

  // Fields to be updated later
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
  },
  companyName: {
    type: String,
    trim: true
  },
  userType: {
    type: String,
    required: true,
    enum: ['OWNER'],  // User is always an OWNER who manages drivers and vehicles
    default: 'OWNER'
  },
  aadharNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows uniqueness but can be null
    match: [/^\d{12}$/, "Please enter a valid 12-digit Aadhar number"]
  },
  drivingLicenceNumber: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    // match: [/^[A-Z]{2}\d{13}$/, "Please enter a valid Driving Licence number"]
  },

  userImage: {
    type: String,
    trim: true,
    default: "/userimages/default.png"
  },

  profilePicture: {
    type: String,
    trim: true,
    default: "/uploads/default-profile.png"
  },

  // Verification details
  isSubscribed: {
    type: Boolean,
    required: true,
    default: true // to be changed to false in someDays / months
  },
  isUserVerified: {
    type: Boolean,
    required: true,
    default: false
  },

  // For alert
  fcmToken: {
    type: String,
    trim: true
  },
  isSendNotification: {
    type: Boolean,
    required: true,
    default: false,
  },
  carAleartFor: [
    {
      type: String,
      trim: true ,
      enum: ['HATCHBACK', 'SEDAN', 'ERTIGA', 'SUV', 'INNOVA', 'INNOVA CRYSTA'],
      default: ['HATCHBACK', 'SEDAN', 'ERTIGA', 'SUV', 'INNOVA', 'INNOVA CRYSTA']
    }
  ],
  cityAleartFor: {
    type: String,
    trim: true
  },
  isFreeTrialEligible: {
    type: Boolean,
    required: true,
    default: true
  },

  // Online status and location for ride booking
  isOnline: {
    type: Boolean,
    default: false
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
  },
  availableVehicles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  availableDrivers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  }]
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
UserSchema.index({ location: '2dsphere' });

export const User = mongoose.model('User', UserSchema);