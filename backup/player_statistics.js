import { db, collection, getDocs, query, where, doc, getDoc, documentId } from './firebase.config.js';

let allPlayersData = null;
let allTeamsData = null;
let allMatchResults = null;
let allCompetitionsData = null;
let currentSeasonId = null;
let leagueTablesData = null;

// --- Helper Functions ---
const formatDate = (date) => {
    if (!date) return 'N/A';
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
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


// --- Data Fetching ---
async function fetchAllData() {
    if (allPlayersData && allTeamsData && allCompetitionsData) return { players: allPlayersData, teams: allTeamsData, competitions: allCompetitionsData };

    allPlayersData = new Map();
    allTeamsData = new Map();
    allCompetitionsData = new Map();

    try {
        const [playersSnapshot, teamsSnapshot, competitionsSnapshot] = await Promise.all([
            getDocs(collection(db, "players_public")),
            getDocs(collection(db, "teams")),
            getDocs(collection(db, "competitions"))
        ]);

        playersSnapshot.forEach(doc => allPlayersData.set(doc.id, { id: doc.id, ...doc.data() }));
        teamsSnapshot.forEach(doc => allTeamsData.set(doc.id, doc.data()));
        competitionsSnapshot.forEach(doc => allCompetitionsData.set(doc.id, doc.data()));

    } catch (error) {
        console.error("Error fetching core data:", error);
    }
    return { players: allPlayersData, teams: allTeamsData, competitions: allCompetitionsData };
}

async function fetchCurrentSeasonData() {
    if (allMatchResults && leagueTablesData) return { matches: allMatchResults, leagueTables: leagueTablesData };
    try {
        const seasonsQuery = query(collection(db, "seasons"), where("status", "==", "current"));
        const seasonsSnapshot = await getDocs(seasonsQuery);
        if (seasonsSnapshot.empty) {
            console.warn("No 'current' season found.");
            return { matches: [], leagueTables: null };
        }
        currentSeasonId = seasonsSnapshot.docs[0].id;

        const resultsQuery = query(collection(db, "match_results"), where("season", "==", currentSeasonId));
        const [resultsSnapshot, leagueTableSnap] = await Promise.all([
            getDocs(resultsQuery),
            getDoc(doc(db, "league_tables", currentSeasonId))
        ]);

        allMatchResults = resultsSnapshot.docs.map(doc => doc.data());
        leagueTablesData = leagueTableSnap.exists() ? leagueTableSnap.data() : null;

        return { matches: allMatchResults, leagueTables: leagueTablesData };
    } catch (error) {
        console.error("Error fetching current season data:", error);
        return { matches: [], leagueTables: null };
    }
}


// --- Calculation Functions ---
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
                totalPins: 0,
                gamesPlayed: 0,
                pinsThisWeek: [],
                gamesThisWeek: 0
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
            name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            teamName: team ? team.name : 'Unknown',
            division: player ? player.division : 'N/A',
            league: competition ? competition.shortName : 'N/A',
            gamesPlayed: stats.gamesPlayed,
            totalPins: stats.totalPins,
            pinsThisWeek: stats.pinsThisWeek,
            average: currentAverage.toFixed(2),
            rawAverage: currentAverage,
            averageMovement: averageMovement,
            eligible: stats.gamesPlayed >= (totalTeamGames / 2),
            totalTeamGames: totalTeamGames
        };
    }).sort((a, b) => b.rawAverage - a.rawAverage);


    // --- Add Overall Rank ---
    let rankCounter = 0;
    let lastAvgForRank = null;
    allPlayerAverages.forEach((p, i) => {
        if (p.average !== lastAvgForRank) {
            rankCounter = i + 1;
        }
        p.overallRank = rankCounter;
        lastAvgForRank = p.average;
    });

    // Find the highest average for each division
    const highestAverages = {
        'PDIV': 0,
        'FDIV': 0,
        "Ladies'": 0
    };
    
    allPlayerAverages.forEach(player => {
        if (player.eligible) {
            if (player.league === 'PDIV' && player.rawAverage > highestAverages['PDIV']) {
                highestAverages['PDIV'] = player.rawAverage;
            }
            if (player.league === 'FDIV' && player.rawAverage > highestAverages['FDIV']) {
                highestAverages['FDIV'] = player.rawAverage;
            }
            if (player.division === "Ladies'" && player.rawAverage > highestAverages["Ladies'"]) {
                highestAverages["Ladies'"] = player.rawAverage;
            }
        }
    });

    // Add a flag to the players with the highest average
    allPlayerAverages.forEach(player => {
        player.isDivisionLeader = false; // Reset first
        if (player.eligible) {
            if (player.league === 'PDIV' && player.rawAverage === highestAverages['PDIV'] && highestAverages['PDIV'] > 0) {
                player.isDivisionLeader = true;
            }
            if (player.league === 'FDIV' && player.rawAverage === highestAverages['FDIV'] && highestAverages['FDIV'] > 0) {
                player.isDivisionLeader = true;
            }
            if (player.division === "Ladies'" && player.rawAverage === highestAverages["Ladies'"] && highestAverages["Ladies'"] > 0) {
                player.isDivisionLeader = true;
            }
        }
    });

    return allPlayerAverages;
}


