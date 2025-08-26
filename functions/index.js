// index.js

// Initialize Firebase Admin SDK
const admin = require('firebase-admin');
admin.initializeApp();

// Load functions from their respective files
const playerFunctions = require('./player-functions');
const adminFunctions = require('./admin-functions');

// Export all functions for deployment
exports.registerPlayer = playerFunctions.registerPlayer;

// Admin functions
exports.bootstrapFirstAdmin = adminFunctions.bootstrapFirstAdmin;
exports.grantCommitteeRole = adminFunctions.grantCommitteeRole;
exports.getCommitteeMembers = adminFunctions.getCommitteeMembers;
exports.setCommitteeClaimOnCreate = adminFunctions.setCommitteeClaimOnCreate;