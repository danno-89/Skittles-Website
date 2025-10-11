const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.rescheduleFixture = onCall({ region: "europe-west1" }, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "This function must be called while authenticated."
        );
    }

    // 2. Argument Validation
    const { postponedFixtureId, targetSlotId } = request.data;
    if (!postponedFixtureId || !targetSlotId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Required arguments 'postponedFixtureId' and 'targetSlotId' are missing."
        );
    }
    
    // Self-rescheduling is not allowed
    if (postponedFixtureId === targetSlotId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "A fixture cannot be rescheduled into its own slot."
        );
    }

    const db = admin.firestore();
    const batch = db.batch();

    try {
        // 3. Get Document References
        const fixtureToMoveRef = db.collection("match_results").doc(postponedFixtureId);
        const targetSlotRef = db.collection("match_results").doc(targetSlotId);

        const [fixtureToMoveSnap, targetSlotSnap] = await Promise.all([
            fixtureToMoveRef.get(),
            targetSlotRef.get(),
        ]);

        // 4. Data Existence and Status Validation
        if (!fixtureToMoveSnap.exists) throw new functions.https.HttpsError("not-found", "The fixture to be moved does not exist.");
        if (!targetSlotSnap.exists) throw new functions.https.HttpsError("not-found", "The target slot does not exist.");

        const fixtureToMoveData = fixtureToMoveSnap.data();
        const targetSlotData = targetSlotSnap.data();

        if (fixtureToMoveData.status !== 'postponed') {
            throw new functions.https.HttpsError("failed-precondition", "The fixture to be moved is not in a 'postponed' state.");
        }
        if (targetSlotData.status !== 'spare' && targetSlotData.status !== 'postponed') {
            throw new functions.https.HttpsError("failed-precondition", "The target slot is not a 'spare' or 'postponed' fixture.");
        }

        const originalFixtureDate = fixtureToMoveData.scheduledDate;
        const targetSlotDate = targetSlotData.scheduledDate;
        
        // 5. Core Rescheduling Logic
        if (targetSlotData.status === 'spare') {
            batch.update(fixtureToMoveRef, {
                originalDate: originalFixtureDate,
                scheduledDate: targetSlotDate,
                status: 'rescheduled',
                postponedBy: admin.firestore.FieldValue.delete(),
                postponedDate: admin.firestore.FieldValue.delete()
            });
            batch.delete(targetSlotRef);

        } else if (targetSlotData.status === 'postponed') {
            batch.update(fixtureToMoveRef, {
                originalDate: originalFixtureDate,
                scheduledDate: targetSlotDate,
                status: 'rescheduled',
                postponedBy: admin.firestore.FieldValue.delete(),
                postponedDate: admin.firestore.FieldValue.delete()
            });
            batch.update(targetSlotRef, {
                originalDate: targetSlotDate,
                scheduledDate: originalFixtureDate,
                status: 'rescheduled',
                postponedBy: admin.firestore.FieldValue.delete(),
                postponedDate: admin.firestore.FieldValue.delete()
            });
        }
        
        await batch.commit();

        return { success: true, message: "Fixture has been successfully rescheduled." };

    } catch (error) {
        console.error("Critical error in rescheduleFixture function:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred during the reschedule process.");
    }
});
