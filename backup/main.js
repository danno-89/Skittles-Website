// main.js
import { auth } from './firebase.config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function includeHTML() {
    var z, i, elmnt, file, xhttp;
    z = document.getElementsByTagName("*");
    for (i = 0; i < z.length; i++) {
        elmnt = z[i];
        file = elmnt.getAttribute("w3-include-html");
        if (file) {
            xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) { elmnt.innerHTML = this.responseText; }
                    if (this.status == 404) { elmnt.innerHTML = "Page not found."; }
                    elmnt.removeAttribute("w3-include-html");
                    includeHTML();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();
            return;
        }
    }
    // After all includes are done, set up the sign-out listeners and menu toggle
    setupSignOutListeners();
    setupMenuToggle();
}

function setupSignOutListeners() {
    const signOutLinks = document.querySelectorAll('#logout-link, #sign-out-btn');
    signOutLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth).then(() => {
                    alert("You have been successfully signed out.");
                    window.location.href = '/index.html';
                }).catch((error) => {
                    console.error("Sign out error:", error);
                    alert("An error occurred while signing out.");
                });
            });
        }
    });
}

function setupMenuToggle() {
    const menuIcon = document.querySelector('.menu-icon');
    const mainNav = document.querySelector('.main-nav');
    if (menuIcon && mainNav) {
        menuIcon.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    includeHTML();
});

document.addEventListener('authReady', ({ detail }) => {
    const { user, publicData } = detail;

    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const profileLink = document.getElementById('profile-link');
    const teamManagementLink = document.getElementById('team-management-link');
    const messagesLink = document.getElementById('messages-link');
    const adminLink = document.getElementById('admin-link');
    const skittlesHubTitle = document.getElementById('skittles-hub-title');

    // Default state for logged-out user
    if (loginLink) loginLink.style.display = 'block';
    if (logoutLink) logoutLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (teamManagementLink) teamManagementLink.style.display = 'none';
    if (messagesLink) messagesLink.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (skittlesHubTitle) {
        skittlesHubTitle.style.display = 'none'; // Hide hub section for logged-out users initially
        skittlesHubTitle.textContent = 'Skittles Hub';
    }

    if (user) {
        // User is logged in
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'block';
        if (messagesLink) messagesLink.style.display = 'block';
        if (skittlesHubTitle) skittlesHubTitle.style.display = 'block';

        if (publicData) {
            skittlesHubTitle.textContent = `${publicData.firstName}'s Skittles Hub`;

            // Show Team Management link for Captains and Vice Captains
            if (publicData.role === 'Captain' || publicData.role === 'Vice Captain') {
                if (teamManagementLink) teamManagementLink.style.display = 'block';
            }

            // Show Admin link for committee members
            if (publicData.committee) {
                if (adminLink) adminLink.style.display = 'block';
            }
        }
    }
});
