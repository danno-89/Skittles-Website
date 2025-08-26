import { db, collection, doc, getDocs, updateDoc, query, where, orderBy, getDoc, auth } from './firebase.config.js';

document.addEventListener('authReady', async ({ detail }) => {
    if (detail.user) {
        // Check if the user is an authorized admin by looking them up in the 'users' collection.
        const userDocRef = doc(db, 'users', detail.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            console.log("User is authorized. Initializing admin page.");
            initializeAdminPage();
        } else {
            console.log("User is not authorized. Hiding admin tools.");
            document.getElementById('tab-content-container').innerHTML = 
                '<p>You do not have the necessary permissions to view this page.</p>';
        }
    }
});

function initializeAdminPage() {
    initializeTabs();
    initializeResultsInput();
    // The committee admin tab is no longer needed with this security model.
    // I'll hide it to prevent confusion.
    const committeeAdminTab = document.querySelector('[data-tab="committee-admin"]');
    if (committeeAdminTab) {
        committeeAdminTab.style.display = 'none';
    }
}


function initializeTabs() {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabPanes.forEach(pane => {
                if (pane.id === `${tabName}-content`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });
}

async function initializeResultsInput() {
    const dateSelect = document.getElementById('date-select');
    const matchSelect = document.getElementById('match-select');
    const resultsFormContainer = document.getElementById('results-form-container');
    
    const homeTeamNameHeader = document.getElementById('home-team-name-header');
    const awayTeamNameHeader = document.getElementById('away-team-name-header');
    const homeTeamScorecard = document.getElementById('home-team-scorecard');
    const awayTeamScorecard = document.getElementById('away-team-scorecard');
    const homeTeamTotalDisplay = document.getElementById('home-team-total-display');
    const awayTeamTotalDisplay = document.getElementById('away-team-total-display');
    
    const submitResultsBtn = document.getElementById('submit-results-btn');

    let allFixtures = [];
    let allPlayers = new Map();
    let teamsMap = new Map();

    const fetchAllData = async () => {
        const playersSnapshot = await getDocs(collection(db, "players_public"));
        playersSnapshot.forEach(doc => allPlayers.set(doc.id, { id: doc.id, ...doc.data() }));
        
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
    };

    const populateDateSelect = async () => {
        const fixturesQuery = query(collection(db, "match_results"), where("status", "==", "scheduled"), orderBy("scheduledDate"));
        const fixturesSnapshot = await getDocs(fixturesQuery);
        allFixtures = fixturesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const uniqueDates = [...new Set(allFixtures.map(f => f.scheduledDate.toDate().toISOString().split('T')[0]))];
        
        dateSelect.innerHTML = '<option value="">Select a date</option>';
        uniqueDates.forEach(dateStr => {
            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = new Date(dateStr).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            dateSelect.appendChild(option);
        });
    };

    const populateMatchSelect = (dateStr) => {
        const matchesOnDate = allFixtures.filter(f => f.scheduledDate.toDate().toISOString().split('T')[0] === dateStr);
        
        matchSelect.innerHTML = '<option value="">Select a match</option>';
        matchesOnDate.forEach(fixture => {
            const homeTeamName = teamsMap.get(fixture.homeTeamId) || 'Unknown';
            const awayTeamName = teamsMap.get(fixture.awayTeamId) || 'Unknown';
            const time = fixture.scheduledDate.toDate().toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });
            const option = document.createElement('option');
            option.value = fixture.id;
            option.textContent = `${homeTeamName} vs ${awayTeamName} (${time})`;
            matchSelect.appendChild(option);
        });
        matchSelect.disabled = false;
    };
    
    const renderScorecard = (teamId, container) => {
        const now = new Date();
        const teamPlayers = Array.from(allPlayers.values()).filter(p => 
            p.teamId === teamId && 
            (!p.registerExpiry || p.registerExpiry.toDate() >= now)
        );
        
        container.innerHTML = `
            <thead>
                <tr>
                    <th class="player-name-col">Player</th>
                    <th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>H5</th>
                    <th class="total-score-col">Total</th>
                </tr>
            </thead>
            <tbody>
                ${Array.from({ length: 6 }).map((_, i) => `
                    <tr>
                        <td class="player-name-col">
                            <select class="player-select">
                                <option value="">Select player</option>
                                ${teamPlayers.map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('')}
                            </select>
                        </td>
                        ${Array.from({ length: 5 }).map(() => `<td class="hand-score-col"><input type="number" class="hand-score" min="0" max="27"></td>`).join('')}
                        <td class="total-score-col">0</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr class="team-totals">
                    <td>Team Hand Totals</td>
                    ${Array.from({ length: 5 }).map(() => `<td class="hand-total">0</td>`).join('')}
                    <td class="total-score-col"></td>
                </tr>
            </tfoot>
        `;
        
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('hand-score')) {
                const row = e.target.closest('tr');
                const handScores = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
                const playerTotal = handScores.reduce((acc, score) => acc + score, 0);
                row.querySelector('.total-score-col').textContent = playerTotal;
                updateTeamTotal(container);
            }
        });
    };

    const updateTeamTotal = (table) => {
        const playerTotals = Array.from(table.querySelectorAll('tbody .total-score-col')).map(td => parseInt(td.textContent) || 0);
        const teamTotal = playerTotals.reduce((acc, total) => acc + total, 0);
        
        if(table.id === 'home-team-scorecard') {
            homeTeamTotalDisplay.textContent = teamTotal;
        } else {
            awayTeamTotalDisplay.textContent = teamTotal;
        }

        const handTotals = [0, 0, 0, 0, 0];
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const handInputs = row.querySelectorAll('.hand-score');
            handInputs.forEach((input, index) => {
                handTotals[index] += parseInt(input.value) || 0;
            });
        });
        
        const handTotalCells = table.querySelectorAll('tfoot .hand-total');
        handTotals.forEach((total, index) => {
            handTotalCells[index].textContent = total;
        });
    };

    dateSelect.addEventListener('change', (e) => {
        const dateStr = e.target.value;
        if (dateStr) {
            populateMatchSelect(dateStr);
            resultsFormContainer.style.display = 'none';
        } else {
            matchSelect.innerHTML = '<option value="">Select a match</option>';
            matchSelect.disabled = true;
            resultsFormContainer.style.display = 'none';
        }
    });

    matchSelect.addEventListener('change', (e) => {
        const fixtureId = e.target.value;
        if (fixtureId) {
            const fixture = allFixtures.find(f => f.id === fixtureId);
            const homeTeamName = teamsMap.get(fixture.homeTeamId) || 'Unknown';
            const awayTeamName = teamsMap.get(fixture.awayTeamId) || 'Unknown';
            
            homeTeamNameHeader.textContent = homeTeamName;
            awayTeamNameHeader.textContent = awayTeamName;
            document.getElementById('home-bowled-first').value = fixture.homeTeamId;
            document.getElementById('away-bowled-first').value = fixture.awayTeamId;

            renderScorecard(fixture.homeTeamId, homeTeamScorecard);
            renderScorecard(fixture.awayTeamId, awayTeamScorecard);
            updateTeamTotal(homeTeamScorecard);
            updateTeamTotal(awayTeamScorecard);
            resultsFormContainer.style.display = 'block';
        } else {
            resultsFormContainer.style.display = 'none';
        }
    });

    submitResultsBtn.addEventListener('click', async () => {
        const fixtureId = matchSelect.value;
        const bowledFirst = document.querySelector('input[name="bowled-first"]:checked')?.value;
        
        const getScores = (scorecard) => {
            const scores = [];
            const rows = scorecard.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const playerId = row.querySelector('.player-select').value;
                const hands = Array.from(row.querySelectorAll('.hand-score')).map(input => parseInt(input.value) || 0);
                const score = parseInt(row.querySelector('.total-score-col').textContent);
                if (playerId) {
                    scores.push({ playerId, score, hands });
                }
            });
            return scores;
        };
        
        const homeScores = getScores(homeTeamScorecard);
        const awayScores = getScores(awayTeamScorecard);

        if (homeScores.length !== 6 || awayScores.length !== 6 || !bowledFirst) {
            alert('Please fill in all player scores and select which team bowled first.');
            return;
        }

        const resultsData = {
            homeScore: parseInt(homeTeamTotalDisplay.textContent),
            awayScore: parseInt(awayTeamTotalDisplay.textContent),
            homeScores,
            awayScores,
            bowledFirst,
            status: 'completed'
        };

        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                console.log("Submitting results as user:", currentUser.uid);
            } else {
                console.log("Submitting results but no user is currently signed in according to Firebase Auth.");
            }
            const fixtureRef = doc(db, "match_results", fixtureId);
            await updateDoc(fixtureRef, resultsData);
            alert('Results submitted successfully!');
            await populateDateSelect();
            matchSelect.innerHTML = '<option value="">Select a match</option>';
            matchSelect.disabled = true;
            resultsFormContainer.style.display = 'none';
        } catch (error) {
            console.error("Error submitting results:", error);
            alert('An error occurred while submitting the results.');
        }
    });

    await fetchAllData();
    await populateDateSelect();
}
