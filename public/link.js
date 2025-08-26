import { db, collection, query, where, getDocs, doc, updateDoc, getDoc, auth, onAuthStateChanged } from './firebase.config.js';

document.addEventListener('DOMContentLoaded', () => {
    const messageContainer = document.getElementById('message-container');
    const resultsContainer = document.getElementById('results-container');
    let currentUser = null;
    const teamsMap = new Map();

    async function initialize() {
        // Fetch all teams to map IDs to names
        try {
            const teamsSnapshot = await getDocs(collection(db, "teams"));
            teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
        } catch (error) {
            console.error("Failed to fetch teams:", error);
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                const urlParams = new URLSearchParams(window.location.search);
                const email = urlParams.get('email');
                const firstname = urlParams.get('firstname');
                const lastname = urlParams.get('lastname');

                if (email && firstname && lastname) {
                    findPotentialMatches(email, firstname, lastname);
                } else {
                    messageContainer.textContent = "Could not find user details to link. Please start again.";
                }
            } else {
                window.location.href = 'create.html';
            }
        });
    }

    async function findPotentialMatches(email, firstname, lastname) {
        messageContainer.textContent = "Searching for your player profile...";
        resultsContainer.innerHTML = '';
        try {
            const playersRef = collection(db, "players_public");
            const q = query(playersRef, 
                where("firstName", "==", firstname),
                where("lastName", "==", lastname)
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                messageContainer.textContent = "No matching player profile was found. Please check the name you registered with, or contact a committee member for assistance.";
                return;
            }
            
            messageContainer.textContent = "We found the following potential matches. Please select your profile to proceed with verification.";
            querySnapshot.forEach(doc => {
                const playerData = doc.data();
                const teamName = teamsMap.get(playerData.teamId) || 'Unknown Team';
                const resultElement = document.createElement('div');
                resultElement.className = 'result-item';
                resultElement.innerHTML = `
                    <p><strong>Name:</strong> ${playerData.firstName} ${playerData.lastName}</p>
                    <p><strong>Team:</strong> ${teamName}</p>
                    <button data-player-id="${doc.id}">This is me</button>
                `;
                resultsContainer.appendChild(resultElement);
            });
            setupVerificationListeners();
        } catch (error) {
            console.error("Error searching for player:", error);
            messageContainer.textContent = "An error occurred while searching. Please try again.";
        }
    }

    function setupVerificationListeners() {
        const buttons = resultsContainer.querySelectorAll('button[data-player-id]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const playerId = e.target.dataset.playerId;
                promptForVerification(playerId);
            });
        });
    }

    function promptForVerification(playerId) {
        messageContainer.innerHTML = `
            <p>To verify your identity, please provide at least <strong>two</strong> of the following details:</p>
        `;
        resultsContainer.innerHTML = `
            <div class="form-group">
                <label for="dob">Date of Birth (dd/mm/yyyy)</label>
                <input type="text" id="dob">
            </div>
            <div class="form-group">
                <label for="postcode">Postcode</label>
                <input type="text" id="postcode">
            </div>
            <div class="form-group">
                <label for="mobile">Mobile Number</label>
                <input type="text" id="mobile">
            </div>
             <div class="form-group">
                <label for="home">Home/Work Number</label>
                <input type="text" id="home">
            </div>
            <button id="verify-btn" data-player-id="${playerId}">Verify and Link Account</button>
        `;
        
        setupDobInput();
        setupPhoneNumberInput('mobile');
        setupPhoneNumberInput('home');
        setupPostcodeInput();
        
        const verifyBtn = document.getElementById('verify-btn');
        verifyBtn.addEventListener('click', handleVerification);
    }

    function formatTimestampToDDMMYYYY(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') return null;
        const date = timestamp.toDate();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    async function handleVerification(e) {
        const playerId = e.target.dataset.playerId;
        const dobInput = document.getElementById('dob').value.trim();
        const postcodeInput = document.getElementById('postcode').value.trim();
        const mobileInput = document.getElementById('mobile').value.trim();
        const homeInput = document.getElementById('home').value.trim();

        try {
            const privateDocRef = doc(db, "players_private", playerId);
            const privateDocSnap = await getDoc(privateDocRef);

            if (!privateDocSnap.exists()) {
                messageContainer.textContent = "Could not find your private player data. Please contact a committee member.";
                return;
            }

            const privateData = privateDocSnap.data();
            let successfulVerifications = 0;

            if (dobInput) {
                const firestoreDobString = formatTimestampToDDMMYYYY(privateData.dob);
                if (firestoreDobString === dobInput) {
                    successfulVerifications++;
                }
            }
            if (postcodeInput && privateData.address?.postCode) {
                if (postcodeInput.toUpperCase() === privateData.address.postCode.toUpperCase()) {
                    successfulVerifications++;
                }
            }
            if (mobileInput && privateData.mobileNo) {
                if (mobileInput === privateData.mobileNo) {
                    successfulVerifications++;
                }
            }
            if (homeInput && privateData.homeNo) {
                if (homeInput === privateData.homeNo) {
                    successfulVerifications++;
                }
            }

            if (successfulVerifications >= 2) {
                await updateDoc(privateDocRef, { authId: currentUser.uid });
                messageContainer.textContent = "Account linked successfully! You will be redirected to your profile.";
                setTimeout(() => { window.location.href = 'profile.html'; }, 3000);
            } else {
                messageContainer.textContent = "The verification details did not match our records. Please try again.";
            }
        } catch (error) {
            console.error("Error during verification:", error);
            messageContainer.textContent = "An error occurred during verification. Please try again.";
        }
    }
    
    // --- HELPER FUNCTIONS FOR INPUT MASKING ---

    function setupDobInput() {
        const dobInput = document.getElementById('dob');
        if (!dobInput) return;
        dobInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) value = `${value.substring(0, 2)}/${value.substring(2)}`;
            if (value.length > 5) value = `${value.substring(0, 5)}/${value.substring(5, 9)}`;
            e.target.value = value;
        });
    }

    function setupPhoneNumberInput(inputId) {
        const phoneInput = document.getElementById(inputId);
        if (!phoneInput) return;
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 5) value = `${value.substring(0, 5)} ${value.substring(5, 11)}`;
            e.target.value = value;
        });
    }
    
    function setupPostcodeInput() {
        const postcodeInput = document.getElementById('postcode');
        if (!postcodeInput) return;
        postcodeInput.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase().replace(/\s/g, '');
            if (value.length > 3) value = `${value.substring(0, 3)} ${value.substring(3, 6)}`;
            e.target.value = value.trim();
        });
    }

    initialize();
});