
import { db, doc, getDoc, setDoc, collection, query, where, getDocs } from "../firebase.config.js";

document.addEventListener('DOMContentLoaded', async () => {
    
    // Step Elements & State
    const steps = [
        document.getElementById('step1'),
        document.getElementById('step2'),
        document.getElementById('step3'),
        document.getElementById('step4')
    ];
    const stepTitles = [
        "Step 1: Team Names",
        "Step 2: Configure Players",
        "Step 3: Player Names",
        "Step 4: Who Bowls First?"
    ];
    let currentStep = 0;

    // UI Elements
    const actionButton = document.getElementById('action-button');
    const backButton = document.getElementById('back-button');
    const stepTitleElement = document.getElementById('step-title');
    const homeTeamNameInput = document.getElementById('home-team-name');
    const awayTeamNameInput = document.getElementById('away-team-name');
    const playerConfigContainer = document.getElementById('player-config-container');
    const homePlayerNamesContainer = document.getElementById('home-player-names');
    const awayPlayerNamesContainer = document.getElementById('away-player-names');
    const bowlingFirstContainer = document.getElementById('bowling-first-container');
    
    // Data variables
    let gameData;
    let setupConfig = {};

    try {
        const scoreboardDocRef = doc(db, 'scoreboard', 'standardGame');
        const scoreboardDocSnap = await getDoc(scoreboardDocRef);
        if (scoreboardDocSnap.exists()) {
            gameData = scoreboardDocSnap.data();
            homeTeamNameInput.placeholder = gameData.homeTeam.name;
            awayTeamNameInput.placeholder = gameData.awayTeam.name;
        } else {
            homeTeamNameInput.placeholder = "Home Team";
            awayTeamNameInput.placeholder = "Away Team";
        }
    } catch (error) {
        console.error("Error fetching game data:", error);
    }

    // --- Event Listeners ---
    actionButton.addEventListener('click', async () => {
        if (currentStep === 0) {
            setupConfig.homeTeamName = homeTeamNameInput.value || homeTeamNameInput.placeholder;
            setupConfig.awayTeamName = awayTeamNameInput.value || awayTeamNameInput.placeholder;
            populatePlayerConfig();
            goToStep(1);
        } else if (currentStep === 1) {
            setupConfig.homePlayers = document.getElementById('home-players').value;
            setupConfig.awayPlayers = document.getElementById('away-players').value;
            generatePlayerNameInputs();
            goToStep(2);
        } else if (currentStep === 2) {
            populateBowlingFirstStep();
            goToStep(3);
            actionButton.style.display = 'none';
            backButton.style.display = 'none';
        }
    });

    backButton.addEventListener('click', () => {
        if (currentStep > 0) {
            const previousStep = currentStep - 1;
            goToStep(previousStep);
            actionButton.textContent = 'Next';
            actionButton.disabled = false;
        } else {
            window.location.href = 'index.html';
        }
    });

    // --- Main Functions ---
    async function submitGameSetup() {
        const buttons = bowlingFirstContainer.querySelectorAll('button');
        buttons.forEach(button => button.disabled = true);

        const selectedBtnId = setupConfig.bowlingTeam === 'home' ? 'prompt-home-team' : 'prompt-away-team';
        const selectedBtn = document.getElementById(selectedBtnId);
        
        if (selectedBtn) {
            selectedBtn.textContent = 'Creating...';
            selectedBtn.classList.add('selected');
        } else {
            document.getElementById('prompt-random').textContent = 'Creating...';
        }

        try {
            const gameId = await generateGameId();
            const gamePayload = createGamePayload();
            
            await setDoc(doc(db, 'scoreboard', gameId), gamePayload);

            window.location.href = `standard-game.html?gameId=${gameId}`;

        } catch (error) {
            console.error("Error submitting game setup:", error);
            alert("Could not create the game. Please try again.");
            buttons.forEach(button => button.disabled = false);
            if(selectedBtn) {
                selectedBtn.textContent = setupConfig.bowlingTeam === 'home' ? setupConfig.homeTeamName : setupConfig.awayTeamName;
            } else {
                document.getElementById('prompt-random').textContent = 'Choose for me';
            }
        }
    }

    function createGamePayload() {
        const homePlayerInputs = homePlayerNamesContainer.querySelectorAll('input');
        const awayPlayerInputs = awayPlayerNamesContainer.querySelectorAll('input');
        
        const payload = {
            homeTeam: {
                name: setupConfig.homeTeamName,
                players: {}
            },
            awayTeam: {
                name: setupConfig.awayTeamName,
                players: {}
            },
            bowlingTeam: setupConfig.bowlingTeam,
            currentTurnIndex: 0,
            createdAt: new Date()
        };

        homePlayerInputs.forEach((input, index) => {
            payload.homeTeam.players[`player${index + 1}`] = {
                name: input.value || `Player ${index + 1}`,
                hands: [],
                totalScore: 0
            };
        });

        awayPlayerInputs.forEach((input, index) => {
            payload.awayTeam.players[`player${index + 1}`] = {
                name: input.value || `Player ${index + 1}`,
                hands: [],
                totalScore: 0
            };
        });
        
        return payload;
    }

    async function generateGameId() {
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const datePrefix = `standardGame-${year}${month}${day}`;

        const q = query(collection(db, 'scoreboard'), where('__name__', '>=', datePrefix));
        const querySnapshot = await getDocs(q);
        
        let maxSeq = 0;
        querySnapshot.forEach(doc => {
            if (doc.id.startsWith(datePrefix)) {
                const seq = parseInt(doc.id.slice(-3));
                if (seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });

        const newSeq = (maxSeq + 1).toString().padStart(3, '0');
        return `${datePrefix}-${newSeq}`;
    }

    // --- Helper Functions ---
    function goToStep(stepIndex) {
        steps[currentStep].classList.remove('active');
        steps[currentStep].style.display = 'none';
        currentStep = stepIndex;
        steps[currentStep].classList.add('active');
        steps[currentStep].style.display = 'block';
        stepTitleElement.textContent = stepTitles[currentStep];
    }

    function populatePlayerConfig() {
        playerConfigContainer.innerHTML = `
            <div class="team-card">
                <h3>${setupConfig.homeTeamName}</h3>
                <p>Number of Players:</p>
                <div class="player-config">
                    <button id="home-minus">-</button>
                    <input type="number" id="home-players" value="${gameData?.homeTeam.playerNos || '5'}" min="1" readonly>
                    <button id="home-plus">+</button>
                </div>
            </div>
            <div class="team-card">
                <h3>${setupConfig.awayTeamName}</h3>
                <p>Number of Players:</p>
                <div class="player-config">
                    <button id="away-minus">-</button>
                    <input type="number" id="away-players" value="${gameData?.awayTeam.playerNos || '5'}" min="1" readonly>
                    <button id="away-plus">+</button>
                </div>
            </div>
        `;
        setupPlayerCounters();
    }
    
    function generatePlayerNameInputs() {
        const homePlayerCount = document.getElementById('home-players').value;
        const awayPlayerCount = document.getElementById('away-players').value;

        let homeInputs = `<h3>${setupConfig.homeTeamName}</h3>`;
        for (let i = 1; i <= homePlayerCount; i++) {
            homeInputs += `<input type="text" placeholder="Player ${i} Name">`;
        }
        homePlayerNamesContainer.innerHTML = homeInputs;

        let awayInputs = `<h3>${setupConfig.awayTeamName}</h3>`;
        for (let i = 1; i <= awayPlayerCount; i++) {
            awayInputs += `<input type="text" placeholder="Player ${i} Name">`;
        }
        awayPlayerNamesContainer.innerHTML = awayInputs;
    }

    function populateBowlingFirstStep() {
        bowlingFirstContainer.innerHTML = `
            <div class="bowling-prompt-container">
                <h2>Who is bowling first?</h2>
                <div class="prompt-buttons">
                    <button id="prompt-home-team" class="btn home-btn">${setupConfig.homeTeamName}</button>
                    <button id="prompt-away-team" class="btn away-btn">${setupConfig.awayTeamName}</button>
                </div>
                <button id="prompt-random" class="btn random-btn">Choose for me</button>
            </div>
        `;
    
        document.getElementById('prompt-home-team').addEventListener('click', () => {
            setupConfig.bowlingTeam = 'home';
            submitGameSetup();
        });
        document.getElementById('prompt-away-team').addEventListener('click', () => {
            setupConfig.bowlingTeam = 'away';
            submitGameSetup();
        });
        document.getElementById('prompt-random').addEventListener('click', () => {
            setupConfig.bowlingTeam = ['home', 'away'][Math.floor(Math.random() * 2)];
            submitGameSetup();
        });
    }
});

function setupPlayerCounters() {
    const homePlayersInput = document.getElementById('home-players');
    const awayPlayersInput = document.getElementById('away-players');

    document.getElementById('home-minus').addEventListener('click', () => {
        if (homePlayersInput.value > 1) homePlayersInput.value--;
    });
    document.getElementById('home-plus').addEventListener('click', () => {
        homePlayersInput.value++;
    });
    document.getElementById('away-minus').addEventListener('click', () => {
        if (awayPlayersInput.value > 1) awayPlayersInput.value--;
    });
    document.getElementById('away-plus').addEventListener('click', () => {
        awayPlayersInput.value++;
    });
}
