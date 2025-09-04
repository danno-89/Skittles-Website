import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

// --- DOM ELEMENTS ---
const hallOfFameContainer = document.getElementById('hall-of-fame-container');
const competitionTabsContainer = document.getElementById('competition-tabs-container');
const statsContent = document.getElementById('stats-content');
const detailedWinnersContainer = document.getElementById('detailed-winners-container');

// --- GLOBAL STATE ---
let allCompetitions = [];
let currentWinners = [];

// --- FUNCTIONS ---

const initializePage = async () => {
    try {
        const competitionsSnapshot = await getDocs(collection(db, 'competitions'));
        if (competitionsSnapshot.empty) {
            hallOfFameContainer.innerHTML = '<p>No competition data found.</p>';
            return;
        }
        allCompetitions = competitionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        populateCompetitionTabs();
    } catch (error) {
        console.error("Error initializing page:", error);
        hallOfFameContainer.innerHTML = "<p>Error loading competition data.</p>";
    }
};

const populateCompetitionTabs = () => {
    competitionTabsContainer.innerHTML = '';
    const cupCompetitions = [
        'champion-of-champions',
        'general-knockout',
        'premier-division-knockout',
        'first-division-knockout',
        'second-division-knockout'
    ];
    const competitionOrder = {
        'champion-of-champions': 1,
        'general-knockout': 2,
        'premier-division-knockout': 3,
        'first-division-knockout': 4,
        'second-division-knockout': 5
    };
    
    const filteredCompetitions = allCompetitions
        .filter(c => cupCompetitions.includes(c.id))
        .sort((a, b) => competitionOrder[a.id] - competitionOrder[b.id]);

    if (filteredCompetitions.length === 0) {
        hallOfFameContainer.innerHTML = '<p>No cup competitions found.</p>';
        statsContent.innerHTML = '';
        detailedWinnersContainer.innerHTML = '';
        return;
    }

    filteredCompetitions.forEach(comp => {
        const tab = document.createElement('button');
        tab.className = 'tab-link';
        tab.dataset.competitionId = comp.id;
        tab.textContent = comp.name;
        tab.addEventListener('click', () => handleCompetitionTabClick(comp.id, comp.name));
        competitionTabsContainer.appendChild(tab);
    });

    if (filteredCompetitions.length > 0) {
        handleCompetitionTabClick(filteredCompetitions[0].id, filteredCompetitions[0].name);
    }
};

const handleCompetitionTabClick = (competitionId, competitionName) => {
    competitionTabsContainer.querySelectorAll('.tab-link').forEach(subTab => {
        subTab.classList.toggle('active', subTab.dataset.competitionId === competitionId);
    });

    loadWinners(competitionId);
};

const loadWinners = async (competitionId) => {
    hallOfFameContainer.innerHTML = '<p>Loading...</p>';
    statsContent.innerHTML = '<p>Loading statistics...</p>';
    detailedWinnersContainer.innerHTML = '';

    if (!competitionId) {
        hallOfFameContainer.innerHTML = '';
        statsContent.innerHTML = '<p>Select a competition to see statistics.</p>';
        return;
    }

    try {
        const winnerDoc = await getDoc(doc(db, 'winners', competitionId));
        
        if (winnerDoc.exists()) {
            const data = winnerDoc.data();
            currentWinners = data.history || [];
            currentWinners.sort((a, b) => String(b.season).localeCompare(String(a.season)));
        } else {
            currentWinners = [];
        }

        const competition = allCompetitions.find(c => c.id === competitionId);
        const competitionName = competition ? competition.name : 'Competition';
        
        renderAsTable(currentWinners, competitionName);
        const winCounts = getWinCounts(currentWinners);
        renderStatistics(winCounts);
        renderDetailedWinnersList(winCounts);

    } catch (error) {
        console.error(`Error loading winners for ${competitionId}:`, error);
        hallOfFameContainer.innerHTML = "<p>Error loading winners data.</p>";
        statsContent.innerHTML = "<p>Error generating statistics.</p>";
    }
};

const renderAsTable = (winnersArray, competitionName) => {
    hallOfFameContainer.innerHTML = '';
    const heading = document.createElement('h2');
    heading.className = 'competition-heading';
    heading.textContent = competitionName;
    hallOfFameContainer.appendChild(heading);

    const table = document.createElement('table');
    table.className = 'winners-table';
    const thead = table.createTHead();
    const tbody = table.createTBody();
    const headerRow = thead.insertRow();
    headerRow.innerHTML = '<th>Season</th><th>Winner</th>';

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${entry.season}</td><td>${entry.winner || 'N/A'}</td>`;
    });

    hallOfFameContainer.appendChild(table);
};

const renderStatistics = (winCounts) => {
    if (winCounts.size === 0) {
        statsContent.innerHTML = '<p>No winners to calculate stats for.</p>';
        return;
    }
    const sortedWinners = [...winCounts.entries()].sort((a, b) => b[1] - a[1]);
    const maxWins = sortedWinners.length > 0 ? sortedWinners[0][1] : 0;
    const mostSuccessful = sortedWinners.filter(w => w[1] === maxWins);
    statsContent.innerHTML = `
        <div class="stat-item"><strong>Total Unique Winners:</strong><span>${winCounts.size}</span></div>
        <div class="stat-item"><strong>Most Wins:</strong><span>${mostSuccessful.map(w => `${w[0]} (${w[1]})`).join(', ')}</span></div>`;
};

const renderDetailedWinnersList = (winCounts) => {
    detailedWinnersContainer.innerHTML = '';
    if (winCounts.size === 0) return;

    const heading = document.createElement('h2');
    heading.textContent = 'All Winners by Wins';
    detailedWinnersContainer.appendChild(heading);

    const winnersByCount = [...winCounts.entries()].reduce((acc, [winner, count]) => {
        (acc[count] = acc[count] || []).push(winner);
        return acc;
    }, {});

    Object.keys(winnersByCount).sort((a, b) => b - a).forEach(count => {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'winner-group';
        const groupHeading = document.createElement('h3');
        groupHeading.textContent = `${count} ${count > 1 ? 'Wins' : 'Win'}`;
        groupContainer.appendChild(groupHeading);
        
        const list = document.createElement('ul');
        list.className = 'detailed-winner-list';
        winnersByCount[count].sort().forEach(winner => {
            const listItem = document.createElement('li');
            listItem.textContent = winner;
            list.appendChild(listItem);
        });
        groupContainer.appendChild(list);
        detailedWinnersContainer.appendChild(groupContainer);
    });
};

function getWinCounts(winnersArray) {
    return winnersArray.reduce((acc, entry) => {
        const winnerName = entry.winner;
        if (winnerName && typeof winnerName === 'string') {
            acc.set(winnerName, (acc.get(winnerName) || 0) + 1);
        }
        return acc;
    }, new Map());
}

// --- SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', initializePage);
