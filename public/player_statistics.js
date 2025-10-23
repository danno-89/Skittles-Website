import { db, collection, getDocs, query, where, doc, getDoc, documentId } from './firebase.config.js';

// --- Global State ---
let allPlayersData = new Map();
let allTeamsData = new Map();
let allCompetitionsData = new Map();
let allMatchResults = [];
let leagueTablesData = null;

let calculatedAverages = [];
let calculatedSpares = [];
let calculatedHighScores = [];

// --- Helper Functions ---
const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = d.getDate();
    const year = d.getFullYear().toString().slice(-2);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    return `${day} ${month} ${year}`;
};

const getWeekDateRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const diffToSunday = dayOfWeek; 
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToSunday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
};

// --- Data Fetching and Calculation ---
async function fetchAndCalculateAllData() {
    try {
        // Step 1: Fetch core data
        const [playersSnapshot, teamsSnapshot, competitionsSnapshot] = await Promise.all([
            getDocs(collection(db, "players_public")),
            getDocs(collection(db, "teams")),
            getDocs(collection(db, "competitions"))
        ]);
        playersSnapshot.forEach(doc => allPlayersData.set(doc.id, { id: doc.id, ...doc.data() }));
        teamsSnapshot.forEach(doc => allTeamsData.set(doc.id, { id: doc.id, ...doc.data() }));
        competitionsSnapshot.forEach(doc => allCompetitionsData.set(doc.id, doc.data()));

        // Step 2: Fetch current season and match data
        const seasonsQuery = query(collection(db, "seasons"), where("status", "==", "current"));
        const seasonsSnapshot = await getDocs(seasonsQuery);
        if (seasonsSnapshot.empty) {
            console.warn("No 'current' season found.");
            return;
        }
        const currentSeasonId = seasonsSnapshot.docs[0].id;

        const resultsQuery = query(collection(db, "match_results"), where("season", "==", currentSeasonId));
        const [resultsSnapshot, leagueTableSnap] = await Promise.all([
            getDocs(resultsQuery),
            getDoc(doc(db, "league_tables", currentSeasonId))
        ]);
        allMatchResults = resultsSnapshot.docs.map(doc => doc.data());
        leagueTablesData = leagueTableSnap.exists() ? leagueTableSnap.data() : null;

        // Step 3: Calculate all stats
        calculateAllStats();

    } catch (error)
        {
        console.error("Error fetching and calculating data:", error);
    }
}

function calculateAllStats() {
    calculatedAverages = calculateAverages(allMatchResults, allPlayersData, allTeamsData, allCompetitionsData, leagueTablesData);
    calculatedSpares = calculateSpares(allMatchResults, allPlayersData);
    calculatedHighScores = calculateHighScores(allMatchResults, allPlayersData, allTeamsData);
}

