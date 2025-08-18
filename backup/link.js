
import { auth, db } from './firebase.config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const authIdSpan = document.getElementById('authId');
    const emailSpan = document.getElementById('email');
    const playerDocumentMessageSpan = document.getElementById('player-document-message');
    let currentUser = null;

    const formatDateToDDMMYYYY = (isoDate) => {
        if (!isoDate) return '';
        const parts = isoDate.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return isoDate;
    };

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            authIdSpan.textContent = user.uid;
            emailSpan.textContent = user.email;
            
            const urlParams = new URLSearchParams(window.location.search);
            const emailFromQuery = urlParams.get('email');

            if (emailFromQuery) {
                findPlayerByEmail(emailFromQuery);
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    async function findPlayerByEmail(email) {
        const playersRef = collection(db, "players_private");
        const q = query(playersRef, where("email", "==", email));
        
        try {
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                playerDocumentMessageSpan.textContent = "No player profile found with this email.";
            } else {
                const playerDoc = querySnapshot.docs[0];
                playerDocumentMessageSpan.innerHTML = `
                    <p>Player profile found. Please enter your date of birth to verify your identity.</p>
                    <div class="form-group">
                        <label for="dob">Date of Birth</label>
                        <input type="date" id="dob" name="dob" required>
                    </div>
                    <button id="verifyAndLink" class="btn btn-primary">Verify and Link</button>
                `;
                
                document.getElementById('verifyAndLink').addEventListener('click', async () => {
                    const dobInputRaw = document.getElementById('dob').value;
                    const dobInputFormatted = formatDateToDDMMYYYY(dobInputRaw);
                    const playerDob = playerDoc.data().dob;

                    if (dobInputFormatted === playerDob) {
                        
                        // --- NEW DIAGNOSTIC LOG ---
                        console.log("Verification successful. Preparing to update Firestore document.");
                        console.log("Data from Firestore (resource.data):", playerDoc.data());
                        console.log("This is the object the security rules will evaluate.");
                        // --- END DIAGNOSTIC LOG ---

                        try {
                            await updateDoc(doc(db, "players_private", playerDoc.id), {
                                authId: currentUser.uid
                            });

                            playerDocumentMessageSpan.textContent = "Account linked successfully! Redirecting...";
                            playerDocumentMessageSpan.style.color = 'green';
                            setTimeout(() => {
                                window.location.href = 'profile.html';
                            }, 3000);

                        } catch (error) {
                            console.error("Firestore Update Error:", error);
                            playerDocumentMessageSpan.textContent = "Verification succeeded, but the final update failed. Check the console for a 'Firestore Update Error'.";
                            playerDocumentMessageSpan.style.color = 'red';
                        }
                    } else {
                        playerDocumentMessageSpan.textContent = "Date of birth does not match. Please try again.";
                        playerDocumentMessageSpan.style.color = 'red';
                    }
                });
            }
        } catch (error) {
            console.error("Error Finding Player:", error);
        }
    }
});
