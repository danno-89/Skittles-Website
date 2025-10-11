import { db, doc, onSnapshot, updateDoc } from '../firebase.config.js';

// --- Page Elements ---
const gameWrapper = document.querySelector('.game-wrapper');

// --- Game State ---
let gameId = null;
let gameDocRef = null;
let gameData = null;
let sortedPlayerIds = { home: [], away: [] };
let turnSequence = [];
let currentTurnIndex = 0;
let scoreInputBuffer = "";
// Manual selection for arrow key navigation
let manualTeam = 'home', manualPlayerIndex = 0, manualHandIndex = 0;
let isGameInitialized = false;

// --- Main Game Logic ---
document.addEventListener('DOMContentLoaded', () => {
    gameId = new URLSearchParams(window.location.search).get('gameId');
    if (!gameId) {
        document.body.innerHTML = '<h1>Error: No game ID provided.</h1>';
        return;
    }
    gameDocRef = doc(db, 'scoreboard', gameId);

    // Main listener for all game data changes
    onSnapshot(gameDocRef, (doc) => {
        if (!doc.exists()) {
            document.body.innerHTML = `<h1>Error: Game with ID ${gameId} not found.</h1>`;
            return;
        }
        gameData = doc.data();
        currentTurnIndex = gameData.currentTurnIndex || 0;

        // Initialize game once
        if (!isGameInitialized) {
            initializeGame();
        }
        
        // If the game is running, update everything
        if (isGameInitialized) {
            handleGameDataUpdate();
        }
    });
});

function initializeGame() {
    if (isGameInitialized) return;
    isGameInitialized = true;
    
    gameWrapper.style.display = 'flex';
    document.addEventListener('keydown', handleKeyPress);
    
    // Initial data processing
    handleGameDataUpdate(); 
}

function handleGameDataUpdate() {
    // Generate the turn sequence based on the latest player data
    generateTurnSequence();
    
    // Update the UI with the latest scores
    updateUI();

    // Set the manual selection to the current turn from Firestore
    if (currentTurnIndex < turnSequence.length) {
        const { team, playerIndex, handIndex } = turnSequence[currentTurnIndex];
        manualTeam = team;
        manualPlayerIndex = playerIndex;
        manualHandIndex = handIndex;
    }

    // Highlight the active player and update subscores
    updateHighlight();
    updateSubScores();
}


function generateTurnSequence() {
    const firstTeam = gameData.bowlingTeam;
    if (!firstTeam) return;
    const secondTeam = (firstTeam === 'home') ? 'away' : 'home';
    
    sortedPlayerIds.home = Object.keys(gameData.homeTeam.players).sort((a, b) => parseInt(a.replace('player', '')) - parseInt(b.replace('player', '')));
    sortedPlayerIds.away = Object.keys(gameData.awayTeam.players).sort((a, b) => parseInt(a.replace('player', '')) - parseInt(b.replace('player', '')));
    
    const numPlayers = sortedPlayerIds.home.length;
    turnSequence = [];
    const handSequence = [
        { team: firstTeam, handIndex: 0 }, { team: secondTeam, handIndex: 0 },
        { team: secondTeam, handIndex: 1 }, { team: firstTeam, handIndex: 1 },
        { team: firstTeam, handIndex: 2 }, { team: secondTeam, handIndex: 2 },
        { team: secondTeam, handIndex: 3 }, { team: firstTeam, handIndex: 3 },
        { team: firstTeam, handIndex: 4 }, { team: secondTeam, handIndex: 4 },
    ];
    handSequence.forEach(turn => {
        for (let playerIdx = 0; playerIdx < numPlayers; playerIdx++) {
            turnSequence.push({ team: turn.team, playerIndex: playerIdx, handIndex: turn.handIndex });
        }
    });
}

// --- Keyboard Input & Scoring ---
function handleKeyPress(e) {
    const key = e.key;
    // Prevent default for all relevant keys
    if (!isNaN(key) || key === 'Enter' || key === 'Return' || key === 'Backspace' || key.startsWith('Arrow')) {
        e.preventDefault();
    }

    if (!isNaN(key)) { 
        if (scoreInputBuffer.length < 2) { 
            scoreInputBuffer += key; 
            updateLiveInput(); 
        } 
    } else if (key === 'Enter' || key === 'Return') { 
        if (scoreInputBuffer !== "") { 
            const score = parseInt(scoreInputBuffer, 10);
            scoreInputBuffer = ""; 
            updateScore(score).then(moveToNextTurn); // Chain score update and turn move
        } 
    } else if (key === 'Backspace') { 
        scoreInputBuffer = scoreInputBuffer.slice(0, -1); 
        updateLiveInput(); 
    } else if (key.startsWith('Arrow')) { 
        scoreInputBuffer = ""; 
        handleArrowNavigation(key); 
        updateHighlight(); 
    }
}


