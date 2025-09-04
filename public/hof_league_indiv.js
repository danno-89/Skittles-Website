import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

// --- DOM ELEMENTS ---
const hallOfFameContainer = document.getElementById('hall-of-fame-container');
const competitionTabsContainer = document.getElementById('competition-tabs-container');
const statsContent = document.getElementById('stats-content');
const detailedWinnersContainer = document.getElementById('detailed-winners-container');

// --- GLOBAL STATE ---
let allCompetitions = [];
let rawWinnersHistory = [];

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
    const filteredCompetitions = allCompetitions.filter(c => c.id === 'individual-average');

    if (filteredCompetitions.length === 0) {
        hallOfFameContainer.innerHTML = '<p>Individual Average competition not found.</p>';
        return;
    }

    const comp = filteredCompetitions[0];
    const tab = document.createElement('button');
    tab.className = 'tab-link active';
    tab.dataset.competitionId = comp.id;
    tab.textContent = comp.name;
    competitionTabsContainer.appendChild(tab);

    loadWinners(comp.id, comp.name);
};

const loadWinners = async (competitionId, competitionName) => {
    hallOfFameContainer.innerHTML = '<p>Loading...</p>';
    statsContent.innerHTML = '<p>Loading statistics...</p>';
    detailedWinnersContainer.innerHTML = '';

    try {
        const winnerDoc = await getDoc(doc(db, 'winners', competitionId));
        
        if (winnerDoc.exists()) {
            rawWinnersHistory = winnerDoc.data().history || [];
        } else {
            rawWinnersHistory = [];
        }
        
        renderAsTable(rawWinnersHistory, competitionName);
        const winCounts = getWinCounts(rawWinnersHistory);
        renderStatistics(winCounts);
        renderDetailedWinnersList(winCounts);

    } catch (error) {
        console.error(`Error loading winners for ${competitionId}:`, error);
        hallOfFameContainer.innerHTML = "<p>Error loading winners data.</p>";
        statsContent.innerHTML = "<p>Error generating statistics.</p>";
    }
};

const renderAsTable = (winnersHistory, competitionName) => {
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
    headerRow.innerHTML = '<th>Season</th><th>Premier Division</th><th>First Division</th><th>Second Division</th><th>Ladies</th>';

    const winnersBySeason = winnersHistory.reduce((acc, entry) => {
        const { season, division, winner, score } = entry;
        if (!acc[season]) {
            acc[season] = {};
        }
        acc[season][division] = { winner, score };
        return acc;
    }, {});

    const findRecord = (division) => {
        return winnersHistory
            .filter(entry => entry.division === division)
            .reduce((max, entry) => (entry.score > max.score ? entry : max), { score: -1 });
    };

    const premierRecord = findRecord('premier-division');
    const firstRecord = findRecord('first-division');
    const secondRecord = findRecord('second-division');
    const ladiesRecord = findRecord('ladies');

    const recordRow = tbody.insertRow();
    recordRow.className = 'club-leader';
    recordRow.innerHTML = `
        <td>Record</td>
        <td>${premierRecord.winner ? `${premierRecord.winner} <span class="games-played">[${Number(premierRecord.score).toFixed(2)}]</span> <br> <span class="record-season">(${premierRecord.season})</span>` : '-'}</td>
        <td>${firstRecord.winner ? `${firstRecord.winner} <span class="games-played">[${Number(firstRecord.score).toFixed(2)}]</span> <br> <span class="record-season">(${firstRecord.season})</span>` : '-'}</td>
        <td>${secondRecord.winner ? `${secondRecord.winner} <span class="games-played">[${Number(secondRecord.score).toFixed(2)}]</span> <br> <span class="record-season">(${secondRecord.season})</span>` : '-'}</td>
        <td>${ladiesRecord.winner ? `${ladiesRecord.winner} <span class="games-played">[${Number(ladiesRecord.score).toFixed(2)}]</span> <br> <span class="record-season">(${ladiesRecord.season})</span>` : '-'}</td>
    `;

    const sortedSeasons = Object.keys(winnersBySeason).sort((a, b) => b.localeCompare(a));

    sortedSeasons.forEach(season => {
        const row = tbody.insertRow();
        const seasonWinners = winnersBySeason[season];
        
        const premierWinner = seasonWinners['premier-division'];
        const firstWinner = seasonWinners['first-division'];
        const secondWinner = seasonWinners['second-division'];
        const ladiesWinner = seasonWinners['ladies'];

        row.innerHTML = `
            <td>${season}</td>
            <td>${premierWinner ? `${premierWinner.winner} <span class="games-played">[${Number(premierWinner.score).toFixed(2)}]</span>` : '-'}</td>
            <td>${firstWinner ? `${firstWinner.winner} <span class="games-played">[${Number(firstWinner.score).toFixed(2)}]</span>` : '-'}</td>
            <td>${secondWinner ? `${secondWinner.winner} <span class="games-played">[${Number(secondWinner.score).toFixed(2)}]</span>` : '-'}</td>
            <td>${ladiesWinner ? `${ladiesWinner.winner} <span class="games-played">[${Number(ladiesWinner.score).toFixed(2)}]</span>` : '-'}</td>
        `;
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
    if (winCounts.size === 0) {
        return;
    }

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
