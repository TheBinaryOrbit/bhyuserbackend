# BHY User Backend — How It Works

A technical walkthrough of the BHY (ride‑sharing) backend: architecture, data models, the real‑time ride lifecycle, REST API surface, and the key business rules that drive everything.

> Generated from a full read of the source. Where the code and `.env.example` disagree on a value, both are noted.

---

## 1. What this service is

A **Node.js + Express + Socket.IO** backend for a ride‑hailing/ride‑sharing platform. It connects two kinds of actors:

- **Customers** — riders who book rides (model: `Customer`).
- **Owners** (a.k.a. Users) — fleet operators who own one or more **Drivers** and **Vehicles**, and respond to ride requests (model: `User`, `userType: 'OWNER'`).

The core flow: a customer creates a ride → nearby online owners are notified (socket + FCM push) → an owner raises a **Request** offering one of their drivers/vehicles at a fare → the customer accepts one request → an OTP‑gated ride starts → driver location is streamed live to the customer → ride completes.

Almost all real‑time behavior lives in **`config/socket.config.js`**; the REST API is a parallel surface over the same services.

---

## 2. Tech stack & dependencies

| Concern | Library |
|---|---|
| HTTP server / routing | `express` |
| Real‑time | `socket.io` (+ `socket.io-client` for tests) |
| Database / ODM | `mongoose` (MongoDB) |
| Auth tokens | `jsonwebtoken` |
| Push notifications | `firebase-admin` (FCM) |
| Maps / distance | `@googlemaps/google-maps-services-js` |
| File uploads | `multer` |
| Config | `dotenv` |
| Validation | `express-validator` (and inline checks) |
| Password hashing | `bcryptjs` (listed; OTP is the primary auth path) |

Entry point: **`server.js`** (`npm start` → `node server.js`, `npm run dev` → nodemon). ES Modules (`"type": "module"`).

---

## 3. Application bootstrap (`server.js`)

1. Creates the Express app and wraps it in a raw `http.Server` (needed so Socket.IO can attach).
2. `initializeSocket(server)` builds the Socket.IO server; the `io` instance is stored via `app.set('io', io)` so REST controllers can emit events too.
3. `connectDB()` connects to MongoDB (`config/dbConnection.js`, uses `MONGODB_URI`).
4. All Mongoose models are imported up‑front to register their schemas before any query runs.
5. Middleware: `cors` (origin from `CORS_ORIGIN`), `express.json`, `express.urlencoded`, and static serving of `/uploads`.
6. Mounts routers (see API section).
7. `/health` and `/` info routes, a 404 handler, and a final error‑handling middleware.
8. **Background sweeper:** every `TIMEOUT_CHECK_INTERVAL` ms (default 60 000) it calls `declineTimedOutRequests(REQUEST_TIMEOUT_MINUTES)` (default 5 min) to auto‑decline stale `PENDING` requests. It also runs once on startup.
9. Listens on `PORT` (default 5000).

---

## 4. Data models (`models/`)

All models use Mongoose `timestamps` (`createdAt`/`updatedAt`). Indian phone validation `^[6-9]\d{9}$` recurs across user‑facing models.

### User (owner) — `user.model.js`
The fleet operator. Key fields:
- Identity: `name`, `phoneNumber` (unique), `city`, `email`, `companyName`.
- `userType`: enum `['OWNER']`, default `OWNER`.
- KYC: `aadharNumber` (unique, sparse, `^\d{12}$`), `drivingLicenceNumber` (unique, sparse), `userImage`, `profilePicture`.
- Flags: `isSubscribed` (default true), `isUserVerified`, `isFreeTrialEligible`, `isOnline`, `isSendNotification`.
- Notifications: `fcmToken`.
- Alert prefs: `carAleartFor` (array of vehicle types, [sic] typo), `cityAleartFor`.
- **Geo:** `location` GeoJSON Point with a **2dsphere index**; plus `lastLocation { latitude, longitude, updatedAt }` used by the matching logic.
- Fleet: `availableVehicles` → `[Vehicle]`, `availableDrivers` → `[Driver]`.
- `socketId` for the active connection.

