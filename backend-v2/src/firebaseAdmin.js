const admin = require('firebase-admin');
// const serviceAccount = require('../serviceAccountKey.json'); // Removed to prevent crash if file missing

// Initialize Firebase Admin
// If running in Cloud Functions, credential.applicationDefault() or no args often works.
// But for local dev we might need service account.
// However, since we are deploying to Cloud Functions, we can just use default app.

if (!admin.apps.length) {
    admin.initializeApp();
}

module.exports = admin;