function calculateAverages(matches, players, teams, competitions, leagueTables) {
    const playerStats = new Map();
    const teamGamesPlayed = new Map();
    const { start: weekStart, end: weekEnd } = getWeekDateRange();

    const completedLeagueMatches = matches.filter(match =>
        match.status === 'completed' &&
        (match.division === 'premier-division' || match.division === 'first-division')
    );

    completedLeagueMatches.forEach(match => {
        teamGamesPlayed.set(match.homeTeamId, (teamGamesPlayed.get(match.homeTeamId) || 0) + 1);
        teamGamesPlayed.set(match.awayTeamId, (teamGamesPlayed.get(match.awayTeamId) || 0) + 1);
        const matchDate = match.scheduledDate.toDate();
        const isThisWeek = matchDate >= weekStart && matchDate <= weekEnd;

        [...(match.homeScores || []), ...(match.awayScores || [])].forEach(playerScore => {
            const { playerId, score } = playerScore;
            if (!playerId || playerId === 'sixthPlayer') return;

            const stats = playerStats.get(playerId) || {
                totalPins: 0, gamesPlayed: 0, pinsThisWeek: [], gamesThisWeek: 0
            };
            stats.totalPins += score;
            stats.gamesPlayed += 1;
            if (isThisWeek) {
                stats.pinsThisWeek.push(score);
                stats.gamesThisWeek += 1;
            }
            playerStats.set(playerId, stats);
        });
    });

    const allPlayerAverages = Array.from(playerStats.entries()).map(([playerId, stats]) => {
        const player = players.get(playerId);
        const team = player ? teams.get(player.teamId) : null;
        const competition = team ? competitions.get(team.division) : null;
        const totalTeamGames = team ? teamGamesPlayed.get(player.teamId) || 0 : 0;
        
        const totalPinsThisWeek = stats.pinsThisWeek.reduce((a, b) => a + b, 0);
        const pinsBeforeThisWeek = stats.totalPins - totalPinsThisWeek;
        const gamesBeforeThisWeek = stats.gamesPlayed - stats.gamesThisWeek;

        const averageBeforeThisWeek = gamesBeforeThisWeek > 0 ? (pinsBeforeThisWeek / gamesBeforeThisWeek) : 0;
        const currentAverage = stats.gamesPlayed > 0 ? (stats.totalPins / stats.gamesPlayed) : 0;
        const averageMovement = (stats.gamesThisWeek > 0 && averageBeforeThisWeek > 0) ? (currentAverage - averageBeforeThisWeek) : 0;

        return {
            playerId,
            name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            teamName: team ? team.name : 'Unknown',
            teamId: player ? player.teamId : null,
            division: player ? player.division : 'N/A',
            league: competition ? competition.shortName : 'N/A',
            gamesPlayed: stats.gamesPlayed,
            totalPins: stats.totalPins,
            pinsThisWeek: stats.pinsThisWeek,
            average: currentAverage.toFixed(2),
            rawAverage: currentAverage,
            averageMovement,
            eligible: stats.gamesPlayed >= (totalTeamGames / 2),
            totalTeamGames
        };
    }).sort((a, b) => b.rawAverage - a.rawAverage);

    let rankCounter = 0;
    let lastAvgForRank = null;
    allPlayerAverages.forEach((p, i) => {
        if (p.average !== lastAvgForRank) rankCounter = i + 1;
        p.overallRank = rankCounter;
        lastAvgForRank = p.average;
    });

    const highestAverages = { 'PDIV': 0, 'FDIV': 0, "Ladies'": 0 };
    allPlayerAverages.forEach(player => {
        if (player.eligible) {
            if (player.league === 'PDIV' && player.rawAverage > highestAverages['PDIV']) highestAverages['PDIV'] = player.rawAverage;
            if (player.league === 'FDIV' && player.rawAverage > highestAverages['FDIV']) highestAverages['FDIV'] = player.rawAverage;
            if (player.division === "Ladies'" && player.rawAverage > highestAverages["Ladies'"]) highestAverages["Ladies'"] = player.rawAverage;
        }
    });

    allPlayerAverages.forEach(player => {
        player.isDivisionLeader = false;
        if (player.eligible) {
            if (player.league === 'PDIV' && player.rawAverage === highestAverages['PDIV'] && highestAverages['PDIV'] > 0) player.isDivisionLeader = true;
            if (player.league === 'FDIV' && player.rawAverage === highestAverages['FDIV'] && highestAverages['FDIV'] > 0) player.isDivisionLeader = true;
            if (player.division === "Ladies'" && player.rawAverage === highestAverages["Ladies'"] && highestAverages["Ladies'"] > 0) player.isDivisionLeader = true;
        }
    });

    return allPlayerAverages;
}

function calculateSpares(matches, players) {
    const spareStats = new Map();
    matches.forEach(match => {
        if (match.status !== 'completed') return;
        [...(match.homeScores || []), ...(match.awayScores || [])].forEach(playerScore => {
            if (!playerScore.playerId || !playerScore.hands || playerScore.playerId === 'sixthPlayer') return;
            const playerSpares = playerScore.hands.filter(hand => hand >= 10);
            if (playerSpares.length > 0) {
                const stats = spareStats.get(playerScore.playerId) || { count: 0, totalPins: 0 };
                stats.count += playerSpares.length;
                stats.totalPins += playerSpares.reduce((sum, pins) => sum + pins, 0);
                spareStats.set(playerScore.playerId, stats);
            }
        });
    });
    
    return Array.from(spareStats.entries()).map(([playerId, stats]) => {
        const player = players.get(playerId);
        const team = player ? allTeamsData.get(player.teamId) : null;
        const competition = team ? allCompetitionsData.get(team.division) : null;
        return {
            playerId, name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            teamName: team ? team.name : 'Unknown',
            teamId: player ? player.teamId : null, division: player ? player.division : 'N/A',
            league: competition ? competition.shortName : 'N/A', spares: stats.count,
            extraPins: stats.totalPins - (stats.count * 9),
            average: (stats.totalPins / stats.count).toFixed(2)
        };
    }).sort((a, b) => b.spares - a.spares || b.extraPins - a.extraPins || a.name.localeCompare(b.name));
}