function calculateSpares(matches) {
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
    return spareStats;
}

function calculateHighScores(matches, teams) {
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
    return highScores;
}

// --- Rendering Functions ---
async function displayAverages() {
    const container = document.getElementById('averages-content');
    const headerContainer = document.getElementById('stats-header-container');
    headerContainer.innerHTML = ''; 

    let tableContainer = container.querySelector('.stats-table-container');
    if (!tableContainer) {
        tableContainer = document.createElement('div');
        tableContainer.className = 'stats-table-container';
        container.appendChild(tableContainer);
    }

    tableContainer.innerHTML = '<p>Calculating averages...</p>';
    
    const [{ players, teams, competitions }, { matches, leagueTables }] = await Promise.all([fetchAllData(), fetchCurrentSeasonData()]);

    if (matches.length === 0) {
        tableContainer.innerHTML = '<p>No completed league match results found for the current season.</p>';
        return;
    }

    const allPlayerAverages = calculateAverages(matches, players, teams, competitions, leagueTables);

    const uniqueTeams = [...new Set(allPlayerAverages.map(p => p.teamName))].sort();
    const uniqueDivisions = [...new Set(allPlayerAverages.map(p => p.division))].sort();
    const uniqueLeagues = [...new Set(allPlayerAverages.map(p => p.league))].sort();

    headerContainer.innerHTML = `
        <div class="filters-container">
            <div class="filter-dropdowns">
                <select id="team-filter" class="form-select">
                    <option value="">All Teams</option>
                    ${uniqueTeams.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <select id="division-filter" class="form-select">
                    <option value="">All Divisions</option>
                    ${uniqueDivisions.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
                <select id="league-filter" class="form-select">
                    <option value="">All Leagues</option>
                    ${uniqueLeagues.map(l => `<option value="${l}">${l}</option>`).join('')}
                </select>
            </div>
            <label class="checkbox-label">
                <input type="checkbox" id="eligible-only-filter">
                Show eligible players only
            </label>
        </div>
        <details class="stats-key">
            <summary>Key</summary>
            <div class="key-items-container">
                <div class="key-item division-leader">Club Leader</div>
                <div class="key-item ineligible-player">Ineligible Player</div>
                <div class="key-item"><span class="key-example">[X]</span> Team Games Played</div>
                <div class="key-item"><span class="key-example">X (Y)</span> Filtered Rank (Overall Rank)</div>
            </div>
        </details>
    `;

    const teamFilter = document.getElementById('team-filter');
    const divisionFilter = document.getElementById('division-filter');
    const leagueFilter = document.getElementById('league-filter');
    const eligibleFilter = document.getElementById('eligible-only-filter');

    const render = () => {
        const selectedTeam = teamFilter.value;
        const selectedDivision = divisionFilter.value;
        const selectedLeague = leagueFilter.value;
        const showEligibleOnly = eligibleFilter.checked;
        const isFiltered = selectedTeam || selectedDivision || selectedLeague;

        const filteredPlayers = allPlayerAverages.filter(player => {
            if (showEligibleOnly && !player.eligible) return false;
            if (selectedTeam && player.teamName !== selectedTeam) return false;
            if (selectedDivision && player.division !== selectedDivision) return false;
            if (selectedLeague && player.league !== selectedLeague) return false;
            return true;
        });

        let tableHTML = `<div class="stats-table-container"><table class="stats-table"><thead><tr>
                        <th>Rank</th><th class="player-col">Player</th><th class="team-col">Team</th>
                        <th colspan="2" class="divisions-header">Divisions</th>
                        <th>PLD</th><th class="total-pins-header">Total Pins</th><th class="main-stat">Average</th><th>Movement</th>
                        </tr></thead><tbody>`;
        let lastAverage = null;
        filteredPlayers.forEach((player, index) => {
            let rank = index + 1;
            if (lastAverage && player.average === lastAverage) {
                rank = '=';
            }

            let rankDisplay = rank;
            if (isFiltered) {
                rankDisplay = `${rank} (${player.overallRank})`;
            }
            
            let rowClass = player.eligible ? '' : 'ineligible-player';
            if (player.isDivisionLeader) {
                rowClass += ' division-leader';
            }
            
            const weeklyScoreEl = player.pinsThisWeek.length > 0
                ? `<span class="weekly-score-value">+${player.pinsThisWeek.join(' +')}</span>`
                : `<span class="weekly-score-value"></span>`; // Empty span to maintain alignment

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
        tableHTML += `</tbody></table></div>`;

        tableContainer.innerHTML = tableHTML;
    };

    [teamFilter, divisionFilter, leagueFilter, eligibleFilter].forEach(el => {
        el.addEventListener('change', render);
    });
    
    render();
}


async function displaySpareCounts() {
    const container = document.getElementById('spares-content');
    container.innerHTML = '<p>Calculating...</p>';
    document.getElementById('stats-header-container').innerHTML = '';
    const [{ players, teams }, { matches }] = await Promise.all([fetchAllData(), fetchCurrentSeasonData()]);
    if (matches.length === 0) { container.innerHTML = '<p>No match results found.</p>'; return; }

    const spareStats = calculateSpares(matches);
    const sortedSpares = Array.from(spareStats.entries()).map(([playerId, stats]) => {
        const player = players.get(playerId);
        const team = player ? teams.get(player.teamId) : null;
        return {
            name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            teamName: team ? team.name : 'Unknown',
            spares: stats.count,
            extraPins: stats.totalPins - (stats.count * 9),
            average: (stats.totalPins / stats.count).toFixed(2)
        };
    }).sort((a, b) => b.spares - a.spares || b.extraPins - a.extraPins || a.name.localeCompare(b.name));

    const narrativeHTML = `<div class="stats-narrative"><p>For the purposes of this statistic, a spare is defined as any score of 10 and above.</p><p>Whilst it is possible to score a spare and miss with the remaining ball, this cannot be accurately accounted for using the current system of score input, hence the definition above.</p></div>`;
    let tableHTML = `<div class="stats-table-container"><table class="stats-table"><thead><tr><th>Rank</th><th class="player-col">Player</th><th class="team-col">Team</th><th class="main-stat">Spares</th><th>Extra Pins</th><th>Average</th></tr></thead><tbody>`;
    let lastPlayerStats = null;
    sortedSpares.forEach((player, index) => {
        let rank = index + 1;
        if (lastPlayerStats && player.spares === lastPlayerStats.spares && player.extraPins === lastPlayerStats.extraPins) rank = `=`;
        tableHTML += `<tr><td>${rank}</td><td class="player-col">${player.name}</td><td class="team-col">${player.teamName}</td><td class="main-stat">${player.spares}</td><td>${player.extraPins}</td><td>${player.average}</td></tr>`;
        lastPlayerStats = player;
    });
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = narrativeHTML + tableHTML;
}

async function displayHighScores() {
    const container = document.getElementById('high-scores-content');
    container.innerHTML = '<p>Calculating...</p>';
    document.getElementById('stats-header-container').innerHTML = '';
    const [{ players, teams }, { matches }] = await Promise.all([fetchAllData(), fetchCurrentSeasonData()]);
    if (matches.length === 0) { container.innerHTML = '<p>No match results found.</p>'; return; }

    const highScores = calculateHighScores(matches, teams);
    const sortedHighScores = Array.from(highScores.entries()).map(([playerId, data]) => {
        const player = players.get(playerId);
        const team = player ? teams.get(player.teamId) : null;
        return {
            name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            teamName: team ? team.name : 'Unknown',
            score: data.score,
            date: data.date,
            opponent: data.opponent
        };
    }).sort((a, b) => b.score - a.score || a.date - b.date);

    const narrativeHTML = `<div class="stats-narrative"><p>A High Score is any individual score a player achieves in any of the league or cup fixtures.</p></div>`;
    let tableHTML = `<div class="stats-table-container"><table class="stats-table"><thead><tr><th>Rank</th><th class="player-col">Player</th><th class="team-col">Team</th><th class="main-stat">High Score</th><th>Date</th><th class="opponent-col">Opponent</th></tr></thead><tbody>`;
    let lastScore = null;
    sortedHighScores.forEach((player, index) => {
        let rank = index + 1;
        if (lastScore && player.score === lastScore) rank = `=`;
        tableHTML += `<tr><td>${rank}</td><td class="player-col">${player.name}</td><td class="team-col">${player.teamName}</td><td class="main-stat">${player.score}</td><td>${formatDate(player.date)}</td><td class="opponent-col">vs ${player.opponent}</td></tr>`;
        lastScore = player.score;
    });
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = narrativeHTML + tableHTML;
}

// --- Tab Setup and Initialization ---
function setupTabsAndFilters() {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabsToggleBtn = document.getElementById('tabs-toggle-btn');
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const tabsContainer = document.getElementById('tabs-container');
    const filtersContainer = document.getElementById('filters-container-collapsible');
    const mobileControls = document.querySelector('.mobile-controls');
    const isMobile = window.innerWidth <= 768;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanes.forEach(pane => pane.id === `${tabName}-content` ? pane.classList.add('active') : pane.classList.remove('active'));
            
            const isAveragesTab = tabName === 'averages';
            document.getElementById('stats-header-container').style.display = isAveragesTab ? 'block' : 'none';
            if(isMobile) {
                mobileControls.style.display = isAveragesTab ? 'flex' : 'none';
            }


            if (tabName === 'spares') displaySpareCounts();
            if (tabName === 'high-scores') displayHighScores();
            if (tabName === 'averages') displayAverages();
        });
    });

    tabsToggleBtn.addEventListener('click', () => {
        tabsContainer.classList.toggle('visible');
    });

    filterToggleBtn.addEventListener('click', () => {
        filtersContainer.classList.toggle('visible');
    });
}

async function initializePage() {
    setupTabsAndFilters();
    const activeTab = document.querySelector('.tab-link.active')?.dataset.tab;

    const isAveragesTab = activeTab === 'averages';
    const isMobile = window.innerWidth <= 768;
    document.getElementById('stats-header-container').style.display = isAveragesTab ? 'block' : 'none';
    if(isMobile) {
        document.querySelector('.mobile-controls').style.display = isAveragesTab ? 'flex' : 'none';
    }


    if (activeTab === 'spares') await displaySpareCounts();
    if (activeTab === 'high-scores') await displayHighScores();
    if (activeTab === 'averages') await displayAverages();
}

document.addEventListener('DOMContentLoaded', initializePage);
