# OUTSTATION Ride Type Implementation

## 🎯 Overview
This document describes the OUTSTATION ride type feature, which complements the existing QUICKRIDE functionality with long-distance, advance-booking capabilities.

## 📋 Features Implemented

### 1. Ride Type Selection
- **QUICKRIDE**: Immediate booking, local trips (within 10km)
- **OUTSTATION**: Advance booking (2+ hours), long-distance trips (100km+ search radius)

### 2. Distance-Based Fare Calculation
Automatic fare calculation based on ride type and vehicle type:

#### QUICKRIDE Rates (Per km)
- AUTO: ₹15/km + ₹30 base fare
- BIKE: ₹12/km + ₹25 base fare
- SEDAN: ₹20/km + ₹50 base fare
- SUV: ₹25/km + ₹70 base fare
- MUV: ₹28/km + ₹80 base fare

#### OUTSTATION Rates (Per km)
- SEDAN: ₹12/km + ₹200 base fare
- SUV: ₹15/km + ₹300 base fare
- MUV: ₹18/km + ₹350 base fare
- *AUTO and BIKE are disabled for OUTSTATION rides*

### 3. Proximity Search Logic

#### QUICKRIDE
- **Search Radius**: 10 km
- **Timeout**: 3 minutes (180,000 ms)
- **Booking**: Immediate
- **Vehicle Types**: All (AUTO, BIKE, SEDAN, SUV, MUV)

#### OUTSTATION
- **Search Radius**: 100 km (nationwide/regional coverage)
- **Timeout**: 1 hour (3,600,000 ms)
- **Booking**: Minimum 2 hours advance
- **Vehicle Types**: SEDAN, SUV, MUV only

### 4. Advance Booking
- OUTSTATION rides require pickup time to be at least 2 hours from current time
- Date/time picker automatically validates advance booking requirement
- QUICKRIDE allows immediate booking (no minimum advance time)

### 5. Environment Variables
Configure these in your `.env` file:

```env
# QUICKRIDE Settings
QUICKRIDE_SEARCH_RADIUS_KM=10
QUICKRIDE_TIMEOUT_MS=180000

# OUTSTATION Settings
OUTSTATION_SEARCH_RADIUS_KM=100
OUTSTATION_TIMEOUT_MS=3600000
OUTSTATION_DISTANCE_KM=150

# General Settings
MAX_DRIVERS_TO_NOTIFY=20
```

## 🔧 Technical Implementation

### Frontend (WEBSOCKET_TESTING.html)

#### New UI Components
1. **Ride Type Dropdown**: Switch between QUICKRIDE and OUTSTATION
2. **Date/Time Picker**: For advance booking
3. **Distance Input**: Estimated trip distance for fare calculation
4. **Fare Calculator**: Auto-calculates fare based on distance, ride type, and vehicle type

#### New Functions
- `calculateFare()`: Distance-based fare calculation
- `handleRideTypeChange()`: Updates UI constraints based on ride type
- `validatePickupTime()`: Ensures OUTSTATION bookings are 2+ hours ahead

### Backend Changes

#### service/ride.service.js
- Updated `createRide()` to handle different search radii:
  - QUICKRIDE: 10km radius
  - OUTSTATION: 100km radius
- Returns `searchRadius` in response for frontend display
- Extends timeout period based on ride type

#### config/socket.config.js
- Modified timeout logic to support both ride types
- Enhanced logging to show ride type, search radius, and timeout
- Updated `ride:created` event to include `searchRadius` field
- Adjusted timeout messages based on ride type

## 📊 User Experience Flow

### Customer Journey - QUICKRIDE
1. Customer selects QUICKRIDE
2. Enters pickup/drop locations
3. System gets customer's current location
4. Creates ride immediately
5. System searches for owners within 10km
6. Owners have 3 minutes to raise requests
7. Customer accepts request from nearby owner

### Customer Journey - OUTSTATION
1. Customer selects OUTSTATION
2. Vehicle type restricted to SEDAN/SUV/MUV
3. Must select pickup time (minimum 2 hours ahead)
4. Enters estimated distance for fare calculation
5. System calculates fare using OUTSTATION rates
6. Creates ride with advance booking
7. System searches for owners within 100km
8. Owners have 1 hour to raise requests
9. Customer accepts request

## 🎨 UI Indicators

### Ride Type Badges
- **QUICKRIDE**: Green badge with "QUICKRIDE" text
- **OUTSTATION**: Orange badge with "OUTSTATION" text

### Information Boxes
- Color-coded info boxes explain differences between ride types
- Real-time feedback shows search radius and timeout for each type
- Location-based filtering info updated for both types

## 🔍 Testing

### Test QUICKRIDE
1. Connect as customer
2. Select QUICKRIDE
3. Create ride
4. Verify 10km search radius in console
5. Verify 3-minute timeout

### Test OUTSTATION
1. Connect as customer
2. Select OUTSTATION
3. Set pickup time 2+ hours ahead
4. Note AUTO/BIKE are disabled
5. Enter distance (e.g., 150km)
6. Verify fare calculation
7. Create ride
8. Verify 100km search radius in console
9. Verify 1-hour timeout

## 📝 Notes

### Vehicle Type Restrictions
- OUTSTATION rides automatically disable AUTO and BIKE options
- If AUTO/BIKE is selected when switching to OUTSTATION, system auto-selects SEDAN
- All vehicle types available for QUICKRIDE

### Timeout Behavior
- QUICKRIDE: Auto-defaults after 3 minutes if no acceptance (marked as DEFAULTED)
- OUTSTATION: Cancels after 1 hour if no acceptance (marked as CANCELLED)
- Both timeouts are cleared when request is accepted
- QUICKRIDE rides also auto-default if customer disconnects during PENDING status

### Auto-Default Feature (QUICKRIDE Only)
- Automatically marks QUICKRIDE as **DEFAULTED** when:
  - Customer disconnects/closes browser before acceptance
  - Network connection is lost during PENDING status
  - 3-minute timeout expires without acceptance
- Prevents orphaned rides and maintains system integrity
- See [AUTO_DEFAULT_FEATURE.md](AUTO_DEFAULT_FEATURE.md) for detailed documentation

### Distance-Based Pricing
- Fare is automatically calculated when distance changes
- Formula: `Base Fare + (Distance × Rate Per Km)`
- Fare remains editable by customer after calculation

## 🚀 Future Enhancements
- Dynamic vehicle type suggestions based on passenger count and distance
- Multi-stop route support for OUTSTATION
- Return trip booking for OUTSTATION
- Surge pricing during peak hours
- Distance estimation API integration (Google Maps/Mapbox)
- Real-time traffic-based ETA calculation