### Customer (rider) — `customer.model.js`
- `title` (`Mr.`/`Ms.`/`Mrs.`), `name`, `phoneNumber` (unique), `email`, `fcmToken`.
- `location` GeoJSON Point (**2dsphere**), `lastLocation`, `socketId`.

### Driver — `driver.model.js` (`strict: false`)
- `name`, `phone`, `address`, `city`, `driverImage`.
- License: `dlNumber` (uppercased), `dlFront`, `dlBack`.
- `userId` → `User` (the owner who manages this driver).

### Vehicle — `vehicle.model.js` (`strict: false`)
- `vehicleType` enum: `HATCHBACK, SEDAN, ERTIGA, SUV, INNOVA, INNOVA CRYSTA` (uppercased).
- `registrationNumber`, `yearOfManufacture`, `insuranceImage`, `insuranceExpDate`, `vehicleImages[]`, `rcImage`.
- `userId` → `User`.

### Ride — `rides.js` ⭐ central entity
- Trip: `from`, `to`, `pickUpDateTime` (default now), `vehicleType` (9‑value enum incl. `AUTO`, `BIKE`, `MUV`), `passangerCount` (1–10), `fare`, `estimatedDistance`, `estimatedDuration`.
- `rideType`: enum `['QUICKRIDE', 'OUTSTATION']` — drives radius/timeout/availability rules.
- `bookedBy` → `Customer`; `assingTo` → `Driver` (optional, [sic] typo for "assignTo").
- `rideStatus`: enum `['PENDING','ACCEPTED','ONGOING','COMPLETED','CANCELLED','DEFAULTED']`, default `PENDING`.
- `defaultReason` (set when a ride DEFAULTs).
- **OTP:** `startOtp` and `startOtpExpiresAt` — both `select: false` (never returned unless explicitly `.select('+startOtp')`).
- `isLater` (scheduled), `expiresAt` (indexed; QUICKRIDE timeout deadline).

### Request — `requests.model.js`
An owner's offer to fulfil a ride.
- `driver` → `Driver`, `vehicle` → `Vehicle`, `requestRaisedBy` → `User`, `requestedFor` → `Ride`.
- `requestStatus`: enum `['PENDING','APPROVED','DECLINED','COMPLETED']`.
- `fare`, `declineReason`.

### QuickRide (saved route) — `quickride.model.js`
A customer's saved favourite route (not a live trip).
- `from`, `to`, `customerId` → `Customer`, `distance`, `tag`, `slug`.
- Pre‑save / pre‑update hooks auto‑generate `slug` from `tag`. **Compound unique index** on `(customerId, slug)` — a customer can't save the same route tag twice.

### AppContent — `appContent.model.js`
CMS for legal pages. `type` (unique enum: `privacy_policy`, `terms_conditions`, `about_us`), `title`, `content` (HTML).

### Relationship map

```
User (OWNER) ──< availableDrivers >── Driver ──> userId ── User
   │                                    ▲
   ├──< availableVehicles >── Vehicle ──┘ (userId → User)
   │
Customer ──booksMany──> Ride ──assignedTo──> Driver
                          ▲
                          │ requestedFor
   User ──raises──> Request ──> driver / vehicle
Customer ──saves──> QuickRide
```

---

## 5. The ride lifecycle (real‑time core)

This is the heart of the system. Statuses move `PENDING → ACCEPTED → ONGOING → COMPLETED`, with `CANCELLED` and `DEFAULTED` as terminal exits.

### 5.1 In‑memory state (in `socket.config.js`)
Several `Map`s hold live, per‑process state (note: not shared across multiple instances):
- `activeConnections`: `userId/customerId → socketId`.
- `rideTimeouts`: `rideId → timeoutId` (QUICKRIDE 5‑min auto‑default).
- `rideTimerIntervals`: `rideId → intervalId` (per‑second countdown emitter).
- `rideCustomerMap`: `rideId → customerId`.
- `ongoingRides`: `rideId → { driverId, customerId }` (drives live location relay).
- `requestTimeouts`: `requestId → timeoutId` (30‑sec request auto‑decline).

