import { auth } from './firebase.config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

/**
 * A robust, promise-based function to include HTML content from other files.
 * It fetches and injects the content for all elements with the 'w3-include-html' attribute.
 * @returns {Promise} A promise that resolves when all includes are complete.
 */
function includeHTML() {
    const elements = document.querySelectorAll('[w3-include-html]');
    const promises = Array.from(elements).map(el => {
        const file = el.getAttribute('w3-include-html');
        return fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${file}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                el.innerHTML = data;
                el.removeAttribute('w3-include-html');
            })
            .catch(error => {
                el.innerHTML = 'Error loading content.';
                console.error('Error in includeHTML:', error);
            });
    });
    return Promise.all(promises);
}

/**
 * Updates the navigation UI based on the user's authentication status and profile.
 */
function updateNavigationUI(user, userProfile) {
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const profileLink = document.getElementById('profile-link');
    const teamManagementLink = document.getElementById('team-management-link');
    const skittlesHubTitle = document.getElementById('skittles-hub-title');

    // Default state for logged-out user
    if (loginLink) loginLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (teamManagementLink) teamManagementLink.style.display = 'none';
    if (skittlesHubTitle) {
        skittlesHubTitle.style.display = 'none'; // Hide hub section for logged-out users initially
        skittlesHubTitle.textContent = 'Skittles Hub';
    }

    if (user) {
        // User is logged in
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'block';
        if (skittlesHubTitle) skittlesHubTitle.style.display = 'block';

        if (userProfile && userProfile.firstName) {
            skittlesHubTitle.textContent = `${userProfile.firstName}'s Skittles Hub`;
        } else {
            skittlesHubTitle.textContent = 'Your Skittles Hub';
        }

        if (userProfile) {
            if (userProfile.role === 'Captain' || userProfile.role === 'Vice Captain') {
                if (teamManagementLink) {
                    teamManagementLink.style.display = 'block';
                    if (userProfile.teamName) {
                        const teamLink = teamManagementLink.querySelector('a');
                        if (teamLink) teamLink.textContent = userProfile.teamName;
                    }
                }
            }
        }
        
        if (logoutLink) {
             logoutLink.onclick = (e) => {
                e.preventDefault();
                signOut(auth).then(() => {
                    sessionStorage.removeItem('user_session');
                    window.location.href = 'index.html';
                }).catch((error) => console.error('Sign Out Error:', error));
            };
        }
    }
}

/**
 * Initializes the navigation logic.
 */
function setupNavigation() {
    const session = JSON.parse(sessionStorage.getItem('user_session'));
    if (session) {
        updateNavigationUI(session.user, session.userProfile);
    } else {
        updateNavigationUI(null, null);
    }
    
    document.addEventListener('authReady', ({ detail }) => {
        updateNavigationUI(detail.user, detail.userProfile);
    });
}

function setupTabs() {
    const tabsContainers = document.querySelectorAll('.tab-container, .tabs-main');
    tabsContainers.forEach(container => {
        const tabLinks = container.querySelectorAll('.tab-link');
        const tabPanes = container.querySelectorAll('.tab-pane');

        if (tabLinks.length === 0 || tabPanes.length === 0) return;

        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.dataset.tab;
                tabLinks.forEach(l => l.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                link.classList.add('active');
                const contentPane = document.getElementById(`${tabId}-content`);
                if (contentPane) contentPane.classList.add('active');
            });
        });

        if (!container.querySelector('.tab-link.active')) {
            tabLinks[0].classList.add('active');
            const initialTabId = tabLinks[0].dataset.tab;
            const initialContentPane = document.getElementById(`${initialTabId}-content`);
            if (initialContentPane) initialContentPane.classList.add('active');
        }
    });
}

// Main execution flow
document.addEventListener('DOMContentLoaded', () => {
    includeHTML().then(() => {
        // This code is guaranteed to run only after all HTML partials are loaded
        setupNavigation();
        setupTabs();
    });
});
