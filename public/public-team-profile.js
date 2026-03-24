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
async function getLeagueTablesSummary(teamId, seasonId) {
    let played = 0, wins = 0, draws = 0, losses = 0, totalPins = 0, highScore = 0;
    let divisions = new Set();
    
    const seasonsSnap = await getDocs(collection(db, 'league_tables'));
    
    seasonsSnap.forEach(docSnap => {
        const season = docSnap.id;
        if (seasonId && seasonId !== 'all' && season !== seasonId) return;
        
        const data = docSnap.data();
        Object.keys(data).forEach(divKey => {
            if (divKey === 'season') return;
            const division = data[divKey];
            const isLeague = !divKey.toLowerCase().includes('knockout') && !divKey.toLowerCase().includes('cup');
            if (isLeague && division && division.standings) {
                const teamStanding = division.standings.find(t => t.teamId === teamId);
                if (teamStanding) {
                    played += (teamStanding.played || 0);
                    wins += (teamStanding.won || 0);
                    draws += (teamStanding.drawn || 0);
                    losses += (teamStanding.lost || 0);
                    totalPins += (teamStanding.pinsFor || 0);
                    if ((teamStanding.max_score || 0) > highScore) {
                        highScore = teamStanding.max_score;
                    }
                    divisions.add(division.leagueName || divKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                }
            }
        });
    });
    
    const divisionName = Array.from(divisions).join(', ');
    return { played, wins, draws, losses, totalPins, highScore, divisionName };
}

async function fetchTeamStats(teamId, seasonId) {
    if (!teamId) return [];
    const allMatches = [];

    const homeQuery = query(collection(db, "match_results"), where("homeTeamId", "==", teamId), where("status", "==", "completed"));
    const awayQuery = query(collection(db, "match_results"), where("awayTeamId", "==", teamId), where("status", "==", "completed"));

    const [homeSnapshot, awaySnapshot] = await Promise.all([
        getDocs(homeQuery),
        getDocs(awayQuery)
    ]);

    const processSnapshot = (snapshot, isHomeTeam) => {
        snapshot.forEach(doc => {
            const match = doc.data();
            if (seasonId && seasonId !== 'all' && match.season !== seasonId) return;
            const teamScores = isHomeTeam ? match.homeScores : match.awayScores;
            const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
            const teamScore = isHomeTeam ? match.homeScore : match.awayScore;
            const opponentScore = isHomeTeam ? match.awayScore : match.homeScore;
            
            // Calculate team hands (sum of player hands for each leg)
            const teamHands = [];
            let maxHands = 0;
            if (teamScores) {
               teamScores.forEach(player => {
                   if (player.hands && player.hands.length > maxHands) {
                       maxHands = player.hands.length;
                   }
               });
               for(let i=0; i<maxHands; i++) {
                   let handTotal = 0;
                   teamScores.forEach(player => {
                       if (player.hands && player.hands[i] !== undefined) {
                           handTotal += Number(player.hands[i]);
                       }
                   });
                   teamHands.push(handTotal);
               }
            }

            allMatches.push({
                date: match.scheduledDate,
                opponent: opponentTeamId,
                matchId: doc.id,
                teamScore: teamScore,
                opponentScore: opponentScore,
                competitionId: match.division,
                teamHands: teamHands
            });
        });
    };

    processSnapshot(homeSnapshot, true);
    processSnapshot(awaySnapshot, false);

    // Sort matches by date, OLDEST first
    allMatches.sort((a, b) => {
        const dateA = a.date ? a.date.toDate() : new Date(0);
        const dateB = b.date ? b.date.toDate() : new Date(0);
        return dateA - dateB;
    });
    return allMatches;
}

function calculateSummaryStats(matches) {
    if (matches.length === 0) {
        return { 
            fixturesPlayed: 0, wins: 0, losses: 0, draws: 0, totalPins: 0, 
            averageScore: 'N/A', leagueAverageScore: 'N/A', highScore: 0
        };
    }
    
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalPins = 0;
    let highScore = 0;

    matches.forEach(m => {
        totalPins += (m.teamScore || 0);
        if ((m.teamScore || 0) > highScore) {
            highScore = m.teamScore;
        }
        if (m.teamScore > m.opponentScore) wins++;
        else if (m.teamScore < m.opponentScore) losses++;
        else draws++;
    });
    
    const leagueMatches = matches.filter(m => m.competitionId === 'premier-division' || m.competitionId === 'first-division');
    const leagueTotalPins = leagueMatches.reduce((acc, m) => acc + (m.teamScore || 0), 0);
    const leagueAverage = leagueMatches.length > 0 ? (leagueTotalPins / leagueMatches.length).toFixed(2) : 'N/A';

    return {
        fixturesPlayed: matches.length,
        wins, losses, draws,
        totalPins,
        averageScore: (totalPins / matches.length).toFixed(2),
        leagueAverageScore: leagueAverage,
        highScore
    };
}

async function renderStatistics(teamId, teamName, seasonId) {
    document.getElementById('stats-team-name-header').textContent = teamName;
    
    const mainStatsContainer = document.getElementById('main-stats-grid');
    const tableContainer = document.querySelector('.stats-results-table');
    
    mainStatsContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--medium-grey);">Loading statistics, please wait...</p>';
    tableContainer.innerHTML = '';
    
    const matches = await fetchTeamStats(teamId, seasonId);
    let summary = calculateSummaryStats(matches);
    
    // Supplement with League Tables data if Match Results are missing/incomplete
    const leagueSummary = await getLeagueTablesSummary(teamId, seasonId);
    
    let leagueMatchesInResults = 0;
    matches.forEach(m => {
        const comp = (m.competitionId || '').toLowerCase();
        if (comp.includes('division') || comp.includes('league')) {
            leagueMatchesInResults++;
        }
    });

    if (leagueSummary.played > leagueMatchesInResults) {
        // Recalculate summary targeting only NON-league matches to combine with leagueSummary
        const nonLeagueMatches = matches.filter(m => {
            const comp = (m.competitionId || '').toLowerCase();
            return !(comp.includes('division') || comp.includes('league'));
        });
        
        const cupSummary = calculateSummaryStats(nonLeagueMatches);
        
        summary.fixturesPlayed = leagueSummary.played + cupSummary.fixturesPlayed;
        summary.wins = leagueSummary.wins + cupSummary.wins;
        summary.draws = leagueSummary.draws + cupSummary.draws;
        summary.losses = leagueSummary.losses + cupSummary.losses;
        summary.totalPins = leagueSummary.totalPins + cupSummary.totalPins;
        summary.highScore = Math.max(leagueSummary.highScore, cupSummary.highScore);
        
        summary.averageScore = summary.fixturesPlayed > 0 ? (summary.totalPins / summary.fixturesPlayed).toFixed(2) : 'N/A';
        summary.leagueAverageScore = leagueSummary.played > 0 ? (leagueSummary.totalPins / leagueSummary.played).toFixed(2) : 'N/A';
    }

    const divHeader = document.getElementById('stats-division-header');
    if (leagueSummary.divisionName) {
        divHeader.style.display = 'block';
        divHeader.textContent = leagueSummary.divisionName;
    } else {
        divHeader.style.display = 'none';
        divHeader.textContent = '';
    }

    const formatStat = (val, isNumber = false) => {
        if (val === 0 || val === '0' || val === '0.00' || val === 'N/A') return '-';
        if (isNumber && typeof val === 'number') return val.toLocaleString();
        return val;
    };

    mainStatsContainer.innerHTML = `
        <div class="stat-box"><h4>Fixtures Played</h4><p>${formatStat(summary.fixturesPlayed)}</p></div>
        <div class="stat-box" style="border-bottom: 4px solid hsl(120, 60%, 40%);"><h4>Wins</h4><p>${formatStat(summary.wins)}</p></div>
        <div class="stat-box" style="border-bottom: 4px solid hsl(55, 90%, 60%);"><h4>Draws</h4><p>${formatStat(summary.draws)}</p></div>
        <div class="stat-box" style="border-bottom: 4px solid hsl(0, 70%, 50%);"><h4>Losses</h4><p>${formatStat(summary.losses)}</p></div>
        <div class="stat-box"><h4>Total Pins</h4><p>${formatStat(summary.totalPins, true)}</p></div>
        <div class="stat-box"><h4>High Score</h4><p>${formatStat(summary.highScore, true)}</p></div>
        <div class="stat-box"><h4>Overall Average</h4><p>${formatStat(summary.averageScore)}</p></div>
        <div class="stat-box"><h4>League Average</h4><p>${formatStat(summary.leagueAverageScore)}</p></div>
    `;

    document.getElementById('streak-stats-grid').style.display = 'none';

    // Sort to newest first for table
    matches.sort((a, b) => {
        const dateA = a.date ? a.date.toDate() : new Date(0);
        const dateB = b.date ? b.date.toDate() : new Date(0);
        return dateB - dateA;
    });

    if (matches.length > 0) {
        const teamsMap = new Map();
        const competitionsMap = new Map();
        const teamIds = [...new Set(matches.map(s => s.opponent))];
        const competitionIds = [...new Set(matches.map(s => s.competitionId))];

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
                            <th>Time</th>
                            <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                            <th>Total</th>
                            <th>Result</th>
                            <th>Opponent</th>
                            <th>Competition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matches.map(m => {
                            let resultClass = 'draw';
                            let resultText = 'D';
                            let resultColor = 'hsl(55, 90%, 60%)';
                            if (m.teamScore > m.opponentScore) { resultClass = 'win'; resultText = 'W'; resultColor = 'hsl(120, 60%, 40%)'; }
                            if (m.teamScore < m.opponentScore) { resultClass = 'loss'; resultText = 'L'; resultColor = 'hsl(0, 70%, 50%)'; }
                            const time = m.date ? m.date.toDate().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';
                            
                            const handsCols = [];
                            for (let i = 0; i < 5; i++) {
                                handsCols.push(`<td>${m.teamHands && m.teamHands[i] !== undefined ? m.teamHands[i] : '-'}</td>`);
                            }

                            return `
                                <tr>
                                    <td><span class="result-indicator ${resultClass}"></span></td>
                                    <td>${formatDate(m.date)}</td>
                                    <td>${time}</td>
                                    ${handsCols.join('')}
                                    <td><strong>${m.teamScore || 0}</strong></td>
                                    <td class="font-bold" style="text-transform: uppercase; color: ${resultColor};">${resultText} ${m.teamScore} - ${m.opponentScore}</td>
                                    <td>${teamsMap.get(m.opponent) || 'Unknown'}</td>
                                    <td>${competitionsMap.get(m.competitionId) || 'N/A'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        tableContainer.innerHTML = '<p>No match results found for this team.</p>';
    }
}

async function renderTeamAwards(teamName) {
    const awardsContainer = document.getElementById('awards-list');
    if (!teamName) {
        awardsContainer.innerHTML = '<p style="text-align: center; color: var(--medium-grey);">No team data available.</p>';
        return;
    }

    try {
        const awards = {};
        
        const compSnap = await getDocs(collection(db, 'competitions'));
        const compMap = new Map();
        compSnap.forEach(doc => compMap.set(doc.id, doc.data().name || doc.id));

        const winnersSnap = await getDocs(collection(db, 'winners'));
        
        winnersSnap.forEach(docSnap => {
            const compId = docSnap.id;
            const data = docSnap.data();
            const history = data.history || [];
            
            history.forEach(entry => {
                let isWinner = false;
                if (entry.places && entry.places.first === teamName) {
                    isWinner = true;
                } else if (entry.winner === teamName) {
                    isWinner = true;
                }
                
                if (isWinner) {
                    if (!awards[compId]) {
                        awards[compId] = { name: compMap.get(compId) || compId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), seasons: [] };
                    }
                    awards[compId].seasons.push(entry.season);
                }
            });
        });

        if (Object.keys(awards).length === 0) {
            awardsContainer.innerHTML = '<p style="text-align: center; color: var(--medium-grey);">No recorded awards yet.</p>';
            return;
        }
        
        const sortedComps = Object.values(awards).sort((a, b) => b.seasons.length - a.seasons.length);
        
        let html = '';
        sortedComps.forEach(award => {
            award.seasons.sort((a, b) => b.localeCompare(a));
            html += `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 5px 0; color: var(--charcoal); font-size: 1.05rem;">
                        ${award.name} <span style="background: var(--club-yellow); color: var(--charcoal); font-size: 0.8rem; padding: 2px 8px; border-radius: 12px; margin-left: 5px; font-weight: normal;">${award.seasons.length}x</span>
                    </h4>
                    <ul style="margin: 0; padding-left: 20px; color: var(--dark-grey); font-size: 0.9rem;">
                        ${award.seasons.map(s => `<li style="margin-bottom: 3px;">${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        });
        
        awardsContainer.innerHTML = html;

    } catch (e) {
        console.error("Error loading awards:", e);
        awardsContainer.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading awards.</p>';
    }
}

async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('teamId');
    const returnUrl = urlParams.get('returnUrl');

    const backButton = document.getElementById('back-btn');
    if (returnUrl) {
        if (backButton) backButton.href = returnUrl;
    } else {
        if (backButton) backButton.href = "javascript:history.back()";
    }

    if (!teamId) {
        document.getElementById('statistics-content').innerHTML = '<p>Team ID not provided.</p>';
        return;
    }

    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (!teamDoc.exists()) {
        document.getElementById('statistics-content').innerHTML = '<p>Team not found.</p>';
        return;
    }

    const teamData = teamDoc.data();
    const teamName = teamData.name || 'Unknown Team';

    const seasonFilter = document.getElementById('season-filter');
    const seasonsSnap = await getDocs(collection(db, 'league_tables'));
    let seasons = [];
    seasonsSnap.forEach(d => {
        const data = d.data();
        let found = false;
        Object.keys(data).forEach(divKey => {
            if (divKey === 'season') return;
            const division = data[divKey];
            if (division && division.standings && division.standings.some(t => t.teamId === teamId)) {
                found = true;
            }
        });
        if (found) {
            seasons.push(d.id);
        }
    });
    seasons.sort((a, b) => b.localeCompare(a));
    
    // Fallback if no league table matches found
    if (seasons.length === 0) {
        seasons = seasonsSnap.docs.map(d => d.id).sort((a, b) => b.localeCompare(a));
    }
    
    seasonFilter.innerHTML = '<option value="all">All Time</option>';
    seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = season;
        seasonFilter.appendChild(option);
    });

    const defaultSeason = seasons.some(s => s === '2025-26') ? '2025-26' : (seasons[0] || 'all');
    seasonFilter.value = defaultSeason;

    seasonFilter.addEventListener('change', async (e) => {
        await renderStatistics(teamId, teamName, e.target.value);
    });

    await renderStatistics(teamId, teamName, defaultSeason);
    await renderTeamAwards(teamName);
}

document.addEventListener('DOMContentLoaded', initializePage);