function calculateHighScores(matches, players, teams) {
    const highScores = new Map();
    matches.forEach(match => {
        if (match.status !== 'completed') return;
        const processScores = (scores, opponentId) => {
            if (!scores) return;
            scores.forEach(playerScore => {
                const { playerId, score } = playerScore;
                if (!playerId || playerId === 'sixthPlayer') return;
                const opponentName = teams.get(opponentId)?.name || 'Unknown';
                const matchDate = match.scheduledDate.toDate();

                if (!highScores.has(playerId) || score > highScores.get(playerId).score || (score === highScores.get(playerId).score && matchDate < highScores.get(playerId).date)) {
                    highScores.set(playerId, { score, date: matchDate, opponent: opponentName });
                }
            });
        };
        processScores(match.homeScores, match.awayTeamId);
        processScores(match.awayScores, match.homeTeamId);
    });

    return Array.from(highScores.entries()).map(([playerId, data]) => {
        const player = players.get(playerId);
        const team = player ? teams.get(player.teamId) : null;
        const competition = team ? allCompetitionsData.get(team.division) : null;
        return {
            playerId, name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            teamName: team ? team.name : 'Unknown', teamId: player ? player.teamId : null,
            division: player ? player.division : 'N/A', league: competition ? competition.shortName : 'N/A',
            score: data.score, date: data.date, opponent: data.opponent
        };
    }).sort((a, b) => b.score - a.score || a.date - b.date);
}

// --- DOM Rendering Functions ---
function populateFilters() {
    const uniqueTeams = [...new Set(calculatedAverages.map(p => p.teamName))].sort();
    const uniqueDivisions = [...new Set(calculatedAverages.map(p => p.division))].filter(d => d && d !== 'N/A').sort();
    const uniqueLeagues = [...new Set(calculatedAverages.map(p => p.league))].sort();

    const teamFilter = document.getElementById('team-filter');
    const divisionFilter = document.getElementById('division-filter');
    const leagueFilter = document.getElementById('league-filter');

    teamFilter.innerHTML = `<option value="">All Teams</option>${uniqueTeams.map(t => `<option value="${t}">${t}</option>`).join('')}`;
    divisionFilter.innerHTML = `<option value="">All Divisions</option>${uniqueDivisions.map(d => `<option value="${d}">${d}</option>`).join('')}`;
    leagueFilter.innerHTML = `<option value="">All Leagues</option>${uniqueLeagues.map(l => `<option value="${l}">${l}</option>`).join('')}`;
}

function renderCurrentTab() {
    const activeTab = document.querySelector('.tab-link.active')?.dataset.tab;
    if (activeTab === 'averages') renderAverages();
    if (activeTab === 'spares') renderSpares();
    if (activeTab === 'high-scores') renderHighScores();
}

