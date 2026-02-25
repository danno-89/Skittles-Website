/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Global options removed as we are using v1 API natively

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const admin = require('firebase-admin');
admin.initializeApp();

const playerFunctions = require('./player-functions');
const adminFunctions = require('./admin-functions');

exports.registerPlayer = playerFunctions.registerPlayer;
exports.verifySponsor = playerFunctions.verifySponsor;
exports.sendAdminEmail = adminFunctions.sendAdminEmail;
exports.handleUnsubscribe = adminFunctions.handleUnsubscribe;
