import { db, collection, getDocs, doc, setDoc, query, where, getDoc } from './firebase.config.js';

async function createCommitteeRoles() {
    console.log("Starting role creation process...");

    try {
        // 1. Find all players who are marked as committee members
        // This query now finds documents where the 'committee' field exists and is not an empty string.
        const publicPlayersRef = collection(db, "players_public");
        const committeeQuery = query(publicPlayersRef, where("committee", ">", ""));
        const committeeSnapshot = await getDocs(committeeQuery);

        if (committeeSnapshot.empty) {
            console.warn("No players found with a 'committee' role in players_public.");
            alert("Could not find any committee members in the database. The script will stop. Please check your data in Firestore.");
            return;
        }

        console.log(`Found ${committeeSnapshot.docs.length} committee members in players_public.`);

        // 2. For each committee member, find their private authId
        for (const publicDoc of committeeSnapshot.docs) {
            const publicPlayerId = publicDoc.id;
            console.log(`Processing ${publicDoc.data().firstName} ${publicDoc.data().lastName} (Role: ${publicDoc.data().committee}, Public ID: ${publicPlayerId})`);
            
            const privateDocRef = doc(db, "players_private", publicPlayerId);
            const privateDocSnap = await getDoc(privateDocRef);

            if (!privateDocSnap.exists()) {
                console.error(`Could not find a matching private profile for public ID: ${publicPlayerId}`);
                continue;
            }

            // 3. Create a new document in the 'users' collection
            const privateData = privateDocSnap.data();
            const authId = privateData.authId;
            if (!authId) {
                 console.error(`AuthId is missing for private profile linked to public ID: ${publicPlayerId}`);
                 continue;
            }

            const userRoleRef = doc(db, "users", authId);
            await setDoc(userRoleRef, {
                committee: true, // Set a simple boolean flag for the security rules
                role: publicDoc.data().committee, // Also store the specific role for reference
                email: privateData.email,
                publicId: publicPlayerId
            });

            console.log(`Successfully created role document for Auth ID: ${authId}`);
        }

        console.log("Role creation process finished.");
        alert("Committee roles have been created in the 'users' collection. You should now have the correct permissions.");

    } catch (error) {
        console.error("Error creating committee roles:", error);
        alert("An error occurred. Check the console for details.");
    }
}

// Expose the function to the window so it can be called from the console
window.createCommitteeRoles = createCommitteeRoles;

console.log("Admin setup script loaded.");
console.log("To create committee roles, type 'createCommitteeRoles()' in the console and press Enter.");
