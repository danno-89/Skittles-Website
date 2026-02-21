
// --- Email Players Tab ---

function initializeEmailPlayers() {
    const sendTestBtn = document.getElementById('send-test-email-btn');
    const sendAllBtn = document.getElementById('send-all-email-btn');
    const subjectInput = document.getElementById('email-subject');
    const bodyInput = document.getElementById('email-body');
    const statusDiv = document.getElementById('email-status');

    if (!sendTestBtn || !sendAllBtn || !statusDiv) return;

    const sendEmail = async (testMode) => {
        const subject = subjectInput.value.trim();
        const body = bodyInput.value.trim();

        if (!subject || !body) {
            alert('Please enter both a subject and a message.');
            return;
        }

        if (!testMode && !confirm(`Are you sure you want to send this email to ALL consenting players?\n\nSubject: ${subject}`)) {
            return;
        }

        if (testMode) {
            statusDiv.textContent = 'Sending test email...';
            statusDiv.className = 'status-loading';
        } else {
            statusDiv.textContent = 'Sending emails to all players (this may take a moment)...';
            statusDiv.className = 'status-loading';
        }

        sendTestBtn.disabled = true;
        sendAllBtn.disabled = true;

        try {
            const sendAdminEmail = firebase.functions().httpsCallable('sendAdminEmail');
            const result = await sendAdminEmail({ subject, body, testMode });

            if (result.data.success) {
                statusDiv.textContent = testMode
                    ? `Test email sent successfully! (${result.data.sent} sent)`
                    : `Emails sent successfully! (${result.data.sent} sent, ${result.data.errors} errors)`;
                statusDiv.className = 'status-success';
                if (!testMode) {
                    subjectInput.value = '';
                    bodyInput.value = '';
                }
            } else {
                throw new Error(result.data.error || 'Unknown error');
            }
        } catch (error) {
            console.error("Email sending failed:", error);
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.className = 'status-error';
        } finally {
            sendTestBtn.disabled = false;
            sendAllBtn.disabled = false;
        }
    };

    sendTestBtn.addEventListener('click', () => sendEmail(true));
    sendAllBtn.addEventListener('click', () => sendEmail(false));
}
