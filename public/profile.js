import { auth } from './firebase.config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const signOutBtn = document.getElementById('sign-out-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        userName.textContent = user.displayName || 'No Name';
        userEmail.textContent = user.email;
        if(user.photoURL) {
            userAvatar.src = user.photoURL;
        }
    } else {
        // User is signed out
        window.location.href = 'login.html';
    }
});

signOutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        // Sign-out successful.
        window.location.href = 'index.html';
    }).catch((error) => {
        // An error happened.
        console.error('Sign out error:', error);
    });
});
