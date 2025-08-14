import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { firebaseConfig } from './firebase.config.js';

// --- Tab Functionality ---
const tabLinks = document.querySelectorAll('.tab-link');
const tabPanes = document.querySelectorAll('.tab-pane');

tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.dataset.tab;

        tabLinks.forEach(item => item.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        link.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    });
});

if (tabLinks.length > 0) {
    tabLinks[0].classList.add('active');
    document.getElementById(tabLinks[0].dataset.tab).classList.add('active');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const loginEmailForm = document.getElementById('login-email-form');
const registerEmailForm = document.getElementById('register-email-form');
const googleSignInBtnLogin = document.getElementById('google-signin-btn-login');
const googleSignInBtnRegister = document.getElementById('google-signin-btn-register');

const handleAuthSuccess = (userCredential) => {
    // On successful login or registration, redirect to the homepage.
    // The auth-check.js script will then handle routing to the correct page.
    window.location.href = 'index.html';
};

const handleAuthError = (error, action) => {
    alert(`${action} Error: ${error.message}`);
};

const handleGoogleSignIn = () => {
    signInWithPopup(auth, googleProvider)
        .then(handleAuthSuccess)
        .catch((error) => handleAuthError(error, 'Google Sign-in'));
};

if (loginEmailForm) {
    loginEmailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmailForm['login-email'].value;
        const password = loginEmailForm['login-password'].value;
        signInWithEmailAndPassword(auth, email, password)
            .then(handleAuthSuccess)
            .catch((error) => handleAuthError(error, 'Login'));
    });
}

if (registerEmailForm) {
    registerEmailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerEmailForm['register-email'].value;
        const password = registerEmailForm['register-password'].value;
        const passwordConfirm = registerEmailForm['register-password-confirm'].value;

        if (password !== passwordConfirm) {
            alert("Passwords do not match.");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then(handleAuthSuccess)
            .catch((error) => handleAuthError(error, 'Registration'));
    });
}

if (googleSignInBtnLogin) {
    googleSignInBtnLogin.addEventListener('click', handleGoogleSignIn);
}

if (googleSignInBtnRegister) {
    googleSignInBtnRegister.addEventListener('click', handleGoogleSignIn);
}
