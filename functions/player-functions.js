const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

function parseDateToTimestamp(dateString) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return admin.firestore.Timestamp.fromDate(new Date(year, month, day));
        }
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

exports.registerPlayer = functions.https.onCall(async (data, context) => {
    let {
        firstName, lastName, teamId, division, address, dob, email, homeNo, mobileNo, authId,
    } = data;

    const dobTimestamp = parseDateToTimestamp(dob);
    if (!dobTimestamp) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date of birth format. Please use dd/mm/yyyy.');
    }
    
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

    const publicPlayerData = {
        firstName: capitalizeFirstLetter(firstName), lastName: capitalizeFirstLetter(lastName),
        teamId, division, role: "Player", private_doc_id: uniqueId,
        registerDate: admin.firestore.Timestamp.now(),
    };

    const batch = db.batch();
    const privateRef = db.collection("players_private").doc(uniqueId);
    batch.set(privateRef, privatePlayerData);
    const publicRef = db.collection("players_public").doc(uniqueId);
    batch.set(publicRef, publicPlayerData);

    await batch.commit();
    return { success: true, playerId: uniqueId };
});