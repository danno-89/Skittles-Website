
import { auth, db } from './firebase.config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const createAccountForm = document.getElementById('createAccountForm');
    const loginForm = document.getElementById('loginForm');
    const createMessageContainer = document.getElementById('create-message-container');
    const loginMessageContainer = document.getElementById('login-message-container');
    const showCreateBtn = document.getElementById('showCreate');
    const showLoginBtn = document.getElementById('showLogin');

    const showCreate = () => {
        createAccountForm.style.display = 'block';
        loginForm.style.display = 'none';
        showCreateBtn.classList.add('active');
        showLoginBtn.classList.remove('active');
    };

    const showLogin = () => {
        createAccountForm.style.display = 'none';
        loginForm.style.display = 'block';
        showCreateBtn.classList.remove('active');
        showLoginBtn.classList.add('active');
    };

    showCreateBtn.addEventListener('click', showCreate);
    showLoginBtn.addEventListener('click', showLogin);

    // Check for URL parameter to determine which form to show
    const params = new URLSearchParams(window.location.search);
    if (params.get('form') === 'login') {
        showLogin();
    } else {
        showCreate();
    }

    if (createAccountForm) {
        createAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstname = e.target.firstname.value;
            const lastname = e.target.lastname.value;
            const email = e.target.email.value;
            const password = e.target.password.value;
            const confirmPassword = e.target.confirmPassword.value;

            if (password !== confirmPassword) {
                createMessageContainer.textContent = "Passwords do not match.";
                createMessageContainer.classList.add('error');
                createMessageContainer.classList.remove('success');
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                await setDoc(doc(db, "users", user.uid), {
                    firstname: firstname,
                    lastname: lastname,
                    email: email
                });
        
                window.location.href = `link.html?email=${encodeURIComponent(email)}`;
    
            } catch (error) {
                console.error('Error creating account:', error);
                if (error.code === 'auth/email-already-in-use') {
                    createMessageContainer.textContent = 'An account with this email already exists. Please log in.';
                } else {
                    createMessageContainer.textContent = `Error: ${error.message}`;
                }
                createMessageContainer.classList.add('error');
                createMessageContainer.classList.remove('success');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'profile.html';
            } catch (error) {
                console.error('Error logging in:', error);
                loginMessageContainer.textContent = `Error: ${error.message}`;
                loginMessageContainer.classList.add('error');
                loginMessageContainer.classList.remove('success');
            }
        });
    }
});
