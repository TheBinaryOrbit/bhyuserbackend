import fs from 'fs';

// Fix ride.controller.js
let rideContent = fs.readFileSync('controllers/ride.controller.js', 'utf8');
rideContent = rideContent.replace(/sendResponse/g, 'sendSuccess');
fs.writeFileSync('controllers/ride.controller.js', rideContent);

// Fix request.controller.js
let requestContent = fs.readFileSync('controllers/request.controller.js', 'utf8');
requestContent = requestContent.replace(/sendResponse/g, 'sendSuccess');
fs.writeFileSync('controllers/request.controller.js', requestContent);

console.log('✓ Fixed sendResponse -> sendSuccess in both controllers');
