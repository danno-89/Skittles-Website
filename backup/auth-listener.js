import { auth } from './firebase.config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('user-info');
    const userEmailHeader = document.getElementById('user-email-header');
    const signOutLink = document.getElementById('sign-out-link');
    const signInLinkContainer = document.getElementById('sign-in-link-container');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            if (userInfo && userEmailHeader) {
                userEmailHeader.textContent = user.email;
                userInfo.style.display = 'block';
            }
            if (signInLinkContainer) {
                signInLinkContainer.style.display = 'none';
            }
        } else {
            // User is signed out
            if (userInfo) {
                userInfo.style.display = 'none';
            }
            if (signInLinkContainer) {
                signInLinkContainer.style.display = 'block';
            }
        }
    });

    if (signOutLink) {
        signOutLink.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Sign out error:', error);
            });
        });
    }
});
