import { db, collection, doc, getDocs, updateDoc, query, where, orderBy, getDoc, Timestamp } from './firebase.config.js';

let completedFixtures = [];
let allPlayers = new Map();
let teamsMap = new Map();

async function fetchCompletedFixtures() {
    try {
        const fixturesQuery = query(collection(db, "match_results"), where("status", "==", "completed"), orderBy("scheduledDate", "desc"));
        const fixturesSnapshot = await getDocs(fixturesQuery);
        completedFixtures = fixturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching completed fixtures:", error);
    }
}

async function fetchPlayers() {
    try {
        const playersSnapshot = await getDocs(collection(db, "players_public"));
        playersSnapshot.forEach(doc => allPlayers.set(doc.id, { id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching players:", error);
    }
}

async function fetchTeams() {
    try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
    } catch (error) {
        console.error("Error fetching teams:", error);
    }
}

function populateDateSelect() {
    const dateSelect = document.getElementById('edit-date-select');
    if (!dateSelect) return;
    dateSelect.innerHTML = '<option value="">Select a date</option>';
    const uniqueDates = [...new Set(completedFixtures.map(f => f.scheduledDate.toDate().toISOString().split('T')[0]))];
    uniqueDates.forEach(dateStr => {
        const option = document.createElement('option');
        option.value = dateStr;
        option.textContent = new Date(dateStr).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        dateSelect.appendChild(option);
    });
}

function initializeEditFixture() {
    const dateSelect = document.getElementById('edit-date-select');
    const matchSelect = document.getElementById('edit-match-select');
    const resultsFormContainer = document.getElementById('edit-results-form-container');

    if (!dateSelect) return;

    dateSelect.addEventListener('change', () => {
        matchSelect.innerHTML = '<option value="">Select a match</option>';
        matchSelect.disabled = true;
        resultsFormContainer.style.display = 'none';
        const matchesOnDate = completedFixtures.filter(f => f.scheduledDate.toDate().toISOString().split('T')[0] === dateSelect.value);
        matchesOnDate.forEach(fixture => {
            const homeTeamName = teamsMap.get(fixture.homeTeamId);
            const awayTeamName = teamsMap.get(fixture.awayTeamId);
            const time = fixture.scheduledDate.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const option = document.createElement('option');
            option.value = fixture.id;
            option.textContent = `${homeTeamName} vs ${awayTeamName} (${time})`;
            matchSelect.appendChild(option);
        });
        matchSelect.disabled = false;
    });

    matchSelect.addEventListener('change', async () => {
        resultsFormContainer.style.display = 'none';
        const fixtureId = matchSelect.value;
        const fixture = completedFixtures.find(f => f.id === fixtureId);
        if (fixture) {
            document.getElementById('edit-home-team-name-header').textContent = teamsMap.get(fixture.homeTeamId);
            document.getElementById('edit-away-team-name-header').textContent = teamsMap.get(fixture.awayTeamId);

            document.getElementById('edit-home-bowled-first').value = fixture.homeTeamId;
            document.getElementById('edit-away-bowled-first').value = fixture.awayTeamId;

            if (fixture.bowledFirst === fixture.homeTeamId) {
                document.getElementById('edit-home-bowled-first').checked = true;
            } else {
                document.getElementById('edit-away-bowled-first').checked = true;
            }

            const homeScorecard = document.getElementById('edit-home-team-scorecard');
            const awayScorecard = document.getElementById('edit-away-team-scorecard');

            await renderScorecardForEdit(fixture.homeTeamId, homeScorecard, allPlayers, fixture.homeScores);
            await renderScorecardForEdit(fixture.awayTeamId, awayScorecard, allPlayers, fixture.awayScores);

            updateTeamTotal(homeScorecard, document.getElementById('edit-home-team-total-display'));
            updateTeamTotal(awayScorecard, document.getElementById('edit-away-team-total-display'));
            
            resultsFormContainer.style.display = 'block';
        }
    });

    document.getElementById('submit-edited-results-btn').addEventListener('click', async () => {
        const fixtureId = matchSelect.value;
        const originalFixture = completedFixtures.find(f => f.id === fixtureId);
    
        const getScores = (containerId) => {
            return Array.from(document.querySelectorAll(`#${containerId} tbody tr`)).map(row => ({
                playerId: row.querySelector('.player-select').value,
                hands: Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0),
                score: parseInt(row.querySelector('.total-score-col').textContent)
            })).filter(s => s.playerId && s.hands.length === 5);
        };
    
        const homeScores = getScores('edit-home-team-scorecard');
        const awayScores = getScores('edit-away-team-scorecard');
        const bowledFirst = document.querySelector('input[name="edit-bowled-first"]:checked')?.value;
    
        const errors = [];
        if (homeScores.length < 6) errors.push("Home team has incomplete scores.");
        if (awayScores.length < 6) errors.push("Away team has incomplete scores.");
        if (!bowledFirst) errors.push("Please select which team bowled first.");
    
        if (errors.length > 0) {
            alert("Please correct the following issues:\n\n- " + errors.join("\n- "));
            return;
        }
    
        const resultsData = {
            homeScore: parseInt(document.getElementById('edit-home-team-total-display').textContent),
            awayScore: parseInt(document.getElementById('edit-away-team-total-display').textContent),
            homeScores,
            awayScores,
            bowledFirst,
            status: 'completed'
        };
    
        try {
            await revertLeagueTableStats(originalFixture);
            await updateDoc(doc(db, "match_results", fixtureId), resultsData);
            await updateLeagueTable(originalFixture, resultsData);
    
            alert('Results updated and league table adjusted successfully!');
            await fetchCompletedFixtures();
            populateDateSelect();
            matchSelect.innerHTML = '<option value="">Select a match</option>';
            matchSelect.disabled = true;
            resultsFormContainer.style.display = 'none';
        } catch (error) {
            console.error("Error submitting edited results:", error);
            alert('An error occurred while submitting the edited results.');
        }
    });
}

async function renderScorecardForEdit(teamId, container, allPlayers, scores) {
    if (!container) return;
    const teamPlayers = Array.from(allPlayers.values()).filter(p => p.teamId === teamId);

    container.innerHTML = `
        <thead>
            <tr>
                <th class="player-name-col">Player</th>
                <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                <th class="total-score-col">Total</th>
            </tr>
        </thead>
        <tbody>
            ${scores.map(playerScore => `
                <tr>
                    <td class="player-name-col">
                        <select class="player-select">
                            <option value="">Select player</option>
                            <option value="sixthPlayer">6th Player</option>
                            ${teamPlayers.map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('')}
                        </select>
                    </td>
                    ${playerScore.hands.map(hand => `<td class="hand-score-col"><input type="number" class="hand-score" min="0" max="27" value="${hand}"></td>`).join('')}
                    <td class="total-score-col">${playerScore.score}</td>
                </tr>
            `).join('')}
        </tbody>`;

    const playerSelects = container.querySelectorAll('.player-select');
    scores.forEach((playerScore, index) => {
        if (playerSelects[index]) {
            playerSelects[index].value = playerScore.playerId;
        }
    });

    const updateAllPlayerSelects = () => {
        const currentlySelectedPlayerIds = Array.from(playerSelects)
            .map(select => select.value)
            .filter(value => value && value !== 'sixthPlayer');

        playerSelects.forEach(selectElement => {
            const currentSelectedValue = selectElement.value;
            // Filter and re-add options
            Array.from(selectElement.options).forEach(option => {
                if (option.value && option.value !== 'sixthPlayer' && option.value !== currentSelectedValue) {
                    if (currentlySelectedPlayerIds.includes(option.value)) {
                        option.style.display = 'none';
                    } else {
                        option.style.display = 'block';
                    }
                }
            });
        });
    };

    playerSelects.forEach(selectElement => {
        selectElement.addEventListener('change', () => {
            updateTeamTotal(container, container.id.includes('home') ? document.getElementById('edit-home-team-total-display') : document.getElementById('edit-away-team-total-display'));
            updateAllPlayerSelects();
        });
    });

    updateAllPlayerSelects();

    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('hand-score')) {
            const row = e.target.closest('tr');
            if (row) {
                const handScores = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
                row.querySelector('.total-score-col').textContent = handScores.reduce((a, b) => a + b, 0);
                const totalDisplay = container.id.includes('home') ? document.getElementById('edit-home-team-total-display') : document.getElementById('edit-away-team-total-display');
                if (totalDisplay) {
                    updateTeamTotal(container, totalDisplay);
                }
            }
        }
    });
}

