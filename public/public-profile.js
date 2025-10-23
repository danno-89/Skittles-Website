import { db, doc, getDoc, collection, query, where, getDocs, orderBy } from './firebase.config.js';

// --- Helper Functions ---
const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    const day = date.getDate();
    const year = date.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month} ${year}`;
};

// --- Statistics Functions ---
async function fetchPlayerStats(playerId, teamId) {
    if (!teamId || !playerId) return [];
    const allScores = [];

    const homeQuery = query(collection(db, "match_results"), where("homeTeamId", "==", teamId), where("status", "==", "completed"));
    const awayQuery = query(collection(db, "match_results"), where("awayTeamId", "==", teamId), where("status", "==", "completed"));

    const [homeSnapshot, awaySnapshot] = await Promise.all([
        getDocs(homeQuery),
        getDocs(awayQuery)
    ]);

    const processSnapshot = (snapshot, isHomeTeam) => {
        snapshot.forEach(doc => {
            const match = doc.data();
            const teamScores = isHomeTeam ? match.homeScores : match.awayScores;
            const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
            const playerScore = teamScores.find(s => s.playerId === playerId);
            
            if (playerScore) {
                const allMatchScores = [...match.homeScores, ...match.awayScores].map(s => s.score);
                const teamPlayerScores = teamScores.map(s => s.score);

                allMatchScores.sort((a, b) => b - a);
                teamPlayerScores.sort((a, b) => b - a);

                const matchRank = allMatchScores.indexOf(playerScore.score) + 1;
                const teamRank = teamPlayerScores.indexOf(playerScore.score) + 1;

                allScores.push({ 
                    ...playerScore, 
                    date: match.scheduledDate, 
                    opponent: opponentTeamId, 
                    matchId: doc.id,
                    teamScore: isHomeTeam ? match.homeScore : match.awayScore,
                    opponentScore: isHomeTeam ? match.awayScore : match.homeScore,
                    competitionId: match.division,
                    teamRank,
                    matchRank
                });
            }
        });
    };

    processSnapshot(homeSnapshot, true);
    processSnapshot(awaySnapshot, false);

    // Sort matches by date, newest first. This is important for "current streak".
    allScores.sort((a, b) => b.date.toDate() - a.date.toDate());
    return allScores;
}

const getStreakMetrics = (scores, threshold) => {
    // Scores are newest to oldest.
    const allHandsNewestFirst = scores.flatMap(s => s.hands);
    // Create a truly chronological list of hands for 'best streak' calculation.
    const allHandsOldestFirst = [...scores].reverse().flatMap(s => s.hands);

    let bestStreak = 0;
    let currentStreakForBest = 0;

    for (const hand of allHandsOldestFirst) {
        if (hand >= threshold) {
            currentStreakForBest++;
        } else {
            bestStreak = Math.max(bestStreak, currentStreakForBest);
            currentStreakForBest = 0;
        }
    }
    bestStreak = Math.max(bestStreak, currentStreakForBest); // Check streak at the end

    let currentStreak = 0;
    for (const hand of allHandsNewestFirst) {
        if (hand >= threshold) {
            currentStreak++;
        } else {
            break; // Stop at the first hand that doesn't meet the threshold
        }
    }
    
    const total = allHandsNewestFirst.filter(h => h === threshold).length;

    return { total, bestStreak, currentStreak };
};

function calculateSummaryStats(scores) {
    if (scores.length === 0) {
        return { 
            fixturesPlayed: 0, totalPins: 0, averageScore: 'N/A', 
            leagueAverageScore: 'N/A', highScore: 0, totalSpares: 0,
            sevens: { total: 0, bestStreak: 0, currentStreak: 0 },
            eights: { total: 0, bestStreak: 0, currentStreak: 0 },
            nines: { total: 0, bestStreak: 0, currentStreak: 0 }
        };
    }
    
    const totalPins = scores.reduce((acc, s) => acc + s.score, 0);
    const highScore = Math.max(...scores.map(s => s.score));
    const totalSpares = scores.reduce((acc, s) => acc + s.hands.filter(h => h >= 10).length, 0);
    
    const leagueScores = scores.filter(s => s.competitionId === 'premier-division' || s.competitionId === 'first-division');
    const leagueTotalPins = leagueScores.reduce((acc, s) => acc + s.score, 0);
    const leagueAverage = leagueScores.length > 0 ? (leagueTotalPins / leagueScores.length).toFixed(2) : 'N/A';

    return {
        fixturesPlayed: scores.length,
        totalPins,
        averageScore: (totalPins / scores.length).toFixed(2),
        leagueAverageScore: leagueAverage,
        highScore,
        totalSpares,
        sevens: getStreakMetrics(scores, 7),
        eights: getStreakMetrics(scores, 8),
        nines: getStreakMetrics(scores, 9)
    };
}

async function renderStatistics(playerId, playerName, teamId, teamName) {
    document.getElementById('stats-player-name-header').textContent = playerName;
    document.getElementById('stats-team-name-header').textContent = teamName;
    
    const scores = await fetchPlayerStats(playerId, teamId);
    const summary = calculateSummaryStats(scores);

    const mainStatsContainer = document.getElementById('main-stats-grid');
    const streakStatsContainer = document.getElementById('streak-stats-grid');

    mainStatsContainer.innerHTML = `
        <div class="stat-box"><h4>Fixtures Played</h4><p>${summary.fixturesPlayed}</p></div>
        <div class="stat-box"><h4>Total Pins</h4><p>${summary.totalPins}</p></div>
        <div class="stat-box"><h4>High Score</h4><p>${summary.highScore}</p></div>
        <div class="stat-box"><h4>Overall Average</h4><p>${summary.averageScore}</p></div>
        <div class="stat-box"><h4>League Average</h4><p>${summary.leagueAverageScore}</p></div>
        <div class="stat-box"><h4>Spares</h4><p>${summary.totalSpares}</p></div>
    `;

    streakStatsContainer.innerHTML = `
        <div class="stat-box detailed-stat">
            <div class="stat-main"><h4>9s</h4><p class="stat-total">${summary.nines.total}</p></div>
            <div class="stat-streaks"><h5>Streaks</h5><div class="streaks-data"><p><strong>Best:</strong> ${summary.nines.bestStreak}</p><p><strong>Current:</strong> ${summary.nines.currentStreak}</p></div></div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-main"><h4>8s</h4><p class="stat-total">${summary.eights.total}</p></div>
            <div class="stat-streaks"><h5>Streaks</h5><div class="streaks-data"><p><strong>Best:</strong> ${summary.eights.bestStreak}</p><p><strong>Current:</strong> ${summary.eights.currentStreak}</p></div></div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-main"><h4>7s</h4><p class="stat-total">${summary.sevens.total}</p></div>
            <div class="stat-streaks"><h5>Streaks</h5><div class="streaks-data"><p><strong>Best:</strong> ${summary.sevens.bestStreak}</p><p><strong>Current:</strong> ${summary.sevens.currentStreak}</p></div></div>
        </div>
    `;

    const tableContainer = document.querySelector('.stats-results-table');
    if (scores.length > 0) {
        const teamsMap = new Map();
        const competitionsMap = new Map();
        const teamIds = [...new Set(scores.map(s => s.opponent))];
        const competitionIds = [...new Set(scores.map(s => s.competitionId))];

        if (teamIds.length > 0) {
            const teamsQuery = query(collection(db, "teams"), where("__name__", "in", teamIds));
            const teamsSnapshot = await getDocs(teamsQuery);
            teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
        }
        if (competitionIds.length > 0) {
            const competitionsQuery = query(collection(db, "competitions"), where("__name__", "in", competitionIds));
            const competitionsSnapshot = await getDocs(competitionsQuery);
            competitionsSnapshot.forEach(doc => competitionsMap.set(doc.id, doc.data().name));
        }

        tableContainer.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                            <th>Total</th>
                            <th>Team Rank</th>
                            <th>Match Rank</th>
                            <th>Opponent</th>
                            <th>Competition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scores.map(s => {
                            let resultClass = 'draw';
                            if (s.teamScore > s.opponentScore) resultClass = 'win';
                            if (s.teamScore < s.opponentScore) resultClass = 'loss';

                            return `
                                <tr>
                                    <td><span class="result-indicator ${resultClass}"></span></td>
                                    <td>${formatDate(s.date)}</td>
                                    ${s.hands.map(h => `<td><span class="${h >= 10 ? 'highlight-score' : ''}">${h}</span></td>`).join('')}
                                    <td><strong>${s.score}</strong></td>
                                    <td>${s.teamRank === 1 ? `<span class="rank-one">1</span>` : s.teamRank}</td>
                                    <td>${s.matchRank === 1 ? `<span class="rank-one">1</span>` : s.matchRank}</td>
                                    <td>${teamsMap.get(s.opponent) || 'Unknown'}</td>
                                    <td>${competitionsMap.get(s.competitionId) || 'N/A'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        tableContainer.innerHTML = '<p>No match results found for this player.</p>';
    }
}

async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('playerId');

    if (!playerId) {
        document.getElementById('statistics-content').innerHTML = '<p>Player ID not provided.</p>';
        return;
    }

    const playerDoc = await getDoc(doc(db, 'players_public', playerId));
    if (!playerDoc.exists()) {
        document.getElementById('statistics-content').innerHTML = '<p>Player not found.</p>';
        return;
    }

    const playerData = playerDoc.data();
    const teamDoc = await getDoc(doc(db, 'teams', playerData.teamId));
    const teamName = teamDoc.exists() ? teamDoc.data().name : 'Unknown Team';

    await renderStatistics(playerId, `${playerData.firstName} ${playerData.lastName}`, playerData.teamId, teamName);
}

document.addEventListener('DOMContentLoaded', initializePage);