function handleArrowNavigation(key) {
    let currentIndex = turnSequence.findIndex(t => t.team === manualTeam && t.playerIndex === manualPlayerIndex && t.handIndex === manualHandIndex);
    if (currentIndex === -1) currentIndex = currentTurnIndex;
    
    let nextIndex;
    if (key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + turnSequence.length) % turnSequence.length;
    } else if (key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % turnSequence.length;
    } else if (key === 'ArrowLeft') {
        // A simple implementation could just go back one step.
        // For more complex grid navigation, this would need more logic.
        nextIndex = (currentIndex - 1 + turnSequence.length) % turnSequence.length;
    } else if (key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % turnSequence.length;
    } else {
        return; // Should not happen
    }

    const nextTurn = turnSequence[nextIndex];
    manualTeam = nextTurn.team; 
    manualPlayerIndex = nextTurn.playerIndex; 
    manualHandIndex = nextTurn.handIndex;
}

async function updateScore(score) {
    const teamKey = manualTeam === 'home' ? 'homeTeam' : 'awayTeam';
    const playerId = sortedPlayerIds[manualTeam][manualPlayerIndex];
    const player = gameData[teamKey].players[playerId];
    const newHands = [...player.hands];
    newHands[manualHandIndex] = score;
    const newTotal = newHands.reduce((a, b) => a + (b || 0), 0);
    
    // Update score in Firestore
    await updateDoc(gameDocRef, {
        [`${teamKey}.players.${playerId}.hands`]: newHands,
        [`${teamKey}.players.${playerId}.totalScore`]: newTotal
    });
}

async function moveToNextTurn() {
    const currentIndexInSequence = turnSequence.findIndex(t => t.team === manualTeam && t.playerIndex === manualPlayerIndex && t.handIndex === manualHandIndex);
    const nextTurnIndex = (currentIndexInSequence === -1 ? currentTurnIndex : currentIndexInSequence) + 1;

    if (nextTurnIndex >= turnSequence.length) {
        console.log("Game Over!");
        document.removeEventListener('keydown', handleKeyPress);
        // Optionally update a 'gameStatus' field in Firestore
        await updateDoc(gameDocRef, { gameStatus: 'finished' });
        return;
    }
    
    // Atomically update the turn index in Firestore
    await updateDoc(gameDocRef, { currentTurnIndex: nextTurnIndex });
    // The onSnapshot listener will handle the UI updates
}


// --- UI Updates ---
function updateUI() {
    document.getElementById('home-team-header').textContent = gameData.homeTeam.name;
    document.getElementById('away-team-header').textContent = gameData.awayTeam.name;

    const scoreboardGrid = document.getElementById('scoreboard-grid');
    scoreboardGrid.innerHTML = ''; // Clear existing grid

    const homeColumn = document.createElement('div');
    homeColumn.className = 'team-column';
    const awayColumn = document.createElement('div');
    awayColumn.className = 'team-column';

    let calculatedHomeTotal = 0;
    const homeHandTotals = [0, 0, 0, 0, 0];
    sortedPlayerIds.home.forEach((playerId, index) => {
        const player = gameData.homeTeam.players[playerId];
        homeColumn.appendChild(createPlayerCard(player, 'home', index));
        calculatedHomeTotal += player.totalScore || 0;
        player.hands.forEach((h, i) => homeHandTotals[i] += h || 0);
    });

    let calculatedAwayTotal = 0;
    const awayHandTotals = [0, 0, 0, 0, 0];
    sortedPlayerIds.away.forEach((playerId, index) => {
        const player = gameData.awayTeam.players[playerId];
        awayColumn.appendChild(createPlayerCard(player, 'away', index));
        calculatedAwayTotal += player.totalScore || 0;
        player.hands.forEach((h, i) => awayHandTotals[i] += h || 0);
    });

    homeColumn.appendChild(createTotalsRow(homeHandTotals));
    awayColumn.appendChild(createTotalsRow(awayHandTotals));
    
    scoreboardGrid.append(homeColumn, awayColumn);

    document.getElementById('home-total-score').textContent = calculatedHomeTotal;
    document.getElementById('away-total-score').textContent = calculatedAwayTotal;
    document.getElementById('scoreboard-footer').textContent = `Match Total: ${calculatedHomeTotal + calculatedAwayTotal}`;
}

