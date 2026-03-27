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
        const { individualStats, pairStats } = getPlayerStats(currentWinners);
        renderStatistics(individualStats, pairStats);
        renderDetailedWinnersList(individualStats);

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

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'styled-table';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Season</th><th>Winner</th><th>Runner-Up</th></tr>';
    
    const tbody = table.createTBody();

    const formatPairName = (data) => {
        if (typeof data === 'object' && data !== null) {
            if (data.male && data.female) return `${data.female} & ${data.male}`;
            if (data.player1 && data.player2) return `${data.player1} & ${data.player2}`;
            return 'N/A';
        }
        return data || '-';
    };

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        const winnerText = formatPairName(entry.winner);
        const runnerUpText = formatPairName(entry['runner-up'] || entry.runnerUp);
        
        row.innerHTML = `
            <td><strong>${entry.season}</strong></td>
            <td style="font-weight: bold; color: var(--club-green);">${winnerText}</td>
            <td style="color: var(--medium-grey);">${runnerUpText}</td>
        `;
    });
    
    tableContainer.appendChild(table);
    hallOfFameContainer.appendChild(tableContainer);
};

const renderStatistics = (playerStats, pairStats = new Map()) => {
    if (playerStats.size === 0) {
        statsContent.innerHTML = '<p>No winners to calculate stats for.</p>';
        return;
    }
    
    const players = [...playerStats.entries()];
    const pairs = [...pairStats.entries()];
    
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
        
        let namesText = '';
        if (count === '100% Win Rate') {
            namesText = list.map(p => p[0]).join(', ');
        } else if (list.length > 3) {
            namesText = `Shared by ${list.length} players`;
        } else {
            namesText = list.map(p => p[0]).join(', ');
        }

        return `${count}${suffix} <span style="font-weight: normal; color: var(--charcoal);">- ${namesText}</span>`;
    };

    const maxPairWins = pairs.length > 0 ? Math.max(...pairs.map(p => p[1].wins)) : 0;
    const mostWinsPairs = pairs.filter(p => p[1].wins === maxPairWins && maxPairWins > 0);

    const maxPairFinals = pairs.length > 0 ? Math.max(...pairs.map(p => p[1].total)) : 0;
    const mostFinalsPairs = pairs.filter(p => p[1].total === maxPairFinals && maxPairFinals > 0);

    const totalUniqueWinners = players.filter(p => p[1].wins > 0).length;

    statsContent.innerHTML = `
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Total Unique Individual Winners:</strong><span style="align-self: flex-start;">${totalUniqueWinners}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Wins (As a Pair):</strong><span style="align-self: flex-start;">${formatPlayerList(mostWinsPairs, maxPairWins)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Finals (As a Pair):</strong><span style="align-self: flex-start;">${formatPlayerList(mostFinalsPairs, maxPairFinals)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Individual Wins:</strong><span style="align-self: flex-start;">${formatPlayerList(mostWinsPlayers, maxWins)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Individual Runner-Ups:</strong><span style="align-self: flex-start;">${formatPlayerList(mostRunnerUpsPlayers, maxRunnerUps)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Individual Finals:</strong><span style="align-self: flex-start;">${formatPlayerList(mostFinalsPlayers, maxFinals)}</span></div>
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
    heading.textContent = 'Individual Finals Record';
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
    const pairStats = new Map();
    
    winnersArray.forEach(entry => {
        const winnerObj = entry.winner;
        const runnerUpObj = entry['runner-up'] || entry.runnerUp;
        const startYearMatch = (entry.season || '').match(/^(\d{4})/);
        const year = startYearMatch ? parseInt(startYearMatch[1], 10) : null;

        const getPairName = (obj) => {
            if (typeof obj === 'string' && obj) {
                if (obj.includes('&')) {
                    const parts = obj.split('&').map(s => s.trim()).sort();
                    return `${parts[0]} & ${parts[1]}`;
                }
                return obj;
            } else if (typeof obj === 'object' && obj !== null) {
                const p1 = obj.male || obj.player1;
                const p2 = obj.female || obj.player2;
                if (p1 && p2) {
                    const sorted = [p1, p2].sort();
                    return `${sorted[0]} & ${sorted[1]}`;
                }
            }
            return null;
        };

        const initPair = (name) => {
            if (!pairStats.has(name)) {
                pairStats.set(name, { wins: 0, total: 0 });
            }
        };

        const winnerPairName = getPairName(winnerObj);
        if (winnerPairName) {
            initPair(winnerPairName);
            pairStats.get(winnerPairName).wins += 1;
            pairStats.get(winnerPairName).total += 1;
        }

        const runnerUpPairName = getPairName(runnerUpObj);
        if (runnerUpPairName) {
            initPair(runnerUpPairName);
            pairStats.get(runnerUpPairName).total += 1;
        }

        const initPlayer = (name) => {
            if (!stats.has(name)) {
                stats.set(name, { wins: 0, runnerUps: 0, total: 0, appearances: [], winSeasons: [] });
            }
        };

        const processWinner = (name) => {
            if (name && typeof name === 'string') {
                initPlayer(name);
                stats.get(name).wins += 1;
                stats.get(name).total += 1;
                if (year) {
                    stats.get(name).appearances.push(year);
                    stats.get(name).winSeasons.push(year);
                }
            }
        };

        const processRunnerUp = (name) => {
            if (name && typeof name === 'string') {
                initPlayer(name);
                 stats.get(name).runnerUps += 1;
                 stats.get(name).total += 1;
                 if (year) stats.get(name).appearances.push(year);
            }
        };

        if (typeof winnerObj === 'string' && winnerObj) {
            processWinner(winnerObj);
        } else if (typeof winnerObj === 'object' && winnerObj !== null) {
            if (winnerObj.male) processWinner(winnerObj.male);
            if (winnerObj.female) processWinner(winnerObj.female);
            if (winnerObj.player1) processWinner(winnerObj.player1);
            if (winnerObj.player2) processWinner(winnerObj.player2);
        }

        if (typeof runnerUpObj === 'string' && runnerUpObj) {
            processRunnerUp(runnerUpObj);
        } else if (typeof runnerUpObj === 'object' && runnerUpObj !== null) {
            if (runnerUpObj.male) processRunnerUp(runnerUpObj.male);
            if (runnerUpObj.female) processRunnerUp(runnerUpObj.female);
            if (runnerUpObj.player1) processRunnerUp(runnerUpObj.player1);
            if (runnerUpObj.player2) processRunnerUp(runnerUpObj.player2);
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
            if (gap === 1) { 
                currentStreak++;
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

    return { individualStats: stats, pairStats };
}

// --- SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', initializePage);
