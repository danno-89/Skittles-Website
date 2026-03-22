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
            const playerStats = getPlayerStats(currentWinners);
            renderStatistics(playerStats);
            renderDetailedWinnersList(playerStats);
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
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'styled-table';
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
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'styled-table';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Season</th><th>Winner</th><th>Runner-Up</th></tr>';
    
    const tbody = table.createTBody();

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        const winnerText = entry.winner || 'N/A';
        const runnerUpText = entry['runner-up'] || entry.runnerUp || '-';
        
        row.innerHTML = `
            <td><strong>${entry.season}</strong></td>
            <td style="font-weight: bold; color: var(--club-green);">${winnerText}</td>
            <td style="color: var(--medium-grey);">${runnerUpText}</td>
        `;
    });
    
    tableContainer.appendChild(table);
    hallOfFameContainer.appendChild(tableContainer);
};

const renderStatistics = (playerStats) => {
    if (playerStats.size === 0) {
        statsContent.innerHTML = '<p>No winners to calculate stats for.</p>';
        return;
    }
    
    const players = [...playerStats.entries()];
    
    const maxWins = Math.max(...players.map(p => p[1].wins));
    const mostWinsPlayers = players.filter(p => p[1].wins === maxWins && maxWins > 0);
    
    const maxRunnerUps = Math.max(...players.map(p => p[1].runnerUps));
    const mostRunnerUpsPlayers = players.filter(p => p[1].runnerUps === maxRunnerUps && maxRunnerUps > 0);

    const maxFinals = Math.max(...players.map(p => p[1].total));
    const mostFinalsPlayers = players.filter(p => p[1].total === maxFinals && maxFinals > 0);

    const maxGap = Math.max(...players.map(p => p[1].maxGap));
    const maxGapPlayers = players.filter(p => p[1].maxGap === maxGap && maxGap > 0);

    const maxWinGap = Math.max(...players.map(p => p[1].maxWinGap));
    const maxWinGapPlayers = players.filter(p => p[1].maxWinGap === maxWinGap && maxWinGap > 0);

    const maxStreak = Math.max(...players.map(p => p[1].maxStreak));
    const maxStreakPlayers = players.filter(p => p[1].maxStreak === maxStreak && maxStreak > 1);

    const perfectPlayers = players.filter(p => p[1].perfectRecord);

    const formatPlayerList = (list, count, suffix = '') => {
        if (list.length === 0 || count === 0) return '-';
        const namesText = list.map(p => p[0]).join(', ');
        return `${count}${suffix} <span style="font-weight: normal; color: var(--charcoal);">- ${namesText}</span>`;
    };

    const totalUniqueWinners = players.filter(p => p[1].wins > 0).length;

    statsContent.innerHTML = `
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Total Unique Winners:</strong><span style="align-self: flex-start;">${totalUniqueWinners}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Wins:</strong><span style="align-self: flex-start;">${formatPlayerList(mostWinsPlayers, maxWins)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Runner-Up Finishes:</strong><span style="align-self: flex-start;">${formatPlayerList(mostRunnerUpsPlayers, maxRunnerUps)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Finals Appearances:</strong><span style="align-self: flex-start;">${formatPlayerList(mostFinalsPlayers, maxFinals)}</span></div>
        ${maxStreak > 1 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Longest Finals Streak:</strong><span style="align-self: flex-start;">${formatPlayerList(maxStreakPlayers, maxStreak, ' consecutive seasons')}</span></div>` : ''}
        ${maxGap > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Longest Wait Between Finals:</strong><span style="align-self: flex-start;">${formatPlayerList(maxGapPlayers, maxGap, ' seasons')}</span></div>` : ''}
        ${maxWinGap > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Longest Wait Between Wins:</strong><span style="align-self: flex-start;">${formatPlayerList(maxWinGapPlayers, maxWinGap, ' seasons')}</span></div>` : ''}
        ${perfectPlayers.length > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Undefeated in Finals (2+ apps):</strong><span style="align-self: flex-start; font-size: 0.9em;">${formatPlayerList(perfectPlayers, '100% Win Rate')}</span></div>` : ''}
    `;
};

const renderDetailedWinnersList = (playerStats) => {
    detailedWinnersContainer.innerHTML = '';
    if (playerStats.size === 0) return;

    const heading = document.createElement('h2');
    heading.textContent = 'Finals Record';
    detailedWinnersContainer.appendChild(heading);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    const table = document.createElement('table');
    table.className = 'styled-table';
    table.style.fontSize = '0.9rem';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Player</th><th style="text-align: center;">🏆</th><th style="text-align: center;">🥈</th><th style="text-align: center;">Total</th></tr>';
    
    const tbody = table.createTBody();

    const sortedPlayers = [...playerStats.entries()].sort((a, b) => {
        if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
        if (b[1].runnerUps !== a[1].runnerUps) return b[1].runnerUps - a[1].runnerUps;
        return a[0].localeCompare(b[0]);
    });

    sortedPlayers.forEach(([name, stats]) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><strong>${name}</strong></td>
            <td style="text-align: center; color: var(--club-green); font-weight: bold;">${stats.wins || '-'}</td>
            <td style="text-align: center; color: var(--medium-grey);">${stats.runnerUps || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${stats.total}</td>
        `;
    });

    tableContainer.appendChild(table);
    detailedWinnersContainer.appendChild(tableContainer);
};

function getPlayerStats(winnersArray) {
    const stats = new Map();
    
    winnersArray.forEach(entry => {
        const winner = entry.winner;
        const runnerUp = entry['runner-up'] || entry.runnerUp;
        const startYearMatch = (entry.season || '').match(/^(\d{4})/);
        const year = startYearMatch ? parseInt(startYearMatch[1], 10) : null;

        const initPlayer = (name) => {
            if (!stats.has(name)) {
                stats.set(name, { wins: 0, runnerUps: 0, total: 0, appearances: [], winSeasons: [] });
            }
        };

        if (winner && typeof winner === 'string') {
            initPlayer(winner);
            stats.get(winner).wins += 1;
            stats.get(winner).total += 1;
            if (year) {
                stats.get(winner).appearances.push(year);
                stats.get(winner).winSeasons.push(year);
            }
        }

        if (runnerUp && typeof runnerUp === 'string') {
             initPlayer(runnerUp);
             stats.get(runnerUp).runnerUps += 1;
             stats.get(runnerUp).total += 1;
             if (year) stats.get(runnerUp).appearances.push(year);
        }
    });

    stats.forEach((data, name) => {
        data.appearances.sort((a, b) => a - b);
        data.winSeasons.sort((a, b) => a - b);
        
        let maxGap = 0;
        let currentStreak = 1;
        let maxStreak = 1;
        let maxWinGap = 0;

        for (let i = 1; i < data.appearances.length; i++) {
            const gap = data.appearances[i] - data.appearances[i-1];
            if (gap > maxGap) {
                maxGap = gap;
            }
            if (gap === 1 || gap === 2) { 
                if (gap === 1) {
                    currentStreak++;
                }
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            } else {
                currentStreak = 1;
            }
        }

        for (let i = 1; i < data.winSeasons.length; i++) {
            const gap = data.winSeasons[i] - data.winSeasons[i-1];
            if (gap > maxWinGap) {
                maxWinGap = gap;
            }
        }
        
        data.maxGap = maxGap;
        data.maxWinGap = maxWinGap;
        data.maxStreak = data.appearances.length > 0 ? maxStreak : 0;
        data.perfectRecord = (data.total > 1 && data.wins === data.total);
    });

    return stats;
}

// --- SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', initializePage);
