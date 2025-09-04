import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';
import { updateCountdown } from './hof_pairs_countdown.js';

// --- DOM ELEMENTS ---
const hallOfFameContainer = document.getElementById('hall-of-fame-container');
const competitionTabsContainer = document.getElementById('competition-tabs-container');
const statsContent = document.getElementById('stats-content');
const detailedWinnersContainer = document.getElementById('detailed-winners-container');
const divisionFilterContainer = document.getElementById('division-filter-container');
const divisionFilter = document.getElementById('division-filter');

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
    // **FIX:** Filter by the 'type' field instead of a hardcoded list of names.
    const filteredCompetitions = allCompetitions.filter(c => c.type === 'Pairs').sort((a, b) => a.name.localeCompare(b.name));

    if (filteredCompetitions.length === 0) {
        hallOfFameContainer.innerHTML = '<p>No pairs competitions found.</p>';
        statsContent.innerHTML = '';
        detailedWinnersContainer.innerHTML = '';
        divisionFilterContainer.style.display = 'none';
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

    let countdownType = '';
    if (competitionName.toLowerCase().includes('men')) {
        countdownType = 'men';
    } else if (competitionName.toLowerCase().includes('ladies')) {
        countdownType = 'ladies';
    } else if (competitionName.toLowerCase().includes('mixed')) {
        countdownType = 'mixed';
    } else if (competitionName.toLowerCase().includes('open')) {
        countdownType = 'open';
    }
    updateCountdown(countdownType); 

    loadWinners(competitionId);
};

const loadWinners = async (competitionId) => {
    hallOfFameContainer.innerHTML = '<p>Loading...</p>';
    statsContent.innerHTML = '<p>Loading statistics...</p>';
    detailedWinnersContainer.innerHTML = '';
    divisionFilterContainer.style.display = 'none';

    if (!competitionId) {
        hallOfFameContainer.innerHTML = '';
        statsContent.innerHTML = '<p>Select a competition to see statistics.</p>';
        return;
    }

    try {
        const winnerDoc = await getDoc(doc(db, 'winners', competitionId));
        
        currentWinners = winnerDoc.exists() ? (Object.values(winnerDoc.data()).find(Array.isArray) || []) : [];
        currentWinners.sort((a, b) => String(b.season).localeCompare(String(a.season)));

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
    thead.innerHTML = '<tr><th>Season</th><th>Winner</th></tr>';
    const tbody = table.createTBody();

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        let winnerText;
        if (typeof entry.winner === 'object' && entry.winner !== null) {
            if (entry.winner.male && entry.winner.female) {
                winnerText = `${entry.winner.female} & ${entry.winner.male}`;
            } else if (entry.winner.player1 && entry.winner.player2) {
                winnerText = `${entry.winner.player1} & ${entry.winner.player2}`;
            } else {
                winnerText = 'N/A';
            }
        } else {
            winnerText = entry.winner || 'N/A';
        }
        row.innerHTML = `<td>${entry.season}</td><td>${winnerText}</td>`;
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
        const processWinner = (name) => {
            if (name && typeof name === 'string') {
                acc.set(name, (acc.get(name) || 0) + 1);
            }
        };

        if (typeof entry.winner === 'string' && entry.winner) {
            processWinner(entry.winner);
        } else if (typeof entry.winner === 'object' && entry.winner !== null) {
            if (entry.winner.male) processWinner(entry.winner.male);
            if (entry.winner.female) processWinner(entry.winner.female);
            if (entry.winner.player1) processWinner(entry.winner.player1);
            if (entry.winner.player2) processWinner(entry.winner.player2);
        }
        return acc;
    }, new Map());
}

// --- SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', initializePage);
