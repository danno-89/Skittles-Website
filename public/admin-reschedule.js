import { db, collection, getDocs, query, where, Timestamp, httpsCallable, functions } from './firebase.config.js';

let postponedFixtures = [];
let availableSlots = [];
let teamsMapRef;

const elements = {
    postponedSelect: null,
    spareSelect: null,
    rescheduleBtn: null,
    feedbackDiv: null,
};

// --- Data Fetching ---

async function fetchPostponedFixtures() {
    // Fetches all fixtures that are currently postponed
    const q = query(collection(db, "match_results"), where("status", "==", "postponed"));
    const querySnapshot = await getDocs(q);
    postponedFixtures = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    postponedFixtures.sort((a, b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis());
}

async function fetchAvailableSlots() {
    // Calculate the cutoff date: today - 7 days
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - 7);
    cutoffDate.setHours(0, 0, 0, 0); // Start of the day for a clean comparison

    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // An available slot is any 'spare' or 'postponed' fixture's slot from the cutoff date onwards.
    const q = query(
        collection(db, "match_results"), 
        where("status", "in", ["spare", "postponed"]),
        where("scheduledDate", ">=", cutoffTimestamp) // Filter out old dates
    );
    
    const querySnapshot = await getDocs(q);
    
    const slots = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by date to ensure chronological order in the dropdown
    slots.sort((a, b) => a.scheduledDate.toMillis() - b.scheduledDate.toMillis());
    
    availableSlots = slots;
}


// --- UI Population ---

function populateSelects() {
    populatePostponedFixturesSelect();
    populateAvailableSlotsSelect();
}

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

function populateAvailableSlotsSelect(excludedId = null) {
    const currentSelection = elements.spareSelect.value;
    elements.spareSelect.innerHTML = '<option value="">2. Select Target Slot</option>';
    
    availableSlots.forEach(slot => {
        if (slot.id === excludedId) return; // A fixture cannot be rescheduled into its own slot

        const date = slot.scheduledDate.toDate().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const time = slot.scheduledDate.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const option = document.createElement('option');
        option.value = slot.id;

        if (slot.status === 'spare') {
            option.textContent = `Spare Slot on ${date} at ${time}`;
        } else {
            const homeTeam = teamsMapRef.get(slot.homeTeamId) || 'Unknown';
            const awayTeam = teamsMapRef.get(slot.awayTeamId) || 'Unknown';
            option.textContent = `Slot of ${homeTeam} vs ${awayTeam} on ${date}`;
        }
        elements.spareSelect.appendChild(option);
    });

    if (currentSelection && currentSelection !== excludedId) {
        elements.spareSelect.value = currentSelection;
    }
}

// --- Event Handlers & Logic ---

function checkButtonState() {
    elements.rescheduleBtn.disabled = !(elements.postponedSelect.value && elements.spareSelect.value);
}

async function handleReschedule() {
    const postponedFixtureId = elements.postponedSelect.value;
    const targetSlotId = elements.spareSelect.value;

    if (!postponedFixtureId || !targetSlotId) {
        showFeedback('Please select both a fixture to move and a target slot.', 'error');
        return;
    }

    const confirmed = confirm('Are you sure you want to reschedule this fixture? This action cannot be undone.');
    if (!confirmed) return;

    elements.rescheduleBtn.disabled = true;
    showFeedback('Rescheduling fixture...', 'info');

    try {
        const rescheduleFixture = httpsCallable(functions, 'rescheduleFixture');
        const result = await rescheduleFixture({ postponedFixtureId, targetSlotId });

        if (result.data.success) {
            showFeedback(result.data.message, 'success');
            await initialize(); 
        } else {
            throw new Error(result.data.message || 'The cloud function reported an error.');
        }

    } catch (error) {
        console.error('Error calling rescheduleFixture function:', error);
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
    await Promise.all([fetchPostponedFixtures(), fetchAvailableSlots()]);
    populateSelects();
    checkButtonState();
}

export function initRescheduleFixture(teamsMap) {
    teamsMapRef = teamsMap;
    elements.postponedSelect = document.getElementById('postponed-fixture-select');
    elements.spareSelect = document.getElementById('spare-fixture-select');
    elements.rescheduleBtn = document.getElementById('reschedule-submit-btn');
    elements.feedbackDiv = document.getElementById('reschedule-feedback');

    if (!elements.postponedSelect || !elements.spareSelect || !elements.rescheduleBtn) {
        console.error('Reschedule fixture tab elements not found!');
        return;
    }

    elements.postponedSelect.addEventListener('change', () => {
        populateAvailableSlotsSelect(elements.postponedSelect.value);
        checkButtonState();
    });
    elements.spareSelect.addEventListener('change', checkButtonState);
    elements.rescheduleBtn.addEventListener('click', handleReschedule);

    initialize();
}