### 5.2 Connect & subscribe
- `user:connect` ({userId, userType}) → registers owner, marks `isOnline=true`, joins `user:<id>`.
- `customer:connect` ({customerId}) → registers customer; on reconnect it **replays** any still‑valid QUICKRIDE timers (`ride:timer-update`) and any pending driver requests (`request:new`) so the UI recovers state.
- `rides:subscribe` ({city}) → owner joins `rides:<city>` and `rides:all`.
- `rides:get-available` → returns current `PENDING` rides.

### 5.3 Customer creates a ride — `ride:create`
1. `createRide(rideInfo, customerLocation)` runs:
   - If `from`/`to` given, calls Google Maps (`calculateDistanceFromAddresses`) → `estimatedDistance` (km) + `estimatedDuration`; falls back to client‑supplied estimates on failure.
   - `determineRideType(distance)` → `OUTSTATION` if distance ≥ `OUTSTATION_DISTANCE_KM` (default 150), else `QUICKRIDE`.
   - Saves the Ride. **QUICKRIDE** → radius 10 km, timeout 300 000 ms, sets `expiresAt`. **OUTSTATION** → radius 100 km, no timeout.
   - `findNearbyOnlineUsers(...)` finds candidate owners (see §6.1).
2. Customer joins `ride:<id>` and gets `ride:created` with the nearby‑driver summary.
3. For each nearby owner, `checkUserDriversAvailability` is run; only **available** owners are kept (fail‑closed on error).
4. Available owners are notified:
   - via socket (`ride:new`, `ride:new-request`) if connected, and
   - via **FCM** push (`rideNotification`, high priority) — tokens are de‑duped, with a DB fallback to fetch missing `fcmToken`/`isSendNotification`/`lastLocation`, and a second distance filter against `lastLocation` within the search radius.
5. **QUICKRIDE only:** a per‑second `setInterval` emits `ride:timer-update` to the ride room, and a `setTimeout(timeout)` will `defaultRide(...)` the ride (status → `DEFAULTED`) if still `PENDING` when it fires, emitting `ride:timeout` and notifying offline customers via FCM.

### 5.4 Owner offers — `request:create`
1. Loads the ride; runs `checkDriverAvailability(driver, ride)` — rejects with `request:create-failed` if the chosen driver is blocked (see §6.2).
2. `createRequest(requestData)` saves the Request and computes the driver's `completedRidesCount` (`Ride.countDocuments({assingTo, COMPLETED})`).
3. Customer is notified `request:new` (socket) or FCM if offline.
4. **QUICKRIDE only:** `scheduleQuickrideRequestAutoDecline` arms a **30‑second** timer; if the customer doesn't act, the request auto‑declines (`request:declined` to driver, `request:expired` to customer, FCM fallbacks).
5. Owner gets `request:created`.

### 5.5 Customer accepts — `request:accept`
1. `approveRequest(requestId)` → request `APPROVED`.
2. Clears that request's 30‑sec timer, the ride's 5‑min timeout, and the countdown interval.
3. **All other** `PENDING` requests for the ride are declined (`declineRequest`, reason "Another request was accepted") and their drivers notified.
4. `updateRideStatus(rideId, 'ACCEPTED', fare, requestRaisedBy)`.
5. **Generates a 4‑digit `startOtp`** (`generateRideOTP(4)`), `startOtpExpiresAt = now + 24h`, and sets `assingTo` to the accepted driver.
6. Notifies: accepted driver (`request:accepted`), customer (`request:accept-success`, includes the OTP), the ride room (`ride:request-accepted`), and all owners (`ride:updated`). FCM fallbacks throughout.

### 5.6 OTP exchange & start — `ride:start`
- The customer holds the OTP; the driver collects it verbally at pickup. Helper events: `ride:request-otp` (customer asks how to start), `driver:get-otp` (assigned driver retrieves the OTP to read out).
- `ride:start` ({rideId, driverId, otp}): loads ride with `+startOtp`, requires status `ACCEPTED`, validates OTP value and expiry → status `ONGOING`, **unsets the OTP**, and registers the ride in `ongoingRides` to begin live tracking. Emits `ride:started` / `ride:start-success`.

