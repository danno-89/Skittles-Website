import { auth } from './firebase.config.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-functions.js";

const mainContent = document.getElementById('main-content');
const authCheck = document.getElementById('auth-check');
const roleForm = document.getElementById('role-form');
const emailInput = document.getElementById('email-input');
const resultMessage = document.getElementById('result-message');
const loadingSpinner = document.getElementById('loading-spinner');

document.addEventListener('authReady', async ({ detail }) => {
    const user = detail.user;
    if (!user) {
        authCheck.textContent = "Error: You must be logged in to access this page.";
        return;
    }
    
    // Check for the custom claim
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.committee) {
        authCheck.style.display = 'none';
        mainContent.style.display = 'block';
    } else {
        authCheck.innerHTML = `
            <h2>Permission Denied</h2>
            <p>You do not have the necessary permissions to access this page.</p>
            <p>If you are a committee member, please contact an administrator to have your role granted.</p>
        `;
    }
});

roleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    if (!email) return;

    loadingSpinner.style.display = 'block';
    resultMessage.textContent = '';

    try {
        const functions = getFunctions();
        const grantCommitteeRole = httpsCallable(functions, 'grantCommitteeRole');
        const result = await grantCommitteeRole({ email: email });
        
        resultMessage.textContent = result.data.message;
        resultMessage.style.color = 'green';

    } catch (error) {
        console.error('Error calling grantCommitteeRole function:', error);
        resultMessage.textContent = `Error: ${error.message}`;
        resultMessage.style.color = 'red';
    } finally {
        loadingSpinner.style.display = 'none';
        emailInput.value = '';
    }
});