function renderAverages() {
    const container = document.getElementById('averages-content');
    if (!container) return;
    const tableContainer = container.querySelector('.stats-table-container') || document.createElement('div');
    tableContainer.className = 'stats-table-container';
    container.innerHTML = ''; 
    container.appendChild(tableContainer);

    if (calculatedAverages.length === 0) {
        tableContainer.innerHTML = '<p>No completed league match results found for the current season.</p>';
        return;
    }

    const teamFilter = document.getElementById('team-filter').value;
    const divisionFilter = document.getElementById('division-filter').value;
    const leagueFilter = document.getElementById('league-filter').value;
    const hideIneligible = document.getElementById('hide-ineligible-filter').checked;
    const isFiltered = teamFilter || divisionFilter || leagueFilter;

    const filteredPlayers = calculatedAverages.filter(player => {
        if (hideIneligible && !player.eligible) return false;
        if (teamFilter && player.teamName !== teamFilter) return false;
        if (divisionFilter && player.division !== divisionFilter) return false;
        if (leagueFilter && player.league !== leagueFilter) return false;
        return true;
    });

    let tableHTML = `<table class="stats-table"><thead><tr>
                    <th>Rank</th><th></th><th class="player-col">Player</th><th class="team-col">Team</th>
                    <th colspan="2" class="divisions-header">Divisions</th>
                    <th>PLD</th><th class="total-pins-header">Total Pins</th><th class="main-stat">Average</th><th>Movement</th>
                    </tr></thead><tbody>`;
    let lastAverage = null;
    filteredPlayers.forEach((player, index) => {
        let rank = index + 1;
        if (lastAverage && player.average === lastAverage) rank = '=';

        const rankDisplay = isFiltered ? `${rank} (${player.overallRank})` : rank;
        const rowClass = `${player.eligible ? '' : 'ineligible-player'} ${player.isDivisionLeader ? 'division-leader' : ''}`;
        const weeklyScoreEl = player.pinsThisWeek.length > 0 ? `<span class="weekly-score-value">+${player.pinsThisWeek.join(' +')}</span>` : `<span class="weekly-score-value"></span>`;
        const pinsCellContent = `<div class="total-pins-cell"><span class="total-pins-value">${player.totalPins.toLocaleString()}</span>${weeklyScoreEl}</div>`;
        
        let movementDisplay = '-';
        let movementClass = '';
        if (player.averageMovement > 0.0001) {
            movementDisplay = `+${player.averageMovement.toFixed(2)}`;
            movementClass = 'movement-positive';
        } else if (player.averageMovement < -0.0001) {
            movementDisplay = player.averageMovement.toFixed(2);
            movementClass = 'movement-negative';
        }

        tableHTML += `<tr class="${rowClass.trim()}">
            <td>${rankDisplay}</td>
            <td class="profile-icon-cell"><a href="public-profile.html?playerId=${player.playerId}"><icon-component name="user-id"></icon-component></a></td>
            <td class="player-col">${player.name}</td>
            <td class="team-col">${player.teamName}</td>
            <td class="division-col">${player.division}</td>
            <td class="league-col">${player.league}</td>
            <td>${player.gamesPlayed} <span class="team-games-played">[${player.totalTeamGames}]</span></td>
            <td>${pinsCellContent}</td>
            <td class="main-stat">${player.average}</td>
            <td class="movement-cell ${movementClass}">${movementDisplay}</td>
            </tr>`;
        lastAverage = player.average;
    });
    tableHTML += `</tbody></table>`;
    tableContainer.innerHTML = tableHTML;
}

function renderSpares() {
    const container = document.getElementById('spares-content');
    if (!container) return;
    
    const teamFilter = document.getElementById('team-filter').value;
    const divisionFilter = document.getElementById('division-filter').value;
    const leagueFilter = document.getElementById('league-filter').value;

    const filteredSpares = calculatedSpares.filter(player => {
        if (teamFilter && player.teamName !== teamFilter) return false;
        if (divisionFilter && player.division !== divisionFilter) return false;
        if (leagueFilter && player.league !== leagueFilter) return false;
        return true;
    });

    const narrativeHTML = `<div class="stats-narrative"><p>A spare is defined as any score of 10 and above.</p></div>`;
    let tableHTML = `<div class="stats-table-container"><table class="stats-table"><thead><tr><th>Rank</th><th></th><th class="player-col">Player</th><th class="team-col">Team</th><th class="main-stat">Spares</th><th>Extra Pins</th><th>Average</th></tr></thead><tbody>`;
    let lastPlayerStats = null;
    filteredSpares.forEach((player, index) => {
        let rank = index + 1;
        if (lastPlayerStats && player.spares === lastPlayerStats.spares && player.extraPins === lastPlayerStats.extraPins) rank = `=`;
        tableHTML += `<tr>
            <td>${rank}</td>
            <td class="profile-icon-cell"><a href="public-profile.html?playerId=${player.playerId}"><icon-component name="user-id"></icon-component></a></td>
            <td class="player-col">${player.name}</td>
            <td class="team-col">${player.teamName}</td>
            <td class="main-stat">${player.spares}</td>
            <td>${player.extraPins}</td>
            <td>${player.average}</td>
            </tr>`;
        lastPlayerStats = player;
    });
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = narrativeHTML + tableHTML;
}

