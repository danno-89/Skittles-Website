const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const db = admin.firestore();

function parseDateToTimestamp(dateString) {
    if (!dateString) return null;

    // Handle the dd/mm/yyyy format first for DOB parsing (strict check)
    if (typeof dateString === 'string' && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
            const year = parseInt(parts[2], 10);

            // Validate the date naturally (e.g., month max 11, day max 31)
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                return admin.firestore.Timestamp.fromDate(new Date(year, month, day));
            }
        }
    }

    // Fallback if the date is sent from the client as an ISO string (e.g., expiryDate)
    const parsedTime = Date.parse(dateString);
    if (!isNaN(parsedTime)) {
        return admin.firestore.Timestamp.fromDate(new Date(parsedTime));
    }

    return null;
}


function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function generateUniquePlayerId(firstName, lastName) {
    const capitalizedFirstName = capitalizeFirstLetter(firstName);
    const capitalizedLastName = capitalizeFirstLetter(lastName);
    const baseId = `${capitalizedFirstName}-${capitalizedLastName}`;

    const playersRef = db.collection("players_public");

    const querySnapshot = await playersRef
        .where(admin.firestore.FieldPath.documentId(), ">=", baseId)
        .where(admin.firestore.FieldPath.documentId(), "<", baseId + '\uf8ff')
        .get();

    let maxNumber = 0;
    if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
            const docId = doc.id;
            const numericPart = docId.substring(baseId.length);
            const num = parseInt(numericPart, 10);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        });
    }

    const newNumber = maxNumber + 1;
    const paddedNumber = newNumber.toString().padStart(3, '0');
    return `${baseId}${paddedNumber}`;
}

exports.verifySponsor = onCall({ region: "europe-west1" }, async (request) => {
    const { sponsorId, sponsorDob } = request.data;

    if (!sponsorId || !sponsorDob) {
        return { success: false, error: 'Missing sponsor details.' };
    }

    const expectedDobTimestamp = parseDateToTimestamp(sponsorDob);
    if (!expectedDobTimestamp) {
        return { success: false, error: 'Invalid date format.' };
    }

    try {
        const sponsorRef = db.collection('players_private').doc(sponsorId);
        const sponsorDoc = await sponsorRef.get();

        if (!sponsorDoc.exists) {
            return { success: false, error: 'Sponsor not found.' };
        }

        const storedDobTimestamp = sponsorDoc.data().dob;

        if (!storedDobTimestamp) {
            return { success: false, error: 'Sponsor DOB record unavailable.' };
        }

        const storedDate = storedDobTimestamp.toDate();
        const expectedDate = expectedDobTimestamp.toDate();

        if (storedDate.getFullYear() === expectedDate.getFullYear() &&
            storedDate.getMonth() === expectedDate.getMonth() &&
            storedDate.getDate() === expectedDate.getDate()) {
            return { success: true };
        } else {
            return { success: false, error: 'Authentication failed.' };
        }
    } catch (err) {
        console.error("Error verifying sponsor:", err);
        return { success: false, error: 'Server error verifying sponsor.' };
    }
});

exports.registerPlayer = onCall({ region: "europe-west1" }, async (request) => {
    let {
        firstName, lastName, teamId, division, address, dob, email, homeNo, mobileNo, authId, sponsorId, sponsorName
    } = request.data;

    const dobTimestamp = parseDateToTimestamp(dob);
    if (!dobTimestamp) {
        throw new HttpsError('invalid-argument', 'Invalid date of birth format. Please use dd/mm/yyyy.');
    }

    const registrationDate = new Date();
    const expiryDate = new Date(registrationDate);
    expiryDate.setDate(expiryDate.getDate() + 365);
    const expiryTimestamp = admin.firestore.Timestamp.fromDate(expiryDate);

    const uniqueId = await generateUniquePlayerId(firstName, lastName);

    const privatePlayerData = {
        address: {
            line1: address.line1, line2: address.line2, line3: address.line3,
            parish: address.parish, postCode: address.postCode,
        },
        dob: dobTimestamp, email: email, homeNo: homeNo, mobileNo: mobileNo,
    };

    if (authId) {
        privatePlayerData.authId = authId;
    }

    if (sponsorId) {
        privatePlayerData.sponsorId = sponsorId;
        privatePlayerData.sponsorName = sponsorName;
    }

    const publicPlayerData = {
        firstName: capitalizeFirstLetter(firstName), lastName: capitalizeFirstLetter(lastName),
        teamId, division, role: "Player", private_doc_id: uniqueId,
        registerDate: admin.firestore.Timestamp.fromDate(registrationDate),
        registerExpiry: expiryTimestamp,
    };

    const batch = db.batch();
    const privateRef = db.collection("players_private").doc(uniqueId);
    batch.set(privateRef, privatePlayerData);
    const publicRef = db.collection("players_public").doc(uniqueId);
    batch.set(publicRef, publicPlayerData);

    await batch.commit();
    return { success: true, playerId: uniqueId };
});