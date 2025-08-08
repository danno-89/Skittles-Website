import { firebaseConfig } from './firebase.config.js';

// --- INITIALIZATION ---
try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

// --- DOM ELEMENTS ---
const hallOfFameContainer = document.getElementById('hall-of-fame-container');
const competitionFilter = document.getElementById('competition-filter');
const tabsContainer = document.getElementById('competition-tabs');

// --- GLOBAL STATE ---
let allCompetitions = []; // To store all competitions from Firestore

// --- FUNCTIONS ---

/**
 * Fetches all competitions, stores them, creates type tabs, and loads initial data.
 */
const initializePage = async () => {
    if (!hallOfFameContainer || !competitionFilter || !tabsContainer) {
        console.error("Required HTML elements not found.");
        return;
    }

    try {
        const competitionsSnapshot = await db.collection('competitions').get();
        if (competitionsSnapshot.empty) {
            tabsContainer.innerHTML = '<p>No competition types found.</p>';
            competitionFilter.disabled = true;
            return;
        }

        // Store all competition data
        allCompetitions = competitionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Get unique types and sort them
        const competitionTypes = [...new Set(allCompetitions.map(c => c.type))].sort();

        createTypeTabs(competitionTypes);

        // Set the first tab as active and load its data
        if (competitionTypes.length > 0) {
            handleTabClick(competitionTypes[0]);
        }

    } catch (error) {
        console.error("Error initializing page:", error);
        hallOfFameContainer.innerHTML = "<p>Error loading competition data.</p>";
    }
};

/**
 * Creates the competition type tabs.
 * @param {string[]} types - An array of unique competition type strings.
 */
const createTypeTabs = (types) => {
    tabsContainer.innerHTML = ''; // Clear existing tabs
    types.forEach(type => {
        const tab = document.createElement('button');
        tab.className = 'competition-tab';
        tab.textContent = type;
        tab.dataset.type = type; // Use data attribute to store the type
        tab.addEventListener('click', () => handleTabClick(type));
        tabsContainer.appendChild(tab);
    });
};

/**
 * Handles the click event for a competition type tab.
 * @param {string} type - The competition type selected.
 */
const handleTabClick = (type) => {
    // Update active tab style
    document.querySelectorAll('.competition-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });

    populateCompetitionDropdown(type);

    // Automatically load winners for the first competition in the dropdown
    if (competitionFilter.options.length > 1) { // more than just the placeholder
        competitionFilter.value = competitionFilter.options[1].value; // Select the first real option
        loadWinners(competitionFilter.value);
    } else {
        hallOfFameContainer.innerHTML = '<p>No competitions of this type.</p>';
        competitionFilter.value = ""; // Reset to placeholder
    }
};

/**
 * Populates the competition dropdown based on the selected type.
 * @param {string} type - The competition type to filter by.
 */
const populateCompetitionDropdown = (type) => {
    competitionFilter.innerHTML = '<option value="">-- Please Select --</option>'; // Clear and add placeholder

    const filteredCompetitions = allCompetitions
        .filter(c => c.type === type)
        .sort((a, b) => a.name.localeCompare(b.name));

    if (filteredCompetitions.length === 0) {
        competitionFilter.disabled = true;
    } else {
        competitionFilter.disabled = false;
        filteredCompetitions.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp.id;
            option.textContent = comp.name;
            competitionFilter.appendChild(option);
        });
    }
};

/**
 * Fetches and renders the winners for a given competition ID.
 * @param {string} competitionId - The ID of the competition to load winners for.
 */
const loadWinners = async (competitionId) => {
    hallOfFameContainer.innerHTML = '';
    if (!competitionId) return;

    try {
        const winnerDoc = await db.collection('winners').doc(competitionId).get();
        if (!winnerDoc.exists) {
            hallOfFameContainer.innerHTML = '<p>No winners found for this competition.</p>';
            return;
        }

        const winnerData = winnerDoc.data();
        const winnersArray = Object.values(winnerData).find(Array.isArray);

        if (!winnersArray || winnersArray.length === 0) {
            hallOfFameContainer.innerHTML = '<p>Winner data is not in the expected format or is empty.</p>';
            return;
        }
        
        winnersArray.sort((a, b) => String(b.season).localeCompare(String(a.season)));
        
        const competition = allCompetitions.find(c => c.id === competitionId);
        const competitionName = competition ? competition.name : 'Competition';

        // NOTE: You can add different rendering logic based on competition name or type here
        // For now, using the 'renderAsList' for all.
        renderAsList(winnersArray, competitionName);

    } catch (error) {
        console.error(`Error loading winners for ${competitionId}:`, error);
        hallOfFameContainer.innerHTML = "<p>Error loading winners data.</p>";
    }
};

/**
 * Renders a list of winners.
 * @param {object[]} winnersArray - Array of winner objects { season, winner }.
 * @param {string} competitionName - The name of the competition.
 */
const renderAsList = (winnersArray, competitionName) => {
    const competitionSection = document.createElement('div');
    competitionSection.className = 'competition-section';
    
    const heading = document.createElement('h2');
    heading.className = 'competition-heading';
    heading.textContent = competitionName;
    competitionSection.appendChild(heading);

    const list = document.createElement('ul');
    list.className = 'winners-list';
    winnersArray.forEach(winner => {
        let winnerText;
        if (typeof winner.winner === 'object' && winner.winner !== null && winner.winner.male && winner.winner.female) {
            winnerText = `${winner.winner.female} & ${winner.winner.male}`;
        } else {
            winnerText = winner.winner || 'N/A';
        }
        
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span class="season">${winner.season}:</span> <span class="winner">${winnerText}</span>`;
        list.appendChild(listItem);
    });
    
    competitionSection.appendChild(list);
    hallOfFameContainer.appendChild(competitionSection);
};


// --- EVENT LISTENERS ---
competitionFilter.addEventListener('change', (e) => loadWinners(e.target.value));

// --- SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', initializePage);