function renderHighScores() {
    const container = document.getElementById('high-scores-content');
    if (!container) return;

    const teamFilter = document.getElementById('team-filter').value;
    const divisionFilter = document.getElementById('division-filter').value;
    const leagueFilter = document.getElementById('league-filter').value;

    const filteredHighScores = calculatedHighScores.filter(player => {
        if (teamFilter && player.teamName !== teamFilter) return false;
        if (divisionFilter && player.division !== divisionFilter) return false;
        if (leagueFilter && player.league !== leagueFilter) return false;
        return true;
    });
    
    const narrativeHTML = `<div class="stats-narrative"><p>A High Score is an individual score achieved in any league or cup fixture.</p></div>`;
    let tableHTML = `<div class="stats-table-container"><table class="stats-table"><thead><tr><th>Rank</th><th></th><th class="player-col">Player</th><th class="team-col">Team</th><th class="main-stat">High Score</th><th>Date</th><th class="opponent-col">Opponent</th></tr></thead><tbody>`;
    let lastScore = null;
    filteredHighScores.forEach((player, index) => {
        let rank = index + 1;
        if (lastScore && player.score === lastScore) rank = `=`;
        tableHTML += `<tr>
            <td>${rank}</td>
            <td class="profile-icon-cell"><a href="public-profile.html?playerId=${player.playerId}"><icon-component name="user-id"></icon-component></a></td>
            <td class="player-col">${player.name}</td>
            <td class="team-col">${player.teamName}</td>
            <td class="main-stat">${player.score}</td>
            <td>${formatDate(player.date)}</td>
            <td class="opponent-col">vs ${player.opponent}</td>
            </tr>`;
        lastScore = player.score;
    });
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = narrativeHTML + tableHTML;
}


// --- Event Handling and Initialization ---
function setupTabsAndFilters() {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const teamFilter = document.getElementById('team-filter');
    const divisionFilter = document.getElementById('division-filter');
    const leagueFilter = document.getElementById('league-filter');
    const hideIneligibleFilter = document.getElementById('hide-ineligible-filter');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            tabPanes.forEach(pane => {
                const tabName = tab.dataset.tab;
                pane.classList.toggle('active', pane.id === `${tabName}-content`);
            });
            
            const isAveragesTab = tab.dataset.tab === 'averages';
            document.getElementById('stats-header-container').style.display = isAveragesTab ? 'flex' : 'none';

            renderCurrentTab();
        });
    });

    const handleFilterChange = (changedFilter) => {
        const filters = [teamFilter, divisionFilter, leagueFilter];
        filters.forEach(filter => {
            if (filter !== changedFilter && changedFilter.value !== '') {
                filter.disabled = true;
            } else {
                filter.disabled = false;
            }
        });
        renderCurrentTab();
    };
    
    teamFilter.addEventListener('change', () => handleFilterChange(teamFilter));
    divisionFilter.addEventListener('change', () => handleFilterChange(divisionFilter));
    leagueFilter.addEventListener('change', () => handleFilterChange(leagueFilter));
    hideIneligibleFilter.addEventListener('change', renderCurrentTab);

    clearFiltersBtn.addEventListener('click', () => {
        teamFilter.value = '';
        divisionFilter.value = '';
        leagueFilter.value = '';
        hideIneligibleFilter.checked = true;
        handleFilterChange({value: ''});
    });
}

async function initializePage() {
    document.getElementById('averages-content').innerHTML = '<p>Loading statistics...</p>';
    await fetchAndCalculateAllData();
    populateFilters();
    setupTabsAndFilters();
    renderCurrentTab();
    
    const activeTab = document.querySelector('.tab-link.active')?.dataset.tab;
    const isAveragesTab = activeTab === 'averages';
    document.getElementById('stats-header-container').style.display = isAveragesTab ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', initializePage);
