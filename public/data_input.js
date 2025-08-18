import { auth, db } from './firebase.config.js';
import { collection, getDocs, doc, getDoc, updateDoc, where, query } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const fixtureSelector = document.getElementById('fixture-selector');
const homeTeamTbody = document.getElementById('home-team-tbody');
const awayTeamTbody = document.getElementById('away-team-tbody');
const homeTeamName = document.getElementById('home-team-name');
const awayTeamName = document.getElementById('away-team-name');
const submitScoresBtn = document.getElementById('submit-scores-btn');
const dataInputContainer = document.getElementById('data-input-container');

let matchResultsData = {};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'players_public', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().committee) {
            populateFixtures();
        } else {
            dataInputContainer.innerHTML = '<h1>Access Denied</h1><p>You must be a committee member to view this page.</p>';
        }
    } else {
        dataInputContainer.innerHTML = '<h1>Please Log In</h1><p>You must be logged in to view this page.</p><button id="login-btn">Log In</button>';
        const loginBtn = document.getElementById('login-btn');
        loginBtn.addEventListener('click', () => {
            window.location.href = 'create.html';
        });
    }
});

async function populateFixtures() {
    const matchResultsSnapshot = await getDocs(collection(db, 'match_results'));
    matchResultsSnapshot.forEach(doc => {
        matchResultsData[doc.id] = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = `${doc.data().home_team} vs ${doc.data().away_team} - ${doc.data().date}`;
        fixtureSelector.appendChild(option);
    });
}

fixtureSelector.addEventListener('change', async (e) => {
    const matchId = e.target.value;
    if (matchId) {
        const match = matchResultsData[matchId];
        homeTeamName.textContent = match.home_team;
        awayTeamName.textContent = match.away_team;
        await populateScoreTables(match.home_team, match.away_team);
        populateExistingScores(matchId);
    }
});

async function populateScoreTables(homeTeam, awayTeam) {
    const homePlayers = await getTeamPlayers(homeTeam);
    const awayPlayers = await getTeamPlayers(awayTeam);

    renderTeamTable(homeTeamTbody, homePlayers);
    renderTeamTable(awayTeamTbody, awayPlayers);
}

async function getTeamPlayers(teamName) {
    const players = [];
    const q = query(collection(db, 'players_public'), where('team', '==', teamName));
    const playersSnapshot = await getDocs(q);
    playersSnapshot.forEach(doc => {
        const data = doc.data();
        if (!data.registration_expiry || data.registration_expiry.toDate() > new Date()) {
            players.push({ id: doc.id, name: data.display_name });
        }
    });
    return players;
}

function renderTeamTable(tbody, players) {
    tbody.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr');
        const playerTd = document.createElement('td');
        const scoreTd = document.createElement('td');
        const playerSelect = document.createElement('select');
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Select Player';
        defaultOption.value = '';
        playerSelect.appendChild(defaultOption);

        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            playerSelect.appendChild(option);
        });

        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.min = 0;
        scoreInput.max = 60;

        playerTd.appendChild(playerSelect);
        scoreTd.appendChild(scoreInput);
        tr.appendChild(playerTd);
        tr.appendChild(scoreTd);
        tbody.appendChild(tr);
    }
}

function populateExistingScores(matchId) {
    const match = matchResultsData[matchId];
    if (match.home_scores) {
        populateTableScores(homeTeamTbody, match.home_scores);
    }
    if (match.away_scores) {
        populateTableScores(awayTeamTbody, match.away_scores);
    }
}

function populateTableScores(tbody, scores) {
    const rows = tbody.querySelectorAll('tr');
    scores.forEach((score, index) => {
        if (rows[index]) {
            rows[index].querySelector('select').value = score.player_id;
            rows[index].querySelector('input').value = score.score;
        }
    });
}

submitScoresBtn.addEventListener('click', async () => {
    const matchId = fixtureSelector.value;
    if (!matchId) {
        alert('Please select a fixture.');
        return;
    }

    const homeScores = getScoresFromTable(homeTeamTbody);
    const awayScores = getScoresFromTable(awayTeamTbody);

    if (homeScores.length < 5 || awayScores.length < 5) {
        alert('Please enter all scores.');
        return;
    }

    const matchData = {
        home_scores: homeScores,
        away_scores: awayScores,
    };

    try {
        const matchDocRef = doc(db, 'match_results', matchId);
        await updateDoc(matchDocRef, matchData);
        alert('Scores submitted successfully!');
    } catch (error) {
        console.error('Error submitting scores: ', error);
        alert('An error occurred while submitting the scores.');
    }
});

function getScoresFromTable(tbody) {
    const scores = [];
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const player = row.querySelector('select').value;
        const score = row.querySelector('input').value;
        if (player && score) {
            scores.push({ player_id: player, score: parseInt(score, 10) });
        }
    });
    return scores;
}
