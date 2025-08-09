const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getCommitteeMembers = functions.https.onCall(async (data, context) => {
  // Optional: Add authentication check if you want to restrict access
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     "unauthenticated",
  //     "The function must be called while authenticated."
  //   );
  // }

  try {
    // 1. Fetch all teams for an efficient lookup
    const teamsSnapshot = await db.collection("teams").get();
    const teamsMap = new Map();
    teamsSnapshot.forEach((doc) => {
      teamsMap.set(doc.id, doc.data().name);
    });

    // 2. Fetch all public player data for committee members
    const publicPlayersSnapshot = await db
      .collection("players_public")
      .where("committee", "!=", "")
      .get();
      
    const committeeMembersPromises = [];

    publicPlayersSnapshot.forEach((publicDoc) => {
      const playerData = publicDoc.data();
      const playerId = publicDoc.id;

      // Create a promise to fetch all related data for this member
      const memberPromise = async () => {
        // 3. Securely fetch the corresponding private data for contact details
        const privateDocRef = db.collection("players_private").doc(playerId);
        const privateDocSnap = await privateDocRef.get();
        const privateData = privateDocSnap.exists() ? privateDocSnap.data() : {};

        // 4. Look up the team name from the map
        const teamRef = playerData.team;
        const teamName =
          teamRef && teamsMap.has(teamRef.id) ?
            teamsMap.get(teamRef.id) :
            "N/A";

        // 5. Return a combined object with all necessary data
        return {
          id: playerId,
          name: `${playerData.firstName || ""} ${playerData.lastName || ""}`.trim(),
          role: playerData.committee,
          team: teamName,
          mobileNo: privateData.mobileNo || null,
        };
      };
      committeeMembersPromises.push(memberPromise());
    });

    // Wait for all the data to be fetched and combined
    const committeeMembers = await Promise.all(committeeMembersPromises);
    
    return committeeMembers;
  } catch (error) {
    console.error("Error fetching committee members:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while fetching committee data."
    );
  }
});