### 5.7 Live location relay — `user:update-location`
Driver app emits `{userId, latitude, longitude, rideId}` frequently:
- Persists via `updateUserLocation` (writes GeoJSON `location` + `lastLocation`).
- If `rideId` is given and the ride is `ACCEPTED`/`ONGOING`, relays `driver:location-update` to the booking customer's socket. Otherwise falls back to scanning `ongoingRides` for a matching driver. Heavy console logging traces every hop.

### 5.8 Complete / cancel
- `ride:complete` → `updateRideStatus('COMPLETED')`, notifies customer + owners, clears `ongoingRides`/`rideCustomerMap`.
- `ride:cancel` → `cancelRide(rideId)` (blocks if already COMPLETED), cascades **all** PENDING/APPROVED requests to `DECLINED`, clears timers/tracking, notifies affected drivers and the customer.
- `request:decline` / `request:cancel` → single decline vs. decline‑all‑for‑ride, with driver notifications.
- `disconnect` → owners go offline; **customers do NOT auto‑cancel** — QUICKRIDE timers keep running so a reconnect can resume.

### 5.9 Ride status diagram

```
                 ┌────────── timeout (QUICKRIDE 5 min) ──────────┐
                 ▼                                                │
   create ──> PENDING ──accept──> ACCEPTED ──OTP──> ONGOING ──> COMPLETED
                 │                    │                 │
              cancel               cancel            (no cancel after start)
                 ▼                    ▼
             CANCELLED            CANCELLED
                 │
            (timeout) ─> DEFAULTED
```

---

## 6. Key business rules / algorithms

### 6.1 Nearby‑driver matching — `findNearbyOnlineUsers` (ride.service.js)
1. Build `busyDriverIds` from all rides in `PENDING/ACCEPTED/ONGOING` that have an `assingTo`.
2. Query online users (`isOnline:true`) with a populated fleet and a valid `lastLocation`.
3. Keep only owners who have **at least one driver not in `busyDriverIds`** (a "free" driver).
4. Compute **Haversine** distance from the customer to each owner; filter to within `radiusKm`; sort ascending; cap at `MAX_DRIVERS_TO_NOTIFY` (default 20).
5. **Fallback:** if nobody is inside the radius, return the nearest 20 regardless of radius.

### 6.2 Driver availability — `checkDriverAvailability` (ride.service.js) ⭐
Given a driver and the new ride:
- Pull the driver's active rides (`PENDING/ACCEPTED/ONGOING`).
- **QUICKRIDE rule:** if the driver has *any* active QUICKRIDE → **fully blocked** from all new rides.
- **OUTSTATION rule (3‑hour pre‑block):** for each active OUTSTATION ride, `blockStart = pickUpDateTime − 3h`; if `now ≥ blockStart` → blocked until that ride completes. (So a driver can take other work until 3 h before an outstation pickup.)
- Otherwise available.

`checkUserDriversAvailability` runs this across all of an owner's drivers and returns the list of available ones (owner is "available" if ≥1 driver is free). **Additionally, if the owner has *any* ride currently `ONGOING`, the owner is treated as unavailable and is not notified of new nearby rides at all** — even if another driver is free. This is what gates who gets notified in §5.3 and who can offer in §5.4.

### 6.3 Fare calculation — vehicle.controller.js + `vehicleTypes.json`
`POST /api/vehicles/calculate-fare` accepts either `{distanceKm, durationMinutes}` or `{origin, destination}` (geocoded via Google Maps). For each vehicle type in `config/vehicleTypes.json`:

```
totalFare = baseFare + (distanceKm × ratePerKm) + (durationMinutes × ratePerMinute)
```

Vehicle catalogue (currency INR): `bharat_mini`, `yaatri_mini`, `yaatri_sedan`, `yaatri_suv`, each with capacity, rates, base fare, icon, and feature list.

### 6.4 Timeouts (two distinct timers)
| Timer | Scope | Duration | Effect |
|---|---|---|---|
| Ride default | QUICKRIDE ride | `QUICKRIDE_TIMEOUT_MS` — **code uses 300 000 ms (5 min)**; `.env.example` lists 180 000 (3 min) | Ride → `DEFAULTED` if still `PENDING` |
| Request auto‑decline | QUICKRIDE request | 30 s (hard‑coded) | Request → `DECLINED` if customer doesn't respond |
| Stale‑request sweep | All PENDING requests | `REQUEST_TIMEOUT_MINUTES` (5) every `TIMEOUT_CHECK_INTERVAL` (60 s) | Old requests → `DECLINED` |

