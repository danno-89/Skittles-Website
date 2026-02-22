import { db, doc, getDoc, setDoc, collection, getDocs, query, where, limit } from './firebase.config.js';

let currentBracketData = null;
let currentCompetitionId = null;
let currentSeason = null;
let teamsMap = new Map();

export async function initAdminBrackets() {
    const competitionSelect = document.getElementById('bracket-competition-select');
    const seasonSelect = document.getElementById('bracket-season-select');
    const loadBtn = document.getElementById('load-bracket-btn');
    const addRoundBtn = document.getElementById('add-round-btn');
    const saveBtn = document.getElementById('save-bracket-btn');

    if (!competitionSelect || !seasonSelect || !loadBtn) return;

    await fetchTeams();
    await populateCompetitions(competitionSelect);
    await populateSeasons(seasonSelect);

    // Enable load button when both are selected
    const checkSelections = () => {
        loadBtn.disabled = !(competitionSelect.value && seasonSelect.value);
    };

    competitionSelect.addEventListener('change', checkSelections);
    seasonSelect.addEventListener('change', checkSelections);

    loadBtn.addEventListener('click', async () => {
        currentCompetitionId = competitionSelect.value;
        currentSeason = seasonSelect.value;
        const compName = competitionSelect.options[competitionSelect.selectedIndex].text;

        document.getElementById('current-bracket-title').textContent = `${compName} (${currentSeason}) Bracket Editor`;
        await loadBracketData(currentCompetitionId, currentSeason);
    });

    addRoundBtn.addEventListener('click', () => {
        if (!currentBracketData) currentBracketData = { rounds: [] };
        if (!currentBracketData.rounds) currentBracketData.rounds = [];

        currentBracketData.rounds.push({
            name: `Round ${currentBracketData.rounds.length + 1}`,
            matches: []
        });
        renderBracketEditor();
    });

    saveBtn.addEventListener('click', saveBracketData);
}

async function fetchTeams() {
    try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
    } catch (error) {
        console.error("Error fetching teams for brackets:", error);
    }
}

