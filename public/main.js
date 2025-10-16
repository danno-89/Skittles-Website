// main.js
import './components/page-header.js';
import './components/popup-menu.js';
import { auth, db, collection, getDocs, query, orderBy, limit } from './firebase.config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authReady } from './auth-manager.js';
import { getStatistics } from './statistics.js';

async function includeHTML() {
    const includeElements = Array.from(document.querySelectorAll('[w3-include-html]'));
    const promises = includeElements.map(el => {
        const file = el.getAttribute('w3-include-html');
        return fetch(file)
            .then(response => response.ok ? response.text() : Promise.reject(`Failed to load ${file}`))
            .then(data => {
                el.innerHTML = data;
                el.removeAttribute('w3-include-html');
            })
            .catch(error => {
                el.innerHTML = "Page not found.";
                console.error(error);
            });
    });

    await Promise.all(promises);
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
    if (loginLink) loginLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (teamManagementLink) teamManagementLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (skittlesHubTitle) skittlesHubTitle.style.display = 'none';

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
    }
});