> ⚠️ The QUICKRIDE ride timeout is inconsistent between code (5 min) and `.env.example` (3 min) and README (3 min). Set `QUICKRIDE_TIMEOUT_MS` explicitly to avoid surprises.

### 6.5 OTP & auth
- **Login OTP** (`utils/otp.js`) uses the **2Factor.in** API (`sendOTP` → AUTOGEN2/3 by `OTP_DIGIT_LENGTH`, `verifyOTPWithPhoneNumber`). ⚠️ There is a **hard‑coded test bypass**: phone `6203821043` + OTP `123456` always verifies — remove before production.
- **Ride‑start OTP** is generated locally (`generateRideOTP`, 4 digits, `Math.random`‑based) and stored on the Ride (`select:false`, 24 h expiry).
- **JWT** (`config/jwt.config.js`): `generateToken(payload)` signs with `JWT_SECRET`/`JWT_EXPIRES_IN`; `verifyToken` decodes. The `auth.middleware.js` reads `Authorization: Bearer <token>`, attaches the decoded payload to `req.customer`, and returns 401 (missing) / 403 (invalid).

---

## 7. REST API surface

Mount prefixes (from `server.js`): rides → `/api`, customer → `/api/customer`, quickride → `/api/quickride`, vehicles → `/api/vehicles`, user → `/api/user`, app‑content → `/api/app-content`. Standard responses via `utils/responseHelper.js` (`{ success, message, data? }`).

### Customer auth & profile (`/api/customer`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/get-otp` | — | Send login OTP |
| POST | `/verify-otp` | — | Verify OTP; returns JWT + user, or `userStatus:404` for new users; updates `fcmToken` |
| POST | `/create-user` | — | Register customer (409 if phone exists), returns JWT |
| GET | `/profile/:customerId` | JWT | Get customer profile |
| PUT | `/update/:customerId` | JWT | Update `title`/`name`/`email` |

### Rides (`/api/rides…` under `/api`)
CRUD + queries: `POST /rides`, `GET /rides/:rideId`, `GET /rides` (filterable), `GET /rides/customer/:id`, `/driver/:id`, `/user/:id`, `GET /rides/pending/all`, `GET /rides/statistics/summary`, `GET /rides/customer/:id/history|active|recent-locations`. Mutations: `PUT /rides/:id/status|assign-driver|fare|cancel|complete|start`, `PUT /rides/:id`, `DELETE /rides/:id`. `complete` and `start` also emit socket events to customer + driver; `start` requires the 4‑digit OTP.

### Users — status/location (under `/api`)
`PUT /users/:userId/status`, `PUT /users/:userId/location`, `GET /users/nearby?latitude&longitude&radius&vehicleType`.

### Requests (under `/api`)
Full lifecycle: `POST /requests`, `GET /requests` (filterable) and by `driver`/`user`/`ride`, `pending/all`, `approved/all`, `check/:driverId/:rideId`, `user/:userId/active`, `user/:userId/check-active`, `statistics/summary`; `PUT /requests/:id/status|approve|decline|complete`, `PUT /requests/:id`; admin bulk ops `POST /requests/bulk/approve|decline`, `POST /requests/decline-timedout`, `DELETE /requests/:id`.

### Vehicles (`/api/vehicles`)
`GET /types`, `GET /types/:id`, `POST /calculate-fare`.

### User (owner) profile (`/api/user`)
`GET /profile/:userId` (JWT), `POST /update-profile-pic/:userId` (JWT + multer image upload to `/uploads`, jpeg/jpg/png/webp, 5 MB).

### QuickRides (`/api/quickride`)
`POST /add`, `GET /` (`?customerId`), `GET /:id`, `PATCH /:id`, `DELETE /:id` (duplicate tag → 400).

