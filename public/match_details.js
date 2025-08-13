import { firebaseConfig } from './firebase.config.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Helper Functions ---
const getMatchId = () => new URLSearchParams(window.location.search).get('matchId');

const fetchTeamName = async (teamId) => {
    if (!teamId) return 'Team N/A';
    try {
        const teamDoc = await db.collection('teams').doc(teamId).get();
        return teamDoc.exists ? teamDoc.data().name : 'Unknown Team';
    } catch (e) {
        console.error("Error fetching team name:", e);
        return 'Team Fetch Error';
    }
};

const fetchCompetitionName = async (competitionId) => {
    if (!competitionId) return 'Competition N/A';
    try {
        const competitionDoc = await db.collection('competitions').doc(competitionId).get();
        return competitionDoc.exists ? competitionDoc.data().name : 'Unknown Competition';
    } catch (e) {
        console.error("Error fetching competition name:", e);
        return 'Competition Fetch Error';
    }
};

const fetchPlayerNamesInBatch = async (playerIds) => {
    const namesMap = new Map();
    const originalIds = [...new Set(playerIds.filter(id => id))];
    
    if (originalIds.length === 0) return namesMap;

    const idsToFetch = [...originalIds];
    originalIds.forEach(id => {
        const capitalizedId = id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
        if (capitalizedId !== id) idsToFetch.push(capitalizedId);
    });

    const uniqueIdsToFetch = [...new Set(idsToFetch)];
    const chunks = [];
    for (let i = 0; i < uniqueIdsToFetch.length; i += 10) {
        chunks.push(uniqueIdsToFetch.slice(i, i + 10));
    }

    try {
        await Promise.all(chunks.map(async (chunk) => {
            const querySnapshot = await db.collection('players_public').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
            querySnapshot.forEach(doc => {
                const playerData = doc.data();
                const fullName = `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim();
                namesMap.set(doc.id, fullName || 'Unknown Player');
                namesMap.set(doc.id.toLowerCase(), fullName || 'Unknown Player');
            });
        }));
    } catch (error) {
        console.error('Error fetching player names in batch:', error);
    }
    
    return namesMap;
};

// --- Statistics Calculation Function ---
const calculateTeamStatistics = (players, namesMap) => {
    if (!Array.isArray(players) || players.length === 0) {
        return null;
    }

    const stats = {
        teamScore: 0,
        teamBestHand: 0,
        bestHand: 0,
        spares: 0,
        pinsFromSpares: 0,
        noSpareScore: 0,
        nines: 0,
        eights: 0,
        sevens: 0,
        sixes: 0,
        totalHands: 0,
        handsWon: 0,
        bestPlayer: { name: 'N/A', score: 0 },
    };

    let bestPlayerScore = -1;
    let pinsFromSparesTotal = 0;
    let sparesCount = 0;

    const numHands = players[0]?.scores?.length || 0;
    const handTotals = Array(numHands).fill(0);

    players.forEach(player => {
        const playerScores = player.scores || [];
        const playerTotal = playerScores.reduce((sum, score) => sum + Number(score), 0);
        stats.teamScore += playerTotal;
        stats.totalHands += playerScores.length;

        if (playerTotal > bestPlayerScore) {
            bestPlayerScore = playerTotal;
            stats.bestPlayer = {
                name: namesMap.get(player.playerId.toLowerCase()) || 'Unknown Player',
                score: playerTotal,
            };
        }

        playerScores.forEach((score, index) => {
            const hand = Number(score);
            
            handTotals[index] += hand;

            if (hand > stats.bestHand) stats.bestHand = hand;
            
            if (hand >= 10) {
                stats.spares++;
                pinsFromSparesTotal += hand;
                sparesCount++;
            }
            if (hand === 9) stats.nines++;
            if (hand === 8) stats.eights++;
            if (hand === 7) stats.sevens++;
            if (hand === 6) stats.sixes++;
        });
    });

    stats.teamBestHand = Math.max(...handTotals, 0);
    
    stats.pinsFromSpares = pinsFromSparesTotal - (sparesCount * 9);

    stats.noSpareScore = stats.teamScore - stats.pinsFromSpares;

    stats.averageHand = stats.totalHands > 0 ? (stats.teamScore / stats.totalHands).toFixed(2) : 0;
    
    return stats;
};

// --- Rendering Functions ---
const renderPlayerScores = (players, teamType, namesMap) => {
    const teamName = teamType === 'home' ? 'Home' : 'Away';
    if (!Array.isArray(players) || players.length === 0 || !players[0].scores) {
        return `<div class="player-scores-table-container"><h3>${teamName} Players</h3><p>Score data is not yet available for this team.</p></div>`;
    }
    
    const scoreHeaders = players[0].scores.map((_, index) => `<th>${index + 1}</th>`).join('');
    
    const playerRows = players.map(player => {
        const playerName = namesMap.get(player.playerId.toLowerCase()) || 'Unknown Player';
        const scores = player.scores || [];
        const scoreCells = scores.map(score => `<td>${score}</td>`).join('');
        const totalScore = scores.reduce((sum, score) => sum + Number(score), 0);
        
        return `<tr><td>${playerName}</td>${scoreCells}<td class="total-score">${totalScore}</td></tr>`;
    }).join('');

    return `<div class="player-scores-table-container"><h3>${teamName} Players</h3><table class="player-scores-table"><thead><tr><th>Player</th>${scoreHeaders}<th>Total</th></tr></thead><tbody>${playerRows}</tbody></table></div>`;
};

const renderStatistics = (homeStats, awayStats, homeTeamName, awayTeamName) => {
    if (!homeStats || !awayStats) {
        return '<p>Statistics cannot be generated as score data is incomplete.</p>';
    }
    
    let homeHandsWon = 0;
    let awayHandsWon = 0;
    if (homeStats.totalHands === awayStats.totalHands) {
        if (homeStats.teamScore > awayStats.teamScore) homeHandsWon = 'Win';
        if (awayStats.teamScore > homeStats.teamScore) awayHandsWon = 'Win';
    }

    const metrics = [
        { label: 'Team Score', home: homeStats.teamScore, away: awayStats.teamScore },
        { label: 'No Spare Score', home: homeStats.noSpareScore, away: awayStats.noSpareScore },
        { label: 'Team Best Hand', home: homeStats.teamBestHand, away: awayStats.teamBestHand },
        { label: 'Best Hand', home: homeStats.bestHand, away: awayStats.bestHand },
        { label: 'Spares (10+)', home: homeStats.spares, away: awayStats.spares },
        { label: 'Pins from Spares', home: homeStats.pinsFromSpares, away: awayStats.pinsFromSpares },
        { label: '9s', home: homeStats.nines, away: awayStats.nines },
        { label: '8s', home: homeStats.eights, away: awayStats.eights },
        { label: '7s', home: homeStats.sevens, away: awayStats.sevens },
        { label: '6s', home: homeStats.sixes, away: awayStats.sixes },
        { label: 'Average Hand', home: homeStats.averageHand, away: awayStats.averageHand },
        { label: 'Best Player', home: `${homeStats.bestPlayer.name} (${homeStats.bestPlayer.score})`, away: `${awayStats.bestPlayer.name} (${awayStats.bestPlayer.score})` },
    ];

    const rows = metrics.map(m => {
        let homeWinner = false;
        let awayWinner = false;
        let tie = false;

        // Special handling for 'Best Player' as it's a string
        if (m.label === 'Best Player') {
            const homePlayerScore = homeStats.bestPlayer.score;
            const awayPlayerScore = awayStats.bestPlayer.score;
            if (homePlayerScore > awayPlayerScore) {
                homeWinner = true;
            } else if (awayPlayerScore > homePlayerScore) {
                awayWinner = true;
            } else if (homePlayerScore === awayPlayerScore && homePlayerScore > 0){
                tie = true;
            }
        } else {
             const homeVal = parseFloat(m.home);
            const awayVal = parseFloat(m.away);
            if (homeVal > awayVal) {
                homeWinner = true;
            } else if (awayVal > homeVal) {
                awayWinner = true;
            } else if (homeVal === awayVal && homeVal > 0){
                 tie = true;
            }
        }
        
        const homeValue = homeWinner ? `<strong>${m.home} 🏆</strong>` : (tie ? `<strong>${m.home}</strong>` : m.home);
        const awayValue = awayWinner ? `<strong>${m.away} 🏆</strong>` : (tie ? `<strong>${m.away}</strong>` : m.away);

        return `
        <tr>
            <td class="stat-value home-value ${homeWinner ? 'winner' : ''} ${tie ? 'tie' : ''}">${homeValue}</td>
            <td class="stat-label">${m.label}</td>
            <td class="stat-value away-value ${awayWinner ? 'winner' : ''} ${tie ? 'tie' : ''}">${awayValue}</td>
        </tr>
    `;
    }).join('');

    return `
        <div class="statistics-container">
            <table class="statistics-table">
                <thead>
                    <tr>
                        <th class="home-header">${homeTeamName}</th>
                        <th>Metric</th>
                        <th class="away-header">${awayTeamName}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
};


const setupTabNavigation = () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanes.forEach(pane => {
                pane.id === `${targetTab}-content` ? pane.classList.add('active') : pane.classList.remove('active');
            });
        });
    });
};

// --- Main Display Function ---
async function displayMatchDetails() {
    const matchId = getMatchId();
    const matchDetailsContainer = document.getElementById('match-details-container');
    const scoreboardContent = document.getElementById('scoreboard-content');
    const statisticsContent = document.getElementById('statistics-content');
    const previousResultsContent = document.getElementById('previous-results-content');

    if (!matchId) {
        matchDetailsContainer.innerHTML = '<p>No match ID was provided in the URL.</p>';
        return;
    }

    scoreboardContent.innerHTML = '<p>Loading scoreboard...</p>';
    statisticsContent.innerHTML = '<p>Statistics for this match will be available soon.</p>';
    previousResultsContent.innerHTML = '<p>A list of previous results between these two teams will be shown here.</p>';

    try {
        const matchDoc = await db.collection('match_results').doc(matchId).get();
        if (!matchDoc.exists) {
            matchDetailsContainer.innerHTML = '<p>Match not found for the given ID.</p>';
            return;
        }

        const matchData = matchDoc.data();
        
        const [homeTeamName, awayTeamName, competitionName] = await Promise.all([
            fetchTeamName(matchData.homeTeamId),
            fetchTeamName(matchData.awayTeamId),
            fetchCompetitionName(matchData.division)
        ]);

        const homeScore = matchData.homeScore ?? 'N/A';
        const awayScore = matchData.awayScore ?? 'N/A';
        let formattedDate = 'Date not available';
        let formattedTime = '';

        if (matchData.scheduledDate) {
            const dateObj = matchData.scheduledDate.toDate ? matchData.scheduledDate.toDate() : new Date(matchData.scheduledDate);
            if (!isNaN(dateObj)) {
                formattedDate = dateObj.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
            }
        }
        
        const matchDetailsHTML = `<div class="match-header-card"><div class="result-display"><span class="team-name home-team">${homeTeamName}</span><span class="score">${homeScore} - ${awayScore}</span><span class="team-name away-team">${awayTeamName}</span></div><div class="match-meta-container"><div class="match-date-info"><strong>Date:</strong><span>${formattedDate} at ${formattedTime}</span></div><div class="match-competition-info"><strong>Competition:</strong><span>${competitionName}</span></div></div></div>`;
        matchDetailsContainer.innerHTML = matchDetailsHTML;
        
        if (matchData.players && matchData.players.home && matchData.players.away) {
            const homePlayerIds = matchData.players.home.map(p => p.playerId).filter(id => id);
            const awayPlayerIds = matchData.players.away.map(p => p.playerId).filter(id => id);
            const allPlayerIds = [...homePlayerIds, ...awayPlayerIds];
            
            const playerNamesMap = await fetchPlayerNamesInBatch(allPlayerIds);
            
            const homePlayersHTML = renderPlayerScores(matchData.players.home, 'home', playerNamesMap);
            const awayPlayersHTML = renderPlayerScores(matchData.players.away, 'away', playerNamesMap);
            scoreboardContent.innerHTML = `<div class="player-scores-grid">${homePlayersHTML}${awayPlayersHTML}</div>`;
            
            const homeStats = calculateTeamStatistics(matchData.players.home, playerNamesMap);
            const awayStats = calculateTeamStatistics(matchData.players.away, playerNamesMap);
            statisticsContent.innerHTML = renderStatistics(homeStats, awayStats, homeTeamName, awayTeamName);

        } else {
             scoreboardContent.innerHTML = '<p>Scoreboard data is not available for this match.</p>';
             statisticsContent.innerHTML = '<p>Statistics are not available for this match.</p>';
        }

        setupTabNavigation();

    } catch (error) {
        console.error("A critical error occurred in displayMatchDetails:", error);
        matchDetailsContainer.innerHTML = '<p>A critical error occurred while loading match details. Please check the console.</p>';
    }
}

window.onload = displayMatchDetails;