function updateSubScores() {
    if (!isGameInitialized || !turnSequence.length || currentTurnIndex >= turnSequence.length) {
        document.getElementById('home-sub-score-wrapper').style.display = 'none';
        document.getElementById('away-sub-score-wrapper').style.display = 'none';
        return;
    }

    const { team: bowlingTeam, playerIndex: currentPlayerIndex, handIndex: currentHandIndex } = turnSequence[currentTurnIndex];
    
    const firstTeamToBowlThisHand = turnSequence.find(t => t.handIndex === currentHandIndex).team;

    let subScoreHome = 0;
    let subScoreAway = 0;

    // Sum scores from all completed hands
    for (let h = 0; h < currentHandIndex; h++) {
        sortedPlayerIds.home.forEach(pId => subScoreHome += gameData.homeTeam.players[pId].hands[h] || 0);
        sortedPlayerIds.away.forEach(pId => subScoreAway += gameData.awayTeam.players[pId].hands[h] || 0);
    }
    
    // Logic for the current, in-progress hand
    if (bowlingTeam === firstTeamToBowlThisHand) {
        // The first team is bowling. Only compare up to the player before the current one.
        for (let p = 0; p < currentPlayerIndex; p++) {
            subScoreHome += gameData.homeTeam.players[sortedPlayerIds.home[p]]?.hands[currentHandIndex] || 0;
            subScoreAway += gameData.awayTeam.players[sortedPlayerIds.away[p]]?.hands[currentHandIndex] || 0;
        }
    } else {
        // The second team is bowling. Compare all players from the first team and up to the current player of the second team.
        for (let p = 0; p < sortedPlayerIds.home.length; p++) {
             subScoreHome += gameData.homeTeam.players[sortedPlayerIds.home[p]]?.hands[currentHandIndex] || 0;
        }
         for (let p = 0; p < currentPlayerIndex; p++) {
             subScoreAway += gameData.awayTeam.players[sortedPlayerIds.away[p]]?.hands[currentHandIndex] || 0;
        }
    }


    const homeSubScoreWrapper = document.getElementById('home-sub-score-wrapper');
    const awaySubScoreWrapper = document.getElementById('away-sub-score-wrapper');
    
    // Determine which sub-score to show. We show the score of the team that isn't bowling.
    const nonBowlingTeam = bowlingTeam === 'home' ? 'away' : 'home';
    
    if (nonBowlingTeam === 'home') {
        document.getElementById('home-sub-score').textContent = subScoreHome;
        homeSubScoreWrapper.style.display = 'block';
        awaySubScoreWrapper.style.display = 'none';
    } else {
        document.getElementById('away-sub-score').textContent = subScoreAway;
        awaySubScoreWrapper.style.display = 'block';
        homeSubScoreWrapper.style.display = 'none';
    }

    // Hide if no players have completed a turn in the current hand for the team that bowled first
    if (currentPlayerIndex === 0 && bowlingTeam === firstTeamToBowlThisHand) {
        homeSubScoreWrapper.style.display = 'none';
        awaySubScoreWrapper.style.display = 'none';
    }
}


function updateHighlight() {
    if (!isGameInitialized) return;
    document.querySelectorAll('.bowling-now, .current-hand').forEach(el => el.classList.remove('bowling-now', 'current-hand'));
    
    const playerCard = document.querySelector(`.player-card[data-team="${manualTeam}"][data-player-index="${manualPlayerIndex}"]`);
    if (playerCard) {
        playerCard.classList.add('bowling-now');
        const handEl = playerCard.querySelector(`.hand-score[data-hand-index="${manualHandIndex}"]`);
        if (handEl) {
            handEl.classList.add('current-hand');
            updateLiveInput();
        }
    }
}

function updateLiveInput() {
    const handEl = document.querySelector('.current-hand');
    if (!handEl) return;
    
    if (scoreInputBuffer !== "") {
        handEl.textContent = scoreInputBuffer;
    } else {
        const team = handEl.closest('.player-card').dataset.team;
        const pIndex = parseInt(handEl.closest('.player-card').dataset.playerIndex, 10);
        const hIndex = parseInt(handEl.dataset.handIndex, 10);
        const playerId = sortedPlayerIds[team][pIndex];
        const score = gameData[team === 'home' ? 'homeTeam' : 'awayTeam'].players[playerId].hands[hIndex];
        handEl.textContent = score !== undefined && score !== null ? score : '-';
    }
}

// --- Element Creation ---
function createPlayerCard(player, team, playerIndex) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.dataset.team = team;
    card.dataset.playerIndex = playerIndex;

    const nameEl = document.createElement('span');
    nameEl.className = 'player-name';
    nameEl.textContent = player.name;

    const handsContainer = document.createElement('div');
    handsContainer.className = 'hands-container';
    for (let i = 0; i < 5; i++) {
        const handEl = document.createElement('div');
        handEl.className = 'hand-score';
        handEl.dataset.handIndex = i;
        const score = player.hands[i];
        handEl.textContent = score !== undefined && score !== null ? score : '-';
        handsContainer.appendChild(handEl);
    }

    const totalScoreEl = document.createElement('span');
    totalScoreEl.className = 'player-total-score';
    totalScoreEl.textContent = player.totalScore || 0;

    card.append(nameEl, handsContainer, totalScoreEl);
    return card;
}

function createTotalsRow(handTotals) {
    const row = document.createElement('div');
    row.className = 'player-card totals-row';
    
    const handsContainer = document.createElement('div');
    handsContainer.className = 'hands-container';
    handTotals.forEach(total => {
        const totalEl = document.createElement('div');
        totalEl.className = 'total-hand-score';
        totalEl.textContent = total > 0 ? total : '-';
        handsContainer.appendChild(totalEl);
    });
    
    row.innerHTML = `<span class="player-name"></span>`;
    row.appendChild(handsContainer);
    row.innerHTML += `<span class="player-total-score"></span>`;
    return row;
}
