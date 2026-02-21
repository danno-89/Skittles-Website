import { functions } from './firebase.config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

document.addEventListener('DOMContentLoaded', async () => {
    const messageDiv = document.getElementById('message');
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid');

    if (!uid) {
        messageDiv.textContent = "Invalid request. No user specified.";
        messageDiv.className = 'status-error';
        return;
    }

    try {
        const handleUnsubscribe = httpsCallable(functions, 'handleUnsubscribe');
        const result = await handleUnsubscribe({ uid });

        if (result.data.success) {
            messageDiv.textContent = "You have been successfully unsubscribed from Sarnia Skittles Club emails.";
            messageDiv.className = 'status-success';
        } else {
            throw new Error('Server returned failure.');
        }
    } catch (error) {
        console.error("Unsubscribe failed:", error);
        messageDiv.textContent = "An error occurred while processing your request. Please try again later or contact us directly.";
        messageDiv.className = 'status-error';
    }
});