async function populateCompetitions(selectElement) {
    try {
        const querySnapshot = await getDocs(collection(db, "competitions"));
        selectElement.innerHTML = '<option value="">Select a Competition</option>';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // We only show Pairs and Individuals
            const type = data.type || data.Type || "";
            if (type.includes('Individual') || type.includes('Pairs') || data.name === "Open Pair's" || data.name === "Ladies Pairs") {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = data.name;
                selectElement.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Error loading competitions:", error);
        selectElement.innerHTML = '<option value="">Error loading</option>';
    }
}

async function populateSeasons(selectElement) {
    try {
        const querySnapshot = await getDocs(collection(db, "seasons"));
        selectElement.innerHTML = '<option value="">Select a Season</option>';
        const seasons = [];
        querySnapshot.forEach((doc) => {
            seasons.push(doc.data().name);
        });
        seasons.sort().reverse().forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = season;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading seasons:", error);
        selectElement.innerHTML = '<option value="">Error loading</option>';
    }
}

async function loadBracketData(competitionId, season) {
    const statusMsg = document.getElementById('bracket-status-message');
    statusMsg.textContent = 'Loading...';
    statusMsg.className = 'status-message';

    try {
        const docId = `${competitionId}_${season}`;
        const docRef = doc(db, 'tournament_brackets', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentBracketData = docSnap.data();
            document.getElementById('bracket-provisional-checkbox').checked = !!currentBracketData.isProvisional;
            statusMsg.textContent = 'Bracket loaded.';
            statusMsg.className = 'status-message status-success';
        } else {
            // Initialize new bracket
            currentBracketData = {
                competitionId: competitionId,
                season: season,
                isProvisional: true, // Default to true for new brackets
                rounds: []
            };
            document.getElementById('bracket-provisional-checkbox').checked = true;
            statusMsg.textContent = 'No existing bracket found. Created a new one.';
            statusMsg.className = 'status-message status-success';
        }

        document.getElementById('bracket-editor-container').style.display = 'block';
        renderBracketEditor();

        // Clear status after 3s
        setTimeout(() => { statusMsg.textContent = ''; }, 3000);

    } catch (error) {
        console.error("Error loading bracket:", error);
        statusMsg.textContent = 'Error loading bracket from database.';
        statusMsg.className = 'status-message status-error';
    }
}

function renderBracketEditor() {
    const container = document.getElementById('bracket-rounds-container');
    container.innerHTML = '';

    if (!currentBracketData || !currentBracketData.rounds) return;

    if (currentBracketData.rounds.length === 0) {
        const generateBtn = document.createElement('button');
        generateBtn.className = 'btn btn-primary';
        generateBtn.textContent = 'Generate Random First Round from Entrants';
        generateBtn.style.marginBottom = '20px';
        generateBtn.addEventListener('click', async () => {
            if (confirm("This will fetch all registered players and randomly assign them to a first-round draw. Continue?")) {
                await generateRandomFirstRound();
            }
        });
        container.appendChild(generateBtn);
    }

    currentBracketData.rounds.forEach((round, roundIndex) => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'bracket-round';

        // Header
        const header = document.createElement('div');
        header.className = 'round-header';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = round.name || '';
        nameInput.placeholder = 'e.g., Quarter Finals';
        nameInput.addEventListener('change', (e) => {
            currentBracketData.rounds[roundIndex].name = e.target.value;
        });

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '5px';
        actionsDiv.style.alignItems = 'center';

        if (roundIndex > 0) {
            const moveUpBtn = document.createElement('button');
            moveUpBtn.className = 'btn btn-secondary';
            moveUpBtn.innerHTML = '<span class="material-symbols-outlined">arrow_back</span>';
            moveUpBtn.title = 'Move Round Left (Earlier)';
            moveUpBtn.style.padding = '0.2rem';
            moveUpBtn.addEventListener('click', () => {
                const temp = currentBracketData.rounds[roundIndex - 1];
                currentBracketData.rounds[roundIndex - 1] = currentBracketData.rounds[roundIndex];
                currentBracketData.rounds[roundIndex] = temp;
                renderBracketEditor();
            });
            actionsDiv.appendChild(moveUpBtn);
        }

        if (roundIndex < currentBracketData.rounds.length - 1) {
            const moveDownBtn = document.createElement('button');
            moveDownBtn.className = 'btn btn-secondary';
            moveDownBtn.innerHTML = '<span class="material-symbols-outlined">arrow_forward</span>';
            moveDownBtn.title = 'Move Round Right (Later)';
            moveDownBtn.style.padding = '0.2rem';
            moveDownBtn.addEventListener('click', () => {
                const temp = currentBracketData.rounds[roundIndex + 1];
                currentBracketData.rounds[roundIndex + 1] = currentBracketData.rounds[roundIndex];
                currentBracketData.rounds[roundIndex] = temp;
                renderBracketEditor();
            });
            actionsDiv.appendChild(moveDownBtn);
        }

        const removeRoundBtn = document.createElement('button');
        removeRoundBtn.className = 'remove-round-btn';
        removeRoundBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
        removeRoundBtn.title = "Delete this round";
        removeRoundBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to delete this round and all its matches?")) {
                currentBracketData.rounds.splice(roundIndex, 1);
                renderBracketEditor();
            }
        });
        actionsDiv.appendChild(removeRoundBtn);

        header.appendChild(nameInput);
        header.appendChild(actionsDiv);
        roundDiv.appendChild(header);

        // Matches
        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'bracket-matches';

        if (round.matches) {
            round.matches.forEach((match, matchIndex) => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'bracket-match-edit';
                matchDiv.style.flexDirection = 'column';
                matchDiv.style.alignItems = 'stretch';
                matchDiv.style.position = 'relative';

                // Home Row
                const homeRow = document.createElement('div');
                homeRow.style.display = 'flex';
                homeRow.style.gap = 'var(--spacing-sm)';
                homeRow.style.alignItems = 'center';

                const homeInput = document.createElement('input');
                homeInput.type = 'text';
                homeInput.placeholder = 'Home Participant / Team';
                homeInput.value = match.homeName || '';
                homeInput.style.flexGrow = '1';
                homeInput.addEventListener('change', (e) => {
                    currentBracketData.rounds[roundIndex].matches[matchIndex].homeName = e.target.value;
                });

                const homeScoreInput = document.createElement('input');
                homeScoreInput.type = 'number';
                homeScoreInput.step = '0.5';
                homeScoreInput.className = 'score-input';
                homeScoreInput.value = match.homeScore !== undefined && match.homeScore !== null ? match.homeScore : '';
                homeScoreInput.addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value);
                    currentBracketData.rounds[roundIndex].matches[matchIndex].homeScore = isNaN(val) ? null : val;
                });

                homeRow.appendChild(homeInput);
                homeRow.appendChild(homeScoreInput);

                // Vs Text (optional, can omit for cleaner stacked look, but keeping it small)
                const vsText = document.createElement('div');
                vsText.textContent = 'vs';
                vsText.style.textAlign = 'center';
                vsText.style.fontSize = '0.8rem';
                vsText.style.color = 'var(--medium-grey)';
                vsText.style.margin = '-4px 0';

                // Away Row
                const awayRow = document.createElement('div');
                awayRow.style.display = 'flex';
                awayRow.style.gap = 'var(--spacing-sm)';
                awayRow.style.alignItems = 'center';

                const awayInput = document.createElement('input');
                awayInput.type = 'text';
                awayInput.placeholder = 'Away Participant / Team';
                awayInput.value = match.awayName || '';
                awayInput.style.flexGrow = '1';
                awayInput.addEventListener('change', (e) => {
                    currentBracketData.rounds[roundIndex].matches[matchIndex].awayName = e.target.value;
                });

                const awayScoreInput = document.createElement('input');
                awayScoreInput.type = 'number';
                awayScoreInput.step = '0.5';
                awayScoreInput.className = 'score-input';
                awayScoreInput.value = match.awayScore !== undefined && match.awayScore !== null ? match.awayScore : '';
                awayScoreInput.addEventListener('change', (e) => {
                    const val = parseFloat(e.target.value);
                    currentBracketData.rounds[roundIndex].matches[matchIndex].awayScore = isNaN(val) ? null : val;
                });

                awayRow.appendChild(awayInput);
                awayRow.appendChild(awayScoreInput);

                // Remove Match
                const removeMatchBtn = document.createElement('button');
                removeMatchBtn.className = 'remove-match-btn';
                removeMatchBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
                removeMatchBtn.title = "Remove Match";
                removeMatchBtn.style.position = 'absolute';
                removeMatchBtn.style.right = '-35px';
                removeMatchBtn.style.top = '50%';
                removeMatchBtn.style.transform = 'translateY(-50%)';
                removeMatchBtn.addEventListener('click', () => {
                    currentBracketData.rounds[roundIndex].matches.splice(matchIndex, 1);
                    renderBracketEditor();
                });

                matchDiv.appendChild(homeRow);
                matchDiv.appendChild(vsText);
                matchDiv.appendChild(awayRow);
                matchDiv.appendChild(removeMatchBtn);

                matchesContainer.appendChild(matchDiv);
            });
        }

        // Add Match Btn
        const addMatchBtn = document.createElement('button');
        addMatchBtn.className = 'btn btn-secondary add-match-btn';
        addMatchBtn.textContent = '+ Add Match';
        addMatchBtn.addEventListener('click', () => {
            if (!currentBracketData.rounds[roundIndex].matches) {
                currentBracketData.rounds[roundIndex].matches = [];
            }
            currentBracketData.rounds[roundIndex].matches.push({
                homeName: '',
                awayName: '',
                homeScore: null,
                awayScore: null
            });
            renderBracketEditor();
        });

        roundDiv.appendChild(matchesContainer);
        roundDiv.appendChild(addMatchBtn);
        container.appendChild(roundDiv);
    });
}