function updateTeamTotal(table, totalDisplay) {
    if (!table || !totalDisplay) return;
    const playerTotals = Array.from(table.querySelectorAll('tbody .total-score-col')).map(td => parseInt(td.textContent) || 0);
    totalDisplay.textContent = playerTotals.reduce((a, b) => a + b, 0);
}

async function revertLeagueTableStats(fixture) {
    const { homeTeamId, awayTeamId, division, season, homeScore, awayScore } = fixture;

    let homeOutcome, awayOutcome;
    if (homeScore > awayScore) {
        homeOutcome = { result: 'won', points: 2 };
        awayOutcome = { result: 'lost', points: 0 };
    } else if (awayScore > homeScore) {
        homeOutcome = { result: 'lost', points: 0 };
        awayOutcome = { result: 'won', points: 2 };
    } else {
        homeOutcome = { result: 'drawn', points: 1 };
        awayOutcome = { result: 'drawn', points: 1 };
    }

    const leagueTableRef = doc(db, 'league_tables', season);
    const leagueTableSnap = await getDoc(leagueTableRef);

    if (!leagueTableSnap.exists()) {
        console.error(`League table for season ${season} not found.`);
        return;
    }

    const leagueTableData = leagueTableSnap.data();
    const standings = leagueTableData[division]?.standings || [];

    const updateStatsForTeam = (teamId, outcome, pinsFor, pinsAgainst) => {
        const teamIndex = standings.findIndex(t => t.teamId === teamId);
        if (teamIndex !== -1) {
            const teamStats = standings[teamIndex];
            teamStats.played -= 1;
            teamStats.won -= (outcome.result === 'won' ? 1 : 0);
            teamStats.lost -= (outcome.result === 'lost' ? 1 : 0);
            teamStats.drawn -= (outcome.result === 'drawn' ? 1 : 0);
            teamStats.points -= outcome.points;
            teamStats.pinsFor -= pinsFor;
            teamStats.pinsAgainst -= pinsAgainst;
            standings[teamIndex] = teamStats;
        }
    };

    updateStatsForTeam(homeTeamId, homeOutcome, homeScore, awayScore);
    updateStatsForTeam(awayTeamId, awayOutcome, awayScore, homeScore);

    const updatePayload = {
        [`${division}.standings`]: standings
    };
    await updateDoc(leagueTableRef, updatePayload);
}

