import { db, collection, getDocs, query, where, Timestamp, doc, updateDoc } from './firebase.config.js';

let postponedFixtures = [];
let teamsMapRef;

const elements = {
    postponedSelect: null,
    dateInput: null,
    timeInput: null,
    rescheduleBtn: null,
    feedbackDiv: null,
};

// --- Data Fetching ---
async function fetchPostponedFixtures() {
    const q = query(collection(db, "match_results"), where("status", "==", "postponed"));
    const querySnapshot = await getDocs(q);
    postponedFixtures = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    postponedFixtures.sort((a, b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis());
}

// --- UI Population ---
function populatePostponedFixturesSelect() {
    elements.postponedSelect.innerHTML = '<option value="">1. Select Fixture to Move</option>';
    postponedFixtures.forEach(fixture => {
        const homeTeam = teamsMapRef.get(fixture.homeTeamId) || 'Unknown';
        const awayTeam = teamsMapRef.get(fixture.awayTeamId) || 'Unknown';
        const date = fixture.scheduledDate.toDate().toLocaleDateString('en-GB');
        const option = document.createElement('option');
        option.value = fixture.id;
        option.textContent = `${date} - ${homeTeam} vs ${awayTeam}`;
        elements.postponedSelect.appendChild(option);
    });
}

// --- Event Handlers & Logic ---
function checkButtonState() {
    elements.rescheduleBtn.disabled = !(elements.postponedSelect.value && elements.dateInput.value && elements.timeInput.value);
}

async function handleReschedule() {
    const fixtureId = elements.postponedSelect.value;
    const newDate = elements.dateInput.value;
    const newTime = elements.timeInput.value;

    if (!fixtureId || !newDate || !newTime) {
        showFeedback('Please select a fixture and enter a new date and time.', 'error');
        return;
    }

    const [year, month, day] = newDate.split('-').map(Number);
    const [hours, minutes] = newTime.split(':').map(Number);
    const newScheduledDate = new Date(year, month - 1, day, hours, minutes);

    const confirmed = confirm('Are you sure you want to reschedule this fixture to the new date and time?');
    if (!confirmed) return;

    elements.rescheduleBtn.disabled = true;
    showFeedback('Rescheduling fixture...', 'info');

    try {
        const fixtureRef = doc(db, "match_results", fixtureId);
        await updateDoc(fixtureRef, {
            scheduledDate: Timestamp.fromDate(newScheduledDate),
            status: 'rescheduled'
        });

        showFeedback('Fixture rescheduled successfully!', 'success');
        await initialize();

    } catch (error) {
        console.error('Error updating fixture:', error);
        showFeedback(`An error occurred: ${error.message}`, 'error');
    } finally {
        checkButtonState();
    }
}

function showFeedback(message, type) {
    elements.feedbackDiv.textContent = message;
    elements.feedbackDiv.className = `feedback-message ${type}`;
    elements.feedbackDiv.style.display = 'block';
}

// --- Initialization ---
async function initialize() {
    await fetchPostponedFixtures();
    populatePostponedFixturesSelect();
    elements.dateInput.value = '';
    elements.timeInput.value = '';
    checkButtonState();
}

export function initRescheduleFixture(teamsMap) {
    teamsMapRef = teamsMap;
    elements.postponedSelect = document.getElementById('postponed-fixture-select');
    elements.dateInput = document.getElementById('new-date-input');
    elements.timeInput = document.getElementById('new-time-input');
    elements.rescheduleBtn = document.getElementById('reschedule-submit-btn');
    elements.feedbackDiv = document.getElementById('reschedule-feedback');

    if (!elements.postponedSelect || !elements.dateInput || !elements.timeInput || !elements.rescheduleBtn) {
        console.error('Reschedule fixture tab elements not found!');
        return;
    }

    elements.postponedSelect.addEventListener('change', checkButtonState);
    elements.dateInput.addEventListener('change', checkButtonState);
    elements.timeInput.addEventListener('change', checkButtonState);
    elements.rescheduleBtn.addEventListener('click', handleReschedule);

    initialize();
}