async function saveBracketData() {
    if (!currentBracketData || !currentCompetitionId || !currentSeason) return;

    const statusMsg = document.getElementById('bracket-status-message');
    statusMsg.textContent = 'Saving...';
    statusMsg.className = 'status-message';

    // Parse numeric scores properly and sanitize data
    const cleanData = {
        competitionId: currentBracketData.competitionId || currentCompetitionId,
        season: currentBracketData.season || currentSeason,
        isProvisional: document.getElementById('bracket-provisional-checkbox').checked,
        rounds: currentBracketData.rounds.map(r => ({
            name: r.name || "",
            matches: (r.matches || []).map(m => ({
                homeName: m.homeName || "",
                awayName: m.awayName || "",
                homeScore: m.homeScore !== null && m.homeScore !== undefined && !isNaN(m.homeScore) ? Number(m.homeScore) : null,
                awayScore: m.awayScore !== null && m.awayScore !== undefined && !isNaN(m.awayScore) ? Number(m.awayScore) : null,
            }))
        }))
    };

    try {
        const docId = `${currentCompetitionId}_${currentSeason}`;
        const docRef = doc(db, 'tournament_brackets', docId);
        await setDoc(docRef, cleanData);

        statusMsg.textContent = 'Bracket saved successfully!';
        statusMsg.className = 'status-message status-success';

        // Clear status after 3s
        setTimeout(() => { statusMsg.textContent = ''; }, 3000);

        // Update local memory to match saved clean data
        currentBracketData = cleanData;
        renderBracketEditor();

    } catch (error) {
        console.error("Error saving bracket:", error);
        statusMsg.textContent = 'Failed to save bracket.';
        statusMsg.className = 'status-message status-error';
    }
}
function getNextPowerOfTwo(n) {
    if (n <= 2) return 2;
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

// Fisher-Yates shuffle
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function generateRandomFirstRound() {
    const statusMsg = document.getElementById('bracket-status-message');
    statusMsg.textContent = 'Fetching entrants...';
    statusMsg.className = 'status-message';

    try {
        const eventsQuery = await getDocs(query(collection(db, "events"),
            where("season", "==", currentSeason),
            where("name", "==", document.getElementById('bracket-competition-select').options[document.getElementById('bracket-competition-select').selectedIndex].text),
            limit(1)
        ));

        let registrations = [];
        if (!eventsQuery.empty) {
            const eventDoc = eventsQuery.docs[0];
            const registrationDocRef = doc(db, 'competition-registrations', eventDoc.id);
            const registrationDocSnap = await getDoc(registrationDocRef);

            if (registrationDocSnap.exists() && registrationDocSnap.data().entries) {
                registrations = registrationDocSnap.data().entries;
            }
        }

        if (registrations.length === 0) {
            alert("No entrants found for this competition.");
            statusMsg.textContent = '';
            return;
        }

        // Map entrants to display names and ensure no duplicates
        let participantsSet = new Set();
        registrations.forEach(entry => {
            let name = entry.player1Name || "Unknown Player";
            if (entry.player2Name) {
                name += ` & ${entry.player2Name}`;
            }
            // Normalize case / trim to avoid slight variations causing dupes
            participantsSet.add(name.trim());
        });

        // Convert Set back to Array to guarantee uniqueness
        let participants = Array.from(participantsSet);

        // If after deduplication we somehow have 0, gracefully exit
        if (participants.length === 0) {
            alert("No unique entrants found for this competition.");
            statusMsg.textContent = '';
            return;
        }

        // Calculate spots needed
        const totalSpots = getNextPowerOfTwo(participants.length);
        const byesNeeded = totalSpots - participants.length;

        // Add 'Potential Registration' for empty spots
        for (let i = 0; i < byesNeeded; i++) {
            participants.push('Potential Registration');
        }

        // Shuffle
        shuffleArray(participants);

        // Create Matches
        const newMatches = [];
        for (let i = 0; i < participants.length; i += 2) {
            newMatches.push({
                homeName: participants[i],
                awayName: participants[i + 1],
                homeScore: null,
                awayScore: null
            });
        }

        currentBracketData.rounds = [{
            name: "Round 1",
            matches: newMatches
        }];

        // Auto-check provisional
        currentBracketData.isProvisional = true;
        document.getElementById('bracket-provisional-checkbox').checked = true;

        statusMsg.textContent = 'Draw generated! Remember to save.';
        statusMsg.className = 'status-message status-success';

        renderBracketEditor();

        setTimeout(() => { statusMsg.textContent = ''; }, 4000);

    } catch (error) {
        console.error("Error generating draw:", error);
        statusMsg.textContent = 'Failed to generate draw.';
        statusMsg.className = 'status-message status-error';
    }
}
