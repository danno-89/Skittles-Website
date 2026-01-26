import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';
import { updateCountdown } from './hof_countdown.js';

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
let allDivisions = new Set();

// --- CONSTANTS ---
const HIGHEST_INDIVIDUAL_AVERAGE_ID = 'Highest Individual Average';
const INDIVIDUAL_AWARD_IDS = ["Ladies' Individual Knockout", "Men's Individual Knockout"];

// --- FUNCTIONS ---

const initializePage = async () => {
    try {
        const competitionsSnapshot = await getDocs(collection(db, 'competitions'));
        if (competitionsSnapshot.empty) {
            hallOfFameContainer.innerHTML = '<p>No competition data found.</p>';
            return;
        }
        allCompetitions = competitionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        divisionFilter.addEventListener('change', () => {
            const selectedCompetitionId = document.querySelector('.tabs-main .tab-link.active')?.dataset.competitionId;
            if (selectedCompetitionId === HIGHEST_INDIVIDUAL_AVERAGE_ID) {
                renderDivisionTable(currentWinners, 'Highest Individual Average', divisionFilter.value);
            }
        });

        populateCompetitionTabs();
    } catch (error) {
        console.error("Error initializing page:", error);
        hallOfFameContainer.innerHTML = "<p>Error loading competition data.</p>";
    }
};

const populateCompetitionTabs = () => {
    competitionTabsContainer.innerHTML = '';
    const filteredCompetitions = allCompetitions.filter(c => INDIVIDUAL_AWARD_IDS.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name));

    if (filteredCompetitions.length === 0) {
        hallOfFameContainer.innerHTML = '<p>No individual competitions found.</p>';
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

    // Determine the type ('men' or 'ladies') for the countdown
    let countdownType = '';
    if (competitionName.toLowerCase().includes('men')) {
        countdownType = 'men';
    } else if (competitionName.toLowerCase().includes('ladies')) {
        countdownType = 'ladies';
    }
    updateCountdown(countdownType); // Update the countdown on tab click

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

        if (competitionId === HIGHEST_INDIVIDUAL_AVERAGE_ID) {
            allDivisions = new Set(currentWinners.map(w => w.division).filter(Boolean));
            populateDivisionFilter(allDivisions);
            divisionFilterContainer.style.display = 'flex';
            renderDivisionTable(currentWinners, competitionName, 'all');
            statsContent.innerHTML = '<p>Statistics are not applicable for this view.</p>';
        } else {
            renderAsTable(currentWinners, competitionName);
            const winCounts = getWinCounts(currentWinners);
            renderStatistics(winCounts);
            renderDetailedWinnersList(winCounts);
        }
    } catch (error) {
        console.error(`Error loading winners for ${competitionId}:`, error);
        hallOfFameContainer.innerHTML = "<p>Error loading winners data.</p>";
        statsContent.innerHTML = "<p>Error generating statistics.</p>";
    }
};

const populateDivisionFilter = (divisions) => {
    divisionFilter.innerHTML = '<option value="all">All Divisions</option>';
    const orderedDivisions = ['Premier Division', 'First Division', 'Second Division', 'Third Division', 'Fourth Division', 'Ladies'];
    const sortedDivisions = [...divisions].sort((a, b) => {
        const aIndex = orderedDivisions.indexOf(a);
        const bIndex = orderedDivisions.indexOf(b);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return a.localeCompare(b);
    });
    sortedDivisions.forEach(div => {
        const option = document.createElement('option');
        option.value = div;
        option.textContent = div;
        divisionFilter.appendChild(option);
    });
};

const renderDivisionTable = (winnersArray, competitionName, divisionFilterValue = 'all') => {
    hallOfFameContainer.innerHTML = '';
    const heading = document.createElement('h2');
    heading.className = 'competition-heading';
    heading.textContent = competitionName;
    hallOfFameContainer.appendChild(heading);

    const filteredWinners = divisionFilterValue === 'all'
        ? winnersArray
        : winnersArray.filter(w => w.division === divisionFilterValue);

    const dataBySeason = {};
    const visibleDivisions = new Set(filteredWinners.map(w => w.division).filter(Boolean));

    filteredWinners.forEach(entry => {
        if (!dataBySeason[entry.season]) dataBySeason[entry.season] = {};
        dataBySeason[entry.season][entry.division] = entry.winner;
    });

    const divisionColumns = divisionFilterValue === 'all'
        ? Array.from(allDivisions)
        : [divisionFilterValue];

    const tableContainer = document.createElement('div');
    tableContainer.className = 'winners-table-container';

    const table = document.createElement('table');
    table.className = 'division-winner-table';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headerRow.innerHTML = `<th>Season</th>`;
    divisionColumns.forEach(div => headerRow.innerHTML += `<th>${div}</th>`);

    const tbody = table.createTBody();
    Object.keys(dataBySeason).sort((a, b) => b.localeCompare(a)).forEach(season => {
        const row = tbody.insertRow();
        row.insertCell().textContent = season;
        divisionColumns.forEach(div => {
            row.insertCell().textContent = dataBySeason[season][div] || '';
        });
    });
    tableContainer.appendChild(table)
    hallOfFameContainer.appendChild(tableContainer);
};

const renderAsTable = (winnersArray, competitionName) => {
    hallOfFameContainer.innerHTML = '';
    const heading = document.createElement('h2');
    heading.className = 'competition-heading';
    heading.textContent = competitionName;
    hallOfFameContainer.appendChild(heading);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'winners-table-container';

    const table = document.createElement('table');
    table.className = 'winners-table';
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Season</th><th>Winner</th></tr>';
    const tbody = table.createTBody();

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        const winnerText = entry.winner || 'N/A';
        row.innerHTML = `<td>${entry.season}</td><td>${winnerText}</td>`;
    });
    tableContainer.appendChild(table)
    hallOfFameContainer.appendChild(tableContainer);
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
