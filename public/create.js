import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

const auth = getAuth();
const createAccountForm = document.getElementById('create-account-form');
const googleSignInBtn = document.getElementById('google-signin-btn');
const errorMessage = document.getElementById('error-message');

createAccountForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
        errorMessage.textContent = "Passwords do not match.";
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            console.log('User created:', user);
            window.location.href = 'link.html';
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessageText = error.message;
            errorMessage.textContent = errorMessageText;
            console.error(errorCode, errorMessageText);
        });
});

googleSignInBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;
            console.log('User signed in with Google:', user);
            window.location.href = 'link.html';
        }).catch((error) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessageText = error.message;
            // The email of the user's account used.
            const email = error.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            errorMessage.textContent = errorMessageText;
            console.error(errorCode, errorMessageText);
        });
});
