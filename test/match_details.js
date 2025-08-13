import { firebaseConfig } from './firebase.config.js';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Function to get match ID from URL query parameters
function getMatchId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('matchId');
}

// Function to fetch team name by ID
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

// Function to fetch competition name by ID
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

// Function to fetch player name by ID - Reverted to efficient direct lookup
const fetchPlayerName = async (playerId) => {
    if (!playerId) return 'Player N/A';
    try {
        const playerDoc = await db.collection('players_public').doc(playerId).get();
        if (playerDoc.exists) {
            const playerData = playerDoc.data();
            const firstName = playerData.firstName || '';
            const lastName = playerData.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            return fullName || 'Unknown Player';
        }
        return 'Unknown Player';
    } catch (e) {
        console.error("Error fetching player name for ID " + playerId + ":", e);
        return 'Player Fetch Error';
    }
};


// Function to render player scores in a table
const renderPlayerScores = async (players, teamType) => {
    if (!players || players.length === 0) return '';

    // Create table headers
    const scoreHeaders = players[0].scores.map((_, index) => `<th>Pin ${index + 1}</th>`).join('');
    
    let tableHTML = `
        <div class="player-scores-table-container">
            <h3>${teamType === 'home' ? 'Home' : 'Away'} Players</h3>
            <table class="player-scores-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        ${scoreHeaders}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Create table rows for each player
    for (const player of players) {
        const playerName = await fetchPlayerName(player.playerId);
        const scoreCells = player.scores.map(score => `<td>${score}</td>`).join('');
        const totalScore = player.scores.reduce((sum, score) => sum + Number(score), 0);
        
        tableHTML += `
            <tr>
                <td>${playerName}</td>
                ${scoreCells}
                <td class="total-score">${totalScore}</td>
            </tr>
        `;
    }

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    return tableHTML;
};


// Function to fetch and display match details
async function displayMatchDetails() {
    const matchId = getMatchId();
    const matchDetailsContainer = document.getElementById('match-details-container');
    const playerScoresContainer = document.getElementById('player-scores-container');


    if (!matchId) {
        matchDetailsContainer.innerHTML = '<p>No match ID was provided in the URL.</p>';
        return;
    }

    try {
        const matchDoc = await db.collection('match_results').doc(matchId).get();

        if (!matchDoc.exists) {
            matchDetailsContainer.innerHTML = '<p>Match not found for the given ID.</p>';
            return;
        }

        const matchData = matchDoc.data();
        
        // Fetch names using the correct fields
        const homeTeamName = await fetchTeamName(matchData.homeTeamId);
        const awayTeamName = await fetchTeamName(matchData.awayTeamId);
        const competitionName = await fetchCompetitionName(matchData.division);

        // Safely access scores
        const homeScore = matchData.homeScore ?? 'N/A';
        const awayScore = matchData.awayScore ?? 'N/A';

        // Safely format the date and time
        let formattedDate = 'Date not available';
        let formattedTime = '';
        if (matchData.scheduledDate) {
            const dateObj = typeof matchData.scheduledDate.toDate === 'function' 
                ? matchData.scheduledDate.toDate() 
                : new Date(matchData.scheduledDate);
            
            if (!isNaN(dateObj)) {
                formattedDate = dateObj.toLocaleDateString('en-GB', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC'
                });
            }
        }
        
        const matchDetailsHTML = `
            <a href="fixtures_results.html" class="back-link">← Back to Fixtures</a>

            <div class="match-meta-info">
                <div class="date-time-info">
                    <p class="match-date">${formattedDate}</p>
                    <p class="match-time">${formattedTime}</p>
                </div>
                <p class="match-competition">${competitionName}</p>
            </div>

            <div class="match-score-info">
                <span class="team-name home-team">${homeTeamName}</span>
                <span class="score">${homeScore} - ${awayScore}</span>
                <span class="team-name away-team">${awayTeamName}</span>
            </div>
        `;

        matchDetailsContainer.innerHTML = matchDetailsHTML;

        // Render player scores
        if (matchData.players) {
            const homePlayersHTML = await renderPlayerScores(matchData.players.home, 'home');
            const awayPlayersHTML = await renderPlayerScores(matchData.players.away, 'away');
            playerScoresContainer.innerHTML = homePlayersHTML + awayPlayersHTML;
        }


    } catch (error) {
        console.error("A critical error occurred in displayMatchDetails:", error);
        matchDetailsContainer.innerHTML = '<p>A critical error occurred while loading match details. Please check the console.</p>';
    }
}

// Call the function to display match details when the page loads
window.onload = displayMatchDetails;
