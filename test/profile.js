import { auth, db, doc, getDoc, updateDoc, collection, getDocs, onAuthStateChanged } from './firebase.config.js';

let user = null;
let publicData = null;
let privateData = null;
let teamsMap = new Map(); // To store teamId -> teamName

const profileForm = document.getElementById('profile-form');
const messageDiv = document.getElementById('message');

/**
 * Fetches all teams and stores them in a Map for easy lookup.
 */
const populateTeamsMap = async () => {
    try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        teamsSnapshot.forEach(doc => {
            teamsMap.set(doc.id, doc.data().name);
        });
    } catch (error) {
        console.error("Error populating teams map:", error);
    }
};

/**
 * Formats a Firestore Timestamp into a readable date string.
 * @param {Timestamp} timestamp The Firestore Timestamp to format.
 * @returns {string} The formatted date string (e.g., "12 Jan 23") or 'N/A'.
 */
const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};


/**
 * Calculates the number of days until a registration expires.
 * @param {Timestamp} expiryTimestamp The Firestore Timestamp of the expiry date.
 * @returns {string} The number of days remaining, or "Expired".
 */
const calculateDaysToExpiry = (expiryTimestamp) => {
    if (!expiryTimestamp || typeof expiryTimestamp.toDate !== 'function') return 'N/A';
    const expiryDate = expiryTimestamp.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = expiryDate.getTime() - today.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return days < 0 ? 'Expired' : days.toString();
};


const showMessage = (msg, isError = false) => {
    messageDiv.textContent = msg;
    messageDiv.className = isError ? 'message error' : 'message success';
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 4000);
};

const populateForm = () => {
    if (publicData) {
        document.getElementById('first-name').textContent = publicData.firstName || 'N/A';
        document.getElementById('last-name').textContent = publicData.lastName || 'N/A';
        document.getElementById('team-name').textContent = teamsMap.get(publicData.teamId) || 'N/A';
        document.getElementById('division').textContent = publicData.division || 'N/A';
        document.getElementById('role').textContent = publicData.role || 'N/A';
        
        // Populate Registration Details
        document.getElementById('registration-date').textContent = formatDate(publicData.registerDate);
        document.getElementById('recent-fixture').textContent = formatDate(publicData.recentFixture);
        document.getElementById('register-expiry').textContent = formatDate(publicData.registerExpiry);
        document.getElementById('days-to-expiry').textContent = calculateDaysToExpiry(publicData.registerExpiry);

    }
    if (privateData) {
        document.getElementById('email').textContent = privateData.email || 'N/A';
        document.getElementById('dob').textContent = privateData.dob ? privateData.dob.toDate().toLocaleDateString('en-GB') : 'N/A';
        document.getElementById('mobile-no').textContent = privateData.mobileNo || 'N/A';
        document.getElementById('home-no').textContent = privateData.homeNo || 'N/A';
        if (privateData.address) {
            const address = privateData.address;
            document.getElementById('address-line-1').textContent = address.line1 || '';
            document.getElementById('address-line-2').textContent = address.line2 || '';
            document.getElementById('address-line-3').textContent = address.line3 || '';
            document.getElementById('parish').textContent = address.parish || '';
            document.getElementById('postcode').textContent = address.postCode || '';
        }
    }
};

document.addEventListener('authReady', async (e) => {
    user = e.detail.user;
    publicData = e.detail.publicData;
    privateData = e.detail.privateData;

    if (!user || !publicData || !privateData) {
        if (profileForm) profileForm.style.display = 'none';
        return;
    }
    
    if (profileForm) {
        profileForm.style.display = 'block';
        await populateTeamsMap();
        populateForm();
    }
});