// main.js
import './components/page-header.js';
import './components/popup-menu.js';
import { auth, db, collection, getDocs, query, orderBy, limit } from './firebase.config.js';
import { signOut } from "firebase/auth";
import { authReady } from './auth-manager.js';
import { getStatistics } from './statistics.js';

import headerHtml from './header.html?raw';
import footerHtml from './footer.html?raw';
import navigationHtml from './navigation.html?raw';

const htmlTemplates = {
    'header.html': headerHtml,
    'footer.html': footerHtml,
    'navigation.html': navigationHtml
};

async function includeHTML() {
    const includeElements = Array.from(document.querySelectorAll('[w3-include-html]'));

    includeElements.forEach(el => {
        const file = el.getAttribute('w3-include-html');
        if (htmlTemplates[file]) {
            el.innerHTML = htmlTemplates[file];
            el.removeAttribute('w3-include-html');

            // Execute any scripts found in the injected HTML (specifically for header/favicon)
            const scripts = el.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        } else {
            console.warn(`Template ${file} not found in bundle.`);
            // Fallback for others if needed, though we expect only these 3
            // Not implementing fetch fallback to force bundling usage
            el.innerHTML = "Page not found.";
        }
    });

    // Dispatch event immediately since we are sync now (or close to it)
    // We keep it async function signature to match previous contract if called elsewhere, 
    // but execution is sync.
    document.dispatchEvent(new CustomEvent('htmlIncludesLoaded'));
}

function setupSignOutListeners() {
    document.querySelectorAll('#logout-link, #sign-out-btn').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                alert("You have been signed out.");
                window.location.href = '/index.html';
            }).catch(console.error);
        });
    });
}

function setupMenuToggle() {
    const menuIcon = document.querySelector('.menu-icon');
    const mainNav = document.querySelector('.main-nav');
    if (menuIcon && mainNav) {
        menuIcon.addEventListener('click', () => mainNav.classList.toggle('active'));
    }
}

async function displayStatistics() {
    const stats = await getStatistics();
    const header = document.querySelector('header');

    if (header) {
        const countersContainer = document.createElement('div');
        countersContainer.className = 'counters-container';
        countersContainer.innerHTML = `
            <div class="counter">
                <span class="label">Matches played:</span>
                <span class="value">${stats.completedMatches} of ${stats.totalMatches}</span>
            </div>
            <div class="counter">
                <span class="label">Postponements:</span>
                <span class="value">${stats.postponements}</span>
            </div>
            <div class="counter">
                <span class="label">Pins:</span>
                <span class="value">${stats.pins}</span>
            </div>
        `;
        header.appendChild(countersContainer);

        const style = document.createElement('style');
        style.textContent = `
            .counters-container {
                position: absolute;
                right: 180px; /* Adjusted from 170px */
                top: 50%;
                transform: translateY(-50%);
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 5px;
                z-index: 3;
            }
            .counter {
                color: var(--club-yellow);
                font-size: 0.8rem;
                display: flex;
                gap: 5px;
                white-space: nowrap; /* Prevent text from wrapping */
            }
            
            @media (max-width: 768px) {
                .counters-container {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

async function loadNews() {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;

    const q = query(collection(db, "news"), orderBy("timestamp", "desc"), limit(5));
    const newsSnapshot = await getDocs(q);

    if (newsSnapshot.empty) {
        newsContainer.innerHTML = '<p>No news to display.</p>';
        return;
    }

    let newsHTML = '';
    newsSnapshot.forEach(doc => {
        const newsItem = doc.data();
        newsHTML += `
            <div class="news-item-home">
                <h4>${newsItem.title}</h4>
                <p>${newsItem.content}</p>
            </div>
        `;
    });
    newsContainer.innerHTML = newsHTML;
}


document.addEventListener('htmlIncludesLoaded', () => {
    setupSignOutListeners();
    setupMenuToggle();
    if (window.location.pathname.endsWith('/index.html') || window.location.pathname === '/') {
        loadNews();
    }
    if (!window.location.pathname.includes('/scoreboard/')) {
        displayStatistics();
    }
});

document.addEventListener('DOMContentLoaded', includeHTML);


// Use the promise from auth-manager to update the UI
authReady.then(({ user, publicData }) => {
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const profileLink = document.getElementById('profile-link');
    const teamManagementLink = document.getElementById('team-management-link');
    const adminLink = document.getElementById('admin-link');
    const skittlesHubTitle = document.getElementById('skittles-hub-title');

    // Default states
    // Default states are now all hidden in HTML.
    // We strictly enable what is needed based on auth state.

    if (user && publicData) {
        // Logged-in user
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'block';
        if (skittlesHubTitle) {
            skittlesHubTitle.style.display = 'block';
            skittlesHubTitle.textContent = `${publicData.firstName}'s Skittles Hub`;
        }

        // Role-specific links
        if (publicData.role === 'Captain' || publicData.role === 'Vice Captain') {
            if (teamManagementLink) teamManagementLink.style.display = 'block';
        }
        if (publicData.committee) {
            if (adminLink) adminLink.style.display = 'block';
        }
    } else {
        // Not logged in
        if (loginLink) loginLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'none';
        if (teamManagementLink) teamManagementLink.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (skittlesHubTitle) skittlesHubTitle.style.display = 'none';
    }
});
