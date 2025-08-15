
import { auth } from './firebase.config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const profileLink = document.getElementById('profile-link');
    const loginLink = document.getElementById('login-link');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            if (profileLink) profileLink.style.display = 'block';
            if (loginLink) loginLink.style.display = 'none';
        } else {
            // User is signed out
            if (profileLink) profileLink.style.display = 'none';
            if (loginLink) loginLink.style.display = 'block';
        }
    });
});
