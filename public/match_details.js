import { db, doc, getDoc, collection, query, where, getDocs, documentId } from './firebase.config.js';

// --- GLOBAL STATE ---
let scoreChart = null;
let currentMatchData = null;
let homeTeamName = '';
let awayTeamName = '';

// --- Helper Functions ---
const getMatchId = () => new URLSearchParams(window.location.search).get('matchId');
const getFromPage = () => new URLSearchParams(window.location.search).get('from');

const fetchTeamName = async (teamId) => {
    if (!teamId) return 'Team N/A';
    try {
        const teamDocSnap = await getDoc(doc(db, 'teams', teamId));
        return teamDocSnap.exists() ? teamDocSnap.data().name : 'Unknown Team';
    } catch (e) {
        console.error("Error fetching team name:", e);
        return 'Team Fetch Error';
    }
};

const fetchCompetitionName = async (competitionId) => {
    if (!competitionId) return 'Competition N/A';
    try {
        const competitionDocSnap = await getDoc(doc(db, 'competitions', competitionId));
        return competitionDocSnap.exists() ? competitionDocSnap.data().name : 'Unknown Competition';
    } catch (e) {
        console.error("Error fetching competition name:", e);
        return 'Competition Fetch Error';
    }
};

const fetchPlayerNamesInBatch = async (playerIds) => {
    const namesMap = new Map();
    const uniqueIds = [...new Set(playerIds.filter(id => id && id !== 'sixthPlayer'))];
    if (uniqueIds.length === 0) return namesMap;

    const chunks = [];
    for (let i = 0; i < uniqueIds.length; i += 10) {
        chunks.push(uniqueIds.slice(i, i + 10));
    }

    try {
        await Promise.all(chunks.map(async (chunk) => {
            const playersQuery = query(collection(db, 'players_public'), where(documentId(), 'in', chunk));
            const querySnapshot = await getDocs(playersQuery);
            querySnapshot.forEach(docSnap => {
                const playerData = docSnap.data();
                const fullName = `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim();
                namesMap.set(docSnap.id, fullName || 'Unknown Player');
            });
        }));
    } catch (error) {
        console.error('Error fetching player names in batch:', error);
    }

    return namesMap;
};

// --- Statistics Calculation Function ---
const calculateTeamStatistics = (scores, namesMap) => {
    if (!Array.isArray(scores) || scores.length === 0) return null;

    const stats = {
        teamScore: 0, bestHand: 0, spares: 0, nines: 0, eights: 0, sevens: 0,
        pinsFromSpares: 0, noSpareScore: 0,
        bestPlayer: { name: 'N/A', score: 0 },
    };
    let bestPlayerScore = -1;
    let rawSparePins = 0;

    scores.forEach(player => {
        const playerTotal = player.score || 0;
        stats.teamScore += playerTotal;

        if (playerTotal > bestPlayerScore) {
            bestPlayerScore = playerTotal;
            stats.bestPlayer = {
                name: player.playerId === 'sixthPlayer' ? '6th Player' : (namesMap.get(player.playerId) || 'Unknown Player'),
                score: playerTotal,
            };
        }

        player.hands.forEach(hand => {
            if (hand > stats.bestHand) stats.bestHand = hand;
            if (hand >= 10) {
                stats.spares++;
                rawSparePins += hand;
            }
            if (hand === 9) stats.nines++;
            if (hand === 8) stats.eights++;
            if (hand === 7) stats.sevens++;
        });
    });

    stats.pinsFromSpares = rawSparePins - (stats.spares * 9);
    stats.noSpareScore = stats.teamScore - stats.pinsFromSpares;

    return stats;
};

// --- Rendering Functions ---
const renderPlayerScores = (scores, teamName, namesMap) => {
    if (!Array.isArray(scores) || scores.length === 0 || !scores[0].hands) {
        return `<div class="player-scores-table-container"><p>Score data is not available.</p></div>`;
    }

    const scoreHeaders = scores[0].hands.map((_, index) => `<th>${index + 1}</th>`).join('');

    const playerRows = scores.map(player => {
        const playerName = player.playerId === 'sixthPlayer' ? '6th Player' : (namesMap.get(player.playerId) || 'Unknown Player');
        const scoreCells = player.hands.map(score => `<td><span class="${score >= 10 ? 'highlight-score' : ''}">${score}</span></td>`).join('');
        return `<tr><td>${playerName}</td>${scoreCells}<td class="total-score">${player.score}</td></tr>`;
    }).join('');

    const numHands = scores[0].hands.length;
    const handTotals = Array(numHands).fill(0);
    let grandTotal = 0;
    scores.forEach(player => {
        player.hands.forEach((hand, index) => {
            handTotals[index] += hand;
        });
        grandTotal += player.score;
    });
    const handTotalCells = handTotals.map(total => `<td>${total}</td>`).join('');

    return `
        <div class="player-scores-table-container">
            <h3>${teamName} Scores</h3>
            <table class="player-scores-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        ${scoreHeaders}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerRows}
                </tbody>
                <tfoot>
                    <tr class="team-totals">
                        <td>Team Hand Totals</td>
                        ${handTotalCells}
                        <td class="total-score">${grandTotal}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
};


const renderStatistics = (homeStats, awayStats, homeTeamName, awayTeamName) => {
    if (!homeStats || !awayStats) {
        return '<p>Statistics cannot be generated as score data is incomplete.</p>';
    }
    const crownIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" class="winner-icon"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>`;
    const metrics = [
        { label: 'Team Score', home: homeStats.teamScore, away: awayStats.teamScore },
        { label: 'Pins from Spares', home: homeStats.pinsFromSpares, away: awayStats.pinsFromSpares },
        { label: 'No Spare Score', home: homeStats.noSpareScore, away: awayStats.noSpareScore },
        { label: 'Best Hand', home: homeStats.bestHand, away: awayStats.bestHand },
        { label: 'Spares (10+)', home: homeStats.spares, away: awayStats.spares },
        { label: '9s', home: homeStats.nines, away: awayStats.nines },
        { label: '8s', home: homeStats.eights, away: awayStats.eights },
        { label: '7s', home: homeStats.sevens, away: awayStats.sevens },
        { label: 'Best Player', home: `${homeStats.bestPlayer.name} (${homeStats.bestPlayer.score})`, away: `${awayStats.bestPlayer.name} (${awayStats.bestPlayer.score})` },
    ];

    const rows = metrics.map(m => {
        const homeVal = m.label === 'Best Player' ? homeStats.bestPlayer.score : m.home;
        const awayVal = m.label === 'Best Player' ? awayStats.bestPlayer.score : m.away;
        const homeWinner = homeVal > awayVal;
        const awayWinner = awayVal > homeVal;
        const tie = homeVal === awayVal && homeVal > 0;

        return `<tr>
            <td class="stat-value home-value ${homeWinner ? 'winner' : ''} ${tie ? 'tie' : ''}">${m.home} ${homeWinner ? crownIcon : ''}</td>
            <td class="stat-label">${m.label}</td>
            <td class="stat-value away-value ${awayWinner ? 'winner' : ''} ${tie ? 'tie' : ''}">${m.away} ${awayWinner ? crownIcon : ''}</td>
        </tr>`;
    }).join('');

    return `<div class="statistics-container"><table class="statistics-table"><colgroup><col><col><col></colgroup><thead><tr>
            <th class="home-header">${homeTeamName}</th><th>Metric</th><th class="away-header">${awayTeamName}</th>
            </tr></thead><tbody>${rows}</tbody></table></div>`;
};

const renderScoreProgressionChart = (view) => {
    const ctx = document.getElementById('score-progression-chart').getContext('2d');
    if (!ctx) return;

    if (scoreChart) {
        scoreChart.destroy();
    }

    const { homeScores, awayScores, bowledFirst } = currentMatchData;
    let homeCumulative = 0;
    let awayCumulative = 0;
    const homeData = [0];
    const awayData = [0];
    const battleData = [0];
    let labels = ['Start'];

    if (view === 'simultaneous' || view === 'battle') {
        for (let handIndex = 0; handIndex < 5; handIndex++) {
            for (let playerIndex = 0; playerIndex < 6; playerIndex++) {
                homeCumulative += homeScores[playerIndex]?.hands[handIndex] || 0;
                awayCumulative += awayScores[playerIndex]?.hands[handIndex] || 0;
                homeData.push(homeCumulative);
                awayData.push(awayCumulative);
                battleData.push(homeCumulative - awayCumulative);
                labels.push('');
            }
        }
    } else { // 'progression' view
        const firstTeamScores = bowledFirst === 'home' ? homeScores : awayScores;
        const secondTeamScores = bowledFirst === 'home' ? awayScores : homeScores;

        const processHand = (teamScores, handIndex, isFirstTeam) => {
            for (let i = 0; i < 6; i++) {
                const score = teamScores[i]?.hands[handIndex] || 0;
                if (isFirstTeam) {
                    if (bowledFirst === 'home') homeCumulative += score;
                    else awayCumulative += score;
                } else {
                    if (bowledFirst === 'home') awayCumulative += score;
                    else homeCumulative += score;
                }
                homeData.push(homeCumulative);
                awayData.push(awayCumulative);
                labels.push('');
            }
        };

        processHand(firstTeamScores, 0, true);
        processHand(secondTeamScores, 0, false);
        processHand(secondTeamScores, 1, false);
        processHand(firstTeamScores, 1, true);
        processHand(firstTeamScores, 2, true);
        processHand(secondTeamScores, 2, false);
        processHand(secondTeamScores, 3, false);
        processHand(firstTeamScores, 3, true);
        processHand(firstTeamScores, 4, true);
        processHand(secondTeamScores, 4, false);
    }

    const datasets = view === 'battle' ? [
        {
            label: 'Lead',
            data: battleData,
            segment: {
                borderColor: ctx => ctx.p1.raw >= 0 ? '#006400' : '#FFC107',
                backgroundColor: ctx => ctx.p1.raw >= 0 ? 'rgba(0, 100, 0, 0.1)' : 'rgba(255, 193, 7, 0.1)',
            },
            fill: 'origin',
        }
    ] : [
        {
            label: homeTeamName,
            data: homeData,
            borderColor: '#006400',
            backgroundColor: 'rgba(0, 100, 0, 0.1)',
            fill: true,
        },
        {
            label: awayTeamName,
            data: awayData,
            borderColor: '#FFC107',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            fill: true,
        }
    ];

    scoreChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function (chart) {
                            if (view === 'battle') {
                                return [
                                    {
                                        text: `${homeTeamName} Lead`,
                                        fillStyle: 'rgba(0, 100, 0, 0.1)',
                                        strokeStyle: '#006400',
                                        lineWidth: 1,
                                        hidden: false,
                                        index: 0
                                    },
                                    {
                                        text: `${awayTeamName} Lead`,
                                        fillStyle: 'rgba(255, 193, 7, 0.1)',
                                        strokeStyle: '#FFC107',
                                        lineWidth: 1,
                                        hidden: false,
                                        index: 1
                                    }
                                ];
                            }
                            return Chart.defaults.plugins.legend.labels.generateLabels(chart);
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Player Turn' },
                    grid: {
                        color: (context) => {
                            if (context.index > 0 && context.index % 6 === 0) {
                                return 'rgba(0, 0, 0, 0.5)';
                            }
                            return 'rgba(0, 0, 0, 0.1)';
                        }
                    },
                    ticks: { display: false }
                },
                y: {
                    title: { display: true, text: view === 'battle' ? 'Point Difference' : 'Cumulative Score' },
                    beginAtZero: view !== 'battle'
                }
            }
        }
    });
};

const setupTabNavigation = () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const graphControlsContainer = document.querySelector('.graph-controls-container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanes.forEach(pane => pane.id === `${targetTab}-content` ? pane.classList.add('active') : pane.classList.remove('active'));

            if (targetTab === 'graph') {
                graphControlsContainer.style.display = 'block';
            } else {
                graphControlsContainer.style.display = 'none';
            }
        });
    });
};

