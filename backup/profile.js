import { authReady } from './auth-manager.js';
import { db, doc, getDoc } from './firebase.config.js';

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabPanes.forEach(pane => {
                if (pane) {
                    pane.id === `${tabName}-content` ? pane.classList.add('active') : pane.classList.remove('active');
                }
            });
        });
    });
}

// --- NEW: Custom Date Formatting Function ---
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    const day = date.getDate();
    const year = date.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month} ${year}`;
};
// --- END: Custom Date Formatting Function ---

async function displayProfileData({ publicData, privateData }) {
    const populateField = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'N/A';
        }
    };
    
    if (publicData) {
        populateField('first-name', publicData.firstName);
        populateField('last-name', publicData.lastName);
        populateField('role', publicData.role);
        populateField('registration-date', formatDate(publicData.registerDate));
        populateField('recent-fixture', formatDate(publicData.recentFixture));
        populateField('division', publicData.division);

        if (publicData.teamId) {
            const teamDocSnap = await getDoc(doc(db, 'teams', publicData.teamId));
            populateField('team-name', teamDocSnap.exists() ? teamDocSnap.data().name : 'Unknown Team');
        }
    }
    
    if (privateData) {
        populateField('email', privateData.email);
        populateField('dob', formatDate(privateData.dob));
        populateField('mobile-no', privateData.mobileNo);
        populateField('home-no', privateData.homeNo);

        if (privateData.address) {
            populateField('address-line-1', privateData.address.line1);
            populateField('address-line-2', privateData.address.line2);
            populateField('address-line-3', privateData.address.line3);
            populateField('parish', privateData.address.parish);
            populateField('postcode', privateData.address.postCode);
        }
    }
    
    if (publicData.registerExpiry) {
        const expiryDate = publicData.registerExpiry.toDate();
        const today = new Date();
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        populateField('register-expiry', formatDate(publicData.registerExpiry));
        populateField('days-to-expiry', daysRemaining > 0 ? daysRemaining : 'Expired');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    authReady.then(async ({ user, publicData, privateData }) => {
        const profileForm = document.getElementById('profile-form');
        if (!user) {
            profileForm.innerHTML = `
                <div class="page-header"><h1>My Profile</h1></div>
                <div class="card">
                    <p>Please log in to view your profile.</p>
                    <a href="/index.html" class="btn btn-primary">Log In</a>
                </div>
            `;
            return;
        }

        if (publicData && privateData) {
            setupTabs();
            await displayProfileData({ publicData, privateData });
        } else {
            const content = document.getElementById('personal-details-content');
            content.innerHTML = `
                <div class="card-no-hover">
                    <h2 class="heading-border">Profile Not Found</h2>
                    <div class="profile-details">
                        <p>We could not find a player profile linked to your user account.</p>
                        <p>Please contact a committee member if you believe this is an error.</p>
                    </div>
                </div>`;
            document.getElementById('statistics-content').innerHTML = '';
        }
    }).catch(error => {
        console.error("Error initializing profile page:", error);
    });
});