async function updateLeagueTable(fixture, resultsData) {
    const { homeTeamId, awayTeamId, division, season } = fixture;
    const { homeScore, awayScore } = resultsData;

    let homeOutcome, awayOutcome;
    if (homeScore > awayScore) {
        homeOutcome = { result: 'won', points: 2 };
        awayOutcome = { result: 'lost', points: 0 };
    } else if (awayScore > homeScore) {
        homeOutcome = { result: 'lost', points: 0 };
        awayOutcome = { result: 'won', points: 2 };
    } else {
        homeOutcome = { result: 'drawn', points: 1 };
        awayOutcome = { result: 'drawn', points: 1 };
    }

    const leagueTableRef = doc(db, 'league_tables', season);
    const leagueTableSnap = await getDoc(leagueTableRef);

    if (!leagueTableSnap.exists()) {
        console.error(`League table for season ${season} not found.`);
        return;
    }

    const leagueTableData = leagueTableSnap.data();
    
    if (!leagueTableData[division]) {
        leagueTableData[division] = {
            leagueName: division.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            standings: []
        };
    }
    const standings = leagueTableData[division].standings || [];

    const updateStatsForTeam = (teamId, outcome, pinsFor, pinsAgainst) => {
        let teamIndex = standings.findIndex(t => t.teamId === teamId);
        
        if (teamIndex === -1) {
            standings.push({ teamId, teamName: teamsMap.get(teamId) });
            teamIndex = standings.length - 1;
        }
        
        const teamStats = standings[teamIndex];

        teamStats.played = (teamStats.played ?? 0) + 1;
        teamStats.won = (teamStats.won ?? 0) + (outcome.result === 'won' ? 1 : 0);
        teamStats.lost = (teamStats.lost ?? 0) + (outcome.result === 'lost' ? 1 : 0);
        teamStats.drawn = (teamStats.drawn ?? 0) + (outcome.result === 'drawn' ? 1 : 0);
        teamStats.points = (teamStats.points ?? 0) + outcome.points;
        teamStats.pinsFor = (teamStats.pinsFor ?? 0) + pinsFor;
        teamStats.pinsAgainst = (teamStats.pinsAgainst ?? 0) + pinsAgainst;

        if (!teamStats.max_score || pinsFor > teamStats.max_score) {
            teamStats.max_score = pinsFor;
        }

        standings[teamIndex] = teamStats;
    };

    updateStatsForTeam(homeTeamId, homeOutcome, homeScore, awayScore);
    updateStatsForTeam(awayTeamId, awayOutcome, awayScore, homeScore);

    const updatePayload = {
        [`${division}.standings`]: standings
    };
    await updateDoc(leagueTableRef, updatePayload);
}

export async function initAdminEditFixture() {
    await fetchTeams();
    await fetchPlayers();
    await fetchCompletedFixtures();
    populateDateSelect();
    initializeEditFixture();
}
