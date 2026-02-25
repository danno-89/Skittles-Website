const { onCall, HttpsError } = require("firebase-functions/v2/https");
const v1functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const db = admin.firestore();

// Configure the email transport using Gmail (requires App Password)
// Note: We use environment variables for sensitive credentials in production,
// but for this implementation we'll read from config or expect placeholders to be set.
// User will need to set: firebase functions:config:set gmail.email="user@gmail.com" gmail.password="app-password"
const getSchema = () => {
    return {
        email: v1functions.config().gmail?.email,
        password: v1functions.config().gmail?.password
    };
};

const createTransporter = () => {
    const config = getSchema();
    if (!config.email || !config.password) {
        console.error("Gmail credentials not configured. Please set gmail.email and gmail.password.");
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.email,
            pass: config.password
        }
    });
};

/**
 * Checks if the requesting user is an admin (committee member).
 */
async function isCommitteeMember(uid) {
    if (!uid) return false;
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data().committee === true;
}

exports.sendAdminEmail = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { subject, body, testMode } = request.data;

    // 1. Verify Authorization
    const authorized = await isCommitteeMember(request.auth.uid);
    if (!authorized) {
        throw new HttpsError('permission-denied', 'Only committee members can send emails.');
    }

    const transporter = createTransporter();
    if (!transporter) {
        throw new functions.https.HttpsError('failed-precondition', 'Email configuration missing.');
    }

    // 2. Fetch Recipients
    let recipients = [];
    if (testMode) {
        // Send only to the caller
        recipients.push({ email: request.auth.token.email, id: request.auth.uid });
    } else {
        // Fetch all consenting players
        // We need to query players_private where consent is NOT 'No'
        // Since we want to be permissive with "Yes", "True", etc., checking != "No" might be safer
        // But Firestore doesn't support !=. So we'll fetch all and filter in memory or check for explicit "Yes"/"True" if index allows.
        // Let's fetch all private players and filter for consent != 'No' and != false and has email.
        const snapshot = await db.collection('players_private').get();
        snapshot.forEach(doc => {
            const pData = doc.data();
            const consentVal = pData.Consent || pData.COnsent || pData.consent;
            const hasConsented = consentVal && String(consentVal).toLowerCase() !== 'no' && String(consentVal).toLowerCase() !== 'false';

            if (pData.email && hasConsented) {
                recipients.push({ email: pData.email, id: doc.id });
            }
        });
    }

    // 3. Send Emails
    let sentCount = 0;
    let errors = 0;

    // We'll send individually to allow custom unsubscribe links per user
    const emailPromises = recipients.map(async (recipient) => {
        const unsubscribeLink = `https://${process.env.GCLOUD_PROJECT}.web.app/unsubscribe.html?uid=${recipient.id}`;

        const htmlBody = `
            <div style="font-family: 'Outfit', sans-serif; color: #333;">
                ${body}
                <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #888;">
                    You are receiving this email because you are a registered player of the Sarnia Skittles Club.
                    <br>
                    <a href="${unsubscribeLink}" style="color: #666;">Unsubscribe</a> from future emails.
                </p>
            </div>
        `;

        const mailOptions = {
            from: `Sarnia Skittles Club <${getSchema().email}>`,
            to: recipient.email,
            subject: subject,
            html: htmlBody
        };

        try {
            await transporter.sendMail(mailOptions);
            sentCount++;
        } catch (error) {
            console.error(`Failed to send to ${recipient.email}:`, error);
            errors++;
        }
    });

    await Promise.all(emailPromises);

    return { success: true, sent: sentCount, errors: errors };
});

exports.handleUnsubscribe = onCall({ region: "europe-west1" }, async (request) => {
    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'Missing User ID.');
    }

    try {
        await db.collection('players_private').doc(uid).update({
            Consent: "No"
        });
        return { success: true };
    } catch (error) {
        console.error("Unsubscribe failed:", error);
        throw new HttpsError('internal', 'Failed to update subscription status.');
    }
});
