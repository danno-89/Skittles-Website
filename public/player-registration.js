import { db, collection, getDocs, query, where, functions, auth } from './firebase.config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-functions.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";


let registrationData = {};

/**
 * Capitalizes the first letter of a string and lowercases the rest.
 * @param {string} string The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Calculates a person's age based on a dd/mm/yyyy date string.
 * @param {string} dobString - Date of birth string in dd/mm/yyyy format
 * @returns {number} Age in years, or -1 if invalid
 */
function calculateAge(dobString) {
    if (!dobString) return -1;
    const parts = dobString.split('/');
    if (parts.length !== 3) return -1;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return -1;

    const dob = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

/**
 * Populates the team selection dropdown with active teams from Firestore.
 */
async function populateTeamsDropdown() {
    const teamSelect = document.getElementById('team');
    if (!teamSelect) return;

    try {
        const teamsRef = collection(db, 'teams');
        const q = query(teamsRef, where("status", "==", "active"));
        const querySnapshot = await getDocs(q);

        teamSelect.innerHTML = '<option value="">Please select a team</option>';

        querySnapshot.forEach((doc) => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = team.name;
            teamSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching teams: ", error);
        teamSelect.innerHTML = '<option value="">Could not load teams</option>';
    }
}

function setupTeamDropdownListener() {
    const teamSelect = document.getElementById('team');
    if (teamSelect) {
        teamSelect.addEventListener('change', (e) => {
            populateSponsorsDropdown(e.target.value);
        });
    }
}

async function populateSponsorsDropdown(teamId) {
    const sponsorSelect = document.getElementById('sponsor-id');
    if (!sponsorSelect) return;

    if (!teamId) {
        sponsorSelect.innerHTML = '<option value="">Select an adult from your team</option>';
        return;
    }

    sponsorSelect.innerHTML = '<option value="">Loading sponsors...</option>';

    try {
        const playersRef = collection(db, 'players_public');
        const q = query(playersRef, where("teamId", "==", teamId));
        const querySnapshot = await getDocs(q);

        sponsorSelect.innerHTML = '<option value="">Select an adult from your team</option>';

        querySnapshot.forEach((doc) => {
            const player = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${player.firstName} ${player.lastName}`;
            sponsorSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching sponsors: ", error);
        sponsorSelect.innerHTML = '<option value="">Could not load sponsors</option>';
    }
}

/**
 * Sets up input masking and validation for the date of birth field (dd/mm/yyyy).
 */
function setupDobInput() {
    const dobInput = document.getElementById('dob');
    if (!dobInput) return;

    dobInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = `${value.substring(0, 2)}/${value.substring(2)}`;
        if (value.length > 5) value = `${value.substring(0, 5)}/${value.substring(5, 9)}`;
        e.target.value = value;
    });

    dobInput.addEventListener('blur', (e) => {
        const parts = e.target.value.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            const date = new Date(year, month - 1, day);
            const isValid = date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
            e.target.setCustomValidity(isValid ? '' : 'Please enter a valid date.');
            checkAgeRequirement(isValid ? e.target.value : null);
        } else if (e.target.value) {
            e.target.setCustomValidity('Please use dd/mm/yyyy format.');
            checkAgeRequirement(null);
        } else {
            e.target.setCustomValidity('');
            checkAgeRequirement(null);
        }
    });
}

function checkAgeRequirement(dobString) {
    const age = calculateAge(dobString);
    const section = document.getElementById('countersignature-section');
    const select = document.getElementById('sponsor-id');
    const dobInput = document.getElementById('sponsor-dob');
    const confirm = document.getElementById('sponsor-confirm');

    if (!section || !select || !dobInput || !confirm) return;

    if (age >= 0 && age < 18) {
        section.classList.remove('hidden');
        select.required = true;
        dobInput.required = true;
        confirm.required = true;
    } else {
        section.classList.add('hidden');
        select.required = false;
        dobInput.required = false;
        confirm.required = false;
        select.value = '';
        dobInput.value = '';
        confirm.checked = false;
    }
}

function setupSponsorDobInput() {
    const dobInput = document.getElementById('sponsor-dob');
    if (!dobInput) return;

    dobInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = `${value.substring(0, 2)}/${value.substring(2)}`;
        if (value.length > 5) value = `${value.substring(0, 5)}/${value.substring(5, 9)}`;
        e.target.value = value;
    });
}

/**
 * Sets up input masking for a phone number field (##### ######).
 * @param {string} inputId The ID of the phone number input element.
 */
function setupPhoneNumberInput(inputId) {
    const phoneInput = document.getElementById(inputId);
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = `${value.substring(0, 5)} ${value.substring(5, 11)}`;
        }
        e.target.value = value;
    });
}

/**
 * Sets up input masking for the Guernsey postcode field (e.g., GY# #XX).
 */
function setupPostcodeInput() {
    const postcodeInput = document.getElementById('postcode');
    if (!postcodeInput) return;

    postcodeInput.addEventListener('input', (e) => {
        let value = e.target.value.toUpperCase().replace(/\s/g, '');
        if (value.length > 3) {
            value = `${value.substring(0, 3)} ${value.substring(3, 6)}`;
        }
        e.target.value = value.trim();
    });
}

/**
 * Handles the main form submission, validation, and navigates to the confirmation view.
 */
function handleFormSubmit() {
    const form = document.getElementById('registration-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Custom validation: at least one phone number is required.
        const mobileInput = document.getElementById('mobile-number');
        const homeInput = document.getElementById('home-work-number');
        mobileInput.setCustomValidity(''); // Clear previous errors

        if (!mobileInput.value.trim() && !homeInput.value.trim()) {
            mobileInput.setCustomValidity('Please provide at least one contact number.');
            form.reportValidity();
            return;
        }

        // Check standard browser validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        try {
            const formData = new FormData(form);
            const dobVal = formData.get('dob');
            const age = calculateAge(dobVal);

            let sponsorId = null;
            let sponsorName = null;

            if (age >= 0 && age < 18) {
                sponsorId = formData.get('sponsor-id');
                const sponsorDob = formData.get('sponsor-dob');
                const sponsorSelect = document.getElementById('sponsor-id');
                sponsorName = sponsorSelect.options[sponsorSelect.selectedIndex].text;

                const verifySponsor = httpsCallable(functions, 'verifySponsor');
                const result = await verifySponsor({ sponsorId, sponsorDob });

                if (!result.data.success) {
                    alert('Sponsor authentication failed. Please double-check the sponsor\'s Date of Birth.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    return;
                }
            }

            registrationData = {
                firstName: formData.get('first-name'),
                lastName: formData.get('last-name'),
                dob: dobVal,
                email: formData.get('email'),
                teamId: formData.get('team'),
                division: formData.get('division'),
                mobileNo: formData.get('mobile-number'),
                homeNo: formData.get('home-work-number'),
                sponsorId: sponsorId,
                sponsorName: sponsorName,
                address: {
                    line1: formData.get('address-line-1'),
                    line2: formData.get('address-line-2'),
                    line3: formData.get('address-line-3'),
                    parish: formData.get('parish'),
                    postCode: formData.get('postcode'),
                }
            };
            displayConfirmation(registrationData);
        } catch (error) {
            console.error("Verification error: ", error);
            alert('An error occurred during verification. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

/**
 * Displays a user-friendly summary of the data for confirmation.
 * @param {object} data The user's registration data.
 */
function displayConfirmation(data) {
    const confirmationSection = document.getElementById('confirmation-section');
    const confirmationContent = document.getElementById('confirmation-content');
    if (!confirmationSection || !confirmationContent) return;

    const teamName = document.getElementById('team').options[document.getElementById('team').selectedIndex].text;
    const addressParts = [data.address.line1, data.address.line2, data.address.line3, data.address.parish, data.address.postCode];
    const addressString = addressParts.filter(part => part).join(', ');

    let sponsorHtml = '';
    if (data.sponsorId) {
        sponsorHtml = `<strong>Sponsor:</strong> <span>${data.sponsorName}</span>`;
    }

    confirmationContent.innerHTML = `
        <div class="summary-grid">
            <strong>First Name:</strong> <span>${data.firstName}</span>
            <strong>Last Name:</strong> <span>${data.lastName}</span>
            <strong>Date of Birth:</strong> <span>${data.dob}</span>
            <strong>Email:</strong> <span>${data.email}</span>
            <strong>Team:</strong> <span>${teamName}</span>
            <strong>Division:</strong> <span>${data.division || 'N/A'}</span>
            <strong>Mobile Number:</strong> <span>${data.mobileNo || 'N/A'}</span>
            <strong>Home/Work Number:</strong> <span>${data.homeNo || 'N/A'}</span>
            ${sponsorHtml}
            <strong>Address:</strong> <span>${addressString}</span>
        </div>
    `;

    document.getElementById('registration-container').classList.add('hidden');
    confirmationSection.classList.remove('hidden');
}

/**
 * Handles the account creation form submission.
 */
function handleAccountCreation() {
    const form = document.getElementById('account-creation-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorDiv = document.getElementById('password-error');

        if (password !== confirmPassword) {
            errorDiv.classList.remove('hidden');
            return;
        }
        errorDiv.classList.add('hidden');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, registrationData.email, password);
            const user = userCredential.user;
            registrationData.authId = user.uid;
            submitRegistration();
        } catch (error) {
            alert(`Account creation failed: ${error.message}`);
            console.error("Account creation error:", error);
        }
    });
}


/**
 * Calls the Cloud Function to submit the registration data.
 */
async function submitRegistration() {
    const registerPlayer = httpsCallable(functions, 'registerPlayer');
    try {
        const result = await registerPlayer(registrationData);
        if (result.data.success) {
            displaySummary(registrationData);
        } else {
            alert(`Registration failed: ${result.data.error}`);
            console.error('Error:', result.data.error);
        }
    } catch (error) {
        alert('There was an error connecting to the server. Please try again.');
        console.error('Error:', error);
    }
}

/**
 * Displays the final success summary to the user.
 * @param {object} data The user's submitted data.
 */
function displaySummary(data) {
    const summarySection = document.getElementById('summary-section');
    const summaryContent = document.getElementById('summary-content');
    if (!summarySection || !summaryContent) return;

    const teamName = document.getElementById('team').options[document.getElementById('team').selectedIndex].text;
    const addressParts = [data.address.line1, data.address.line2, data.address.line3, data.address.parish, data.address.postCode];
    const addressString = addressParts.filter(part => part).join(', ');

    let sponsorHtml = '';
    if (data.sponsorId) {
        sponsorHtml = `<strong>Sponsor:</strong> <span>${data.sponsorName}</span>`;
    }

    summaryContent.innerHTML = `
        <p>Thank you for registering! Your registration for <strong>${teamName}</strong> has been submitted.</p>
        <hr>
        <div class="summary-grid">
            <strong>First Name:</strong> <span>${data.firstName}</span>
            <strong>Last Name:</strong> <span>${data.lastName}</span>
            <strong>Date of Birth:</strong> <span>${data.dob}</span>
            <strong>Email:</strong> <span>${data.email}</span>
            <strong>Team:</strong> <span>${teamName}</span>
            <strong>Division:</strong> <span>${data.division || 'N/A'}</span>
            <strong>Mobile Number:</strong> <span>${data.mobileNo}</span>
            <strong>Home/Work Number:</strong> <span>${data.homeNo || 'N/A'}</span>
            ${sponsorHtml}
            <strong>Address:</strong> <span>${addressString}</span>
        </div>
    `;

    document.getElementById('confirmation-section').classList.add('hidden');
    document.getElementById('account-creation-section').classList.add('hidden');
    summarySection.classList.remove('hidden');
}

/**
 * Sets up the event listeners for the navigation buttons between sections.
 */
function setupNavigationButtons() {
    const cancelBtn = document.getElementById('cancel-submission');
    const proceedToAccountBtn = document.getElementById('proceed-to-account');
    const backToDetailsBtn = document.getElementById('back-to-details');
    const closeSummaryBtn = document.getElementById('close-summary');
    const registerNoAccountBtn = document.getElementById('register-no-account');


    cancelBtn?.addEventListener('click', () => {
        document.getElementById('confirmation-section').classList.add('hidden');
        document.getElementById('registration-container').classList.remove('hidden');
    });

    registerNoAccountBtn?.addEventListener('click', () => {
        delete registrationData.authId; // Ensure no authId is sent
        submitRegistration();
    });

    proceedToAccountBtn?.addEventListener('click', () => {
        document.getElementById('confirmation-section').classList.add('hidden');
        document.getElementById('account-creation-section').classList.remove('hidden');
    });

    backToDetailsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('account-creation-section').classList.add('hidden');
        document.getElementById('confirmation-section').classList.remove('hidden');
    });

    closeSummaryBtn?.addEventListener('click', () => {
        window.location.href = '/index'; // Redirect to home page
    });
}


/**
 * Initializes all the functionality when the page loads.
 */
document.addEventListener('DOMContentLoaded', () => {
    populateTeamsDropdown();
    setupTeamDropdownListener();
    setupDobInput();
    setupSponsorDobInput();
    setupPhoneNumberInput('mobile-number');
    setupPhoneNumberInput('home-work-number');
    setupPostcodeInput();
    handleFormSubmit();
    handleAccountCreation();
    setupNavigationButtons();
});