### App content (`/api/app-content`)
`GET /`, `GET /:type`, `POST /` (upsert — ⚠️ currently unauthenticated; restrict in production). Seeded via `node seedAppContent.js` (wipes and re‑inserts the 3 legal pages).

---

## 8. Notifications (FCM)

- `config/notification.config.js` → `generalNotification({userarray, title, body})`: simple multicast (`sendEachForMulticast`).
- `config/rideNotificaiton.js` → `rideNotification({userarray, title, body, data})`: data‑message variant; sanitizes FCM **reserved keys** (`from`, `notification`, etc. → `custom_*`), stringifies all data, high‑priority Android with 1 h TTL, and logs per‑token failures.
- Firebase Admin is initialized in `Firebase/firebase.js` from a service account built out of `FIREBASE_*` env vars in `Firebase/firebaseadmin.js` (private key newlines un‑escaped).
- The pattern throughout: **prefer socket if the user is connected, else fall back to FCM push.**

---

## 9. Configuration (`.env`)

See `.env.example`. Notable groups:
- **Server:** `PORT`, `NODE_ENV`, `MONGODB_URI`.
- **Auth:** `JWT_SECRET`, `JWT_EXPIRE`/`JWT_EXPIRES_IN`.
- **Ride tuning:** `OUTSTATION_DISTANCE_KM` (150), `QUICKRIDE_TIMEOUT_MS`, `OUTSTATION_TIMEOUT_MS`, `QUICKRIDE_SEARCH_RADIUS_KM` (10), `OUTSTATION_SEARCH_RADIUS_KM` (100), `MAX_DRIVERS_TO_NOTIFY` (20).
- **Requests:** `REQUEST_TIMEOUT_MINUTES` (5), `TIMEOUT_CHECK_INTERVAL` (60000).
- **CORS:** `CORS_ORIGIN`, `SOCKET_CORS_ORIGIN`.
- **Maps:** `GOOGLE_MAPS_API_KEY`.
- **OTP:** `OTP_KEY`, `OTP_DIGIT_LENGTH`.
- **Firebase:** the 9 `FIREBASE_*` service‑account vars.

---

## 10. Directory map

```
server.js                  App bootstrap, middleware, routers, background sweeper
config/
  dbConnection.js          Mongoose connection
  jwt.config.js            sign/verify JWT
  socket.config.js         ⭐ ALL real-time ride logic + in-memory state
  notification.config.js   generalNotification (FCM multicast)
  rideNotificaiton.js      rideNotification (FCM data message)
  vehicleTypes.json        Fare catalogue
controllers/               REST handlers (appContent, customer, quickride, request, ride, user, vehicle)
router/                    Express routers per domain
service/
  ride.service.js          ⭐ matching, availability, ride CRUD/stat
  request.service.js       request lifecycle + timeout sweep
  quickride.service.js     saved-route CRUD
models/                    Mongoose schemas (user, customer, driver, vehicle, rides, requests, quickride, appContent)
middleware/                auth.middleware.js (JWT), logger.js
utils/                     googleMaps.js, otp.js (2Factor.in), responseHelper.js
Firebase/                  firebase.js + firebaseadmin.js (admin SDK init)
seedAppContent.js          Seed legal pages
*.md / *.html              Frontend integration guides & socket test pages
```

---

## 11. Notable issues & gotchas

- **OTP test backdoor** in `utils/otp.js` (`6203821043` / `123456`) — must be removed for production.
- **QUICKRIDE timeout mismatch:** code 5 min vs `.env.example`/README 3 min.
- **Most REST routes are unauthenticated** — only a few customer/user routes use `verifyTokenMiddleware`. Ride/request/admin/app‑content endpoints are open. Add auth + role checks before production.
- **In‑memory socket state** (`activeConnections`, timers, `ongoingRides`) is per‑process — horizontal scaling needs a shared adapter (e.g. Redis) and an external timer store.
- **Schema typos baked into the API:** `assingTo` (Ride) and `carAleartFor`/`cityAleartFor` (User) are real field names clients must use.
- `Driver` and `Vehicle` use `strict:false`, so undeclared fields silently persist.
- `app-content` upsert (`POST`) is public and can overwrite legal pages.
```

