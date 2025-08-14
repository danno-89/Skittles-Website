import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

const auth = getAuth();
const authIdSpan = document.getElementById('auth-id');
const emailAddressSpan = document.getElementById('email-address');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        authIdSpan.textContent = user.uid;
        emailAddressSpan.textContent = user.email;
    } else {
        // User is signed out
        // Redirect to create account page if not authenticated
        window.location.href = 'create.html';
    }
});
