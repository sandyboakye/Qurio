const functions = require('firebase-functions');
const app = require('./src/app');

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);