const setupBackButton = () => {
    const backButton = document.getElementById('back-btn');
    if (!backButton) return;
    const from = getFromPage();
    backButton.href = from === 'team-management' ? 'team-management.html' : 'fixtures-results.html';
    backButton.textContent = from === 'team-management' ? '← Back to Team' : '← Back to Fixtures';
};

// --- Main Display Function ---
async function displayMatchDetails() {
    const matchId = getMatchId();
    const matchDetailsContainer = document.getElementById('match-details-container');
    const scoreboardContent = document.getElementById('scoreboard-content');
    const statisticsContent = document.getElementById('statistics-content');
    const graphViewSelect = document.getElementById('graph-view-select');

    if (!matchId || !matchDetailsContainer || !scoreboardContent || !statisticsContent) return;

    scoreboardContent.innerHTML = '<p>Loading scoreboard...</p>';
    statisticsContent.innerHTML = '<p>Loading statistics...</p>';

    try {
        const matchDocSnap = await getDoc(doc(db, 'match_results', matchId));
        if (!matchDocSnap.exists()) {
            matchDetailsContainer.innerHTML = '<p>Match not found.</p>';
            return;
        }

        currentMatchData = matchDocSnap.data();

        [homeTeamName, awayTeamName] = await Promise.all([
            fetchTeamName(currentMatchData.homeTeamId),
            fetchTeamName(currentMatchData.awayTeamId)
        ]);
        const competitionName = await fetchCompetitionName(currentMatchData.division);

        const dateObj = currentMatchData.scheduledDate.toDate();
        const formattedDate = dateObj.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

        matchDetailsContainer.innerHTML = `
            <div class="match-header-card">
                <div class="result-display">
                    <span class="team-name home-team">${homeTeamName}</span>
                    <span class="score">${currentMatchData.homeScore} - ${currentMatchData.awayScore}</span>
                    <span class="team-name away-team">${awayTeamName}</span>
                </div>
                <div class="match-meta-container">
                    <div class="match-date-info"><strong>Date:</strong><span>${formattedDate} at ${formattedTime}</span></div>
                    <div class="match-competition-info"><strong>Competition:</strong><span>${competitionName}</span></div>
                </div>
            </div>`;

        if (currentMatchData.homeScores && currentMatchData.awayScores) {
            const allPlayerIds = [...currentMatchData.homeScores, ...currentMatchData.awayScores].map(p => p.playerId);
            const playerNamesMap = await fetchPlayerNamesInBatch(allPlayerIds);

            scoreboardContent.innerHTML = `
                <div class="player-scores-grid">
                    ${renderPlayerScores(currentMatchData.homeScores, homeTeamName, playerNamesMap)}
                    ${renderPlayerScores(currentMatchData.awayScores, awayTeamName, playerNamesMap)}
                </div>`;

            const homeStats = calculateTeamStatistics(currentMatchData.homeScores, playerNamesMap);
            const awayStats = calculateTeamStatistics(currentMatchData.awayScores, playerNamesMap);
            statisticsContent.innerHTML = renderStatistics(homeStats, awayStats, homeTeamName, awayTeamName);
            renderScoreProgressionChart(graphViewSelect.value);

            graphViewSelect.addEventListener('change', (e) => {
                renderScoreProgressionChart(e.target.value);
            });

        } else {
            scoreboardContent.innerHTML = '<p>Scoreboard data is not available for this match.</p>';
            statisticsContent.innerHTML = '<p>Statistics are not available for this match.</p>';
        }

        setupTabNavigation();

    } catch (error) {
        console.error("A critical error occurred:", error);
        matchDetailsContainer.innerHTML = '<p>An error occurred while loading match details.</p>';
    }
}

document.addEventListener('htmlIncludesLoaded', () => {
    displayMatchDetails();
    setupBackButton();
});
