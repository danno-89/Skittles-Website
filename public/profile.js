import { authReady } from './auth-manager.js';
import { db, doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, Timestamp } from './firebase.config.js';

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

const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    const date = timestamp.toDate();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
};

const setupTabs = () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabPanes.forEach(pane => {
                if (pane) {
                    pane.id === `${tabName}-content` ? pane.classList.add('active') : pane.classList.remove('active');
                }
            });
        });
    });
};

// --- Statistics Functions ---
async function fetchPlayerStats(playerId, teamId) {
    if (!teamId || !playerId) return { chronologicalScores: [], reversedScores: [] };
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

    // Sort matches by date, OLDEST first.
    allScores.sort((a, b) => a.date.toDate() - b.date.toDate());
    
    // Create a reversed copy for the results table display (newest first)
    const reversedScoresForDisplay = [...allScores].reverse();
    return { chronologicalScores: allScores, reversedScores: reversedScoresForDisplay };
}

const getStreakData = (chronologicalHands, threshold) => {
    // --- Best Streak (chronological) ---
    let bestStreak = 0;
    let currentStreakForBest = 0;
    for (const hand of chronologicalHands) {
        if (hand >= threshold) {
            currentStreakForBest++;
        } else {
            if (currentStreakForBest > bestStreak) {
                bestStreak = currentStreakForBest;
            }
            currentStreakForBest = 0;
        }
    }
    if (currentStreakForBest > bestStreak) { // Check one last time after the loop
        bestStreak = currentStreakForBest;
    }

    // --- Current Streak (reverse chronological) ---
    let currentStreak = 0;
    const reversedHands = [...chronologicalHands].reverse(); // Newest to oldest
    for (const hand of reversedHands) {
        if (hand >= threshold) {
            currentStreak++;
        } else {
            break; // Stop at the first hand that doesn't meet the threshold
        }
    }

    return { bestStreak, currentStreak };
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

    // Create a single, chronological list of all hands
    const allHands = scores.flatMap(s => s.hands);

    // Calculate exact totals
    const sevensTotal = allHands.filter(h => h === 7).length;
    const eightsTotal = allHands.filter(h => h === 8).length;
    const ninesTotal = allHands.filter(h => h === 9).length;

    return {
        fixturesPlayed: scores.length,
        totalPins,
        averageScore: (totalPins / scores.length).toFixed(2),
        leagueAverageScore: leagueAverage,
        highScore,
        totalSpares,
        sevens: { total: sevensTotal, ...getStreakData(allHands, 7) },
        eights: { total: eightsTotal, ...getStreakData(allHands, 8) },
        nines: { total: ninesTotal, ...getStreakData(allHands, 9) }
    };
}

async function renderStatistics(playerId, playerName, teamId, teamName) {
    document.getElementById('stats-player-name').textContent = playerName;
    document.getElementById('stats-team-name').textContent = teamName;
    
    const { chronologicalScores, reversedScores } = await fetchPlayerStats(playerId, teamId);
    const summary = calculateSummaryStats(chronologicalScores);

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
            <div class="stat-content">
                <div class="stat-main">
                    <h4>9s</h4>
                    <div class="stat-total">${summary.nines.total}</div>
                </div>
                <div class="stat-streaks">
                    <h5>Streak</h5>
                    <div class="streaks-data">
                        <p><strong>Current:</strong> <span>${summary.nines.currentStreak}</span></p>
                        <p><strong>Best:</strong> <span>${summary.nines.bestStreak}</span></p>
                    </div>
                </div>
            </div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-content">
                <div class="stat-main">
                    <h4>8s</h4>
                    <div class="stat-total">${summary.eights.total}</div>
                </div>
                <div class="stat-streaks">
                    <h5>Streak</h5>
                    <div class="streaks-data">
                        <p><strong>Current:</strong> <span>${summary.eights.currentStreak}</span></p>
                        <p><strong>Best:</strong> <span>${summary.eights.bestStreak}</span></p>
                    </div>
                </div>
            </div>
        </div>
        <div class="stat-box detailed-stat">
            <div class="stat-content">
                <div class="stat-main">
                    <h4>7s</h4>
                    <div class="stat-total">${summary.sevens.total}</div>
                </div>
                <div class="stat-streaks">
                    <h5>Streak</h5>
                    <div class="streaks-data">
                        <p><strong>Current:</strong> <span>${summary.sevens.currentStreak}</span></p>
                        <p><strong>Best:</strong> <span>${summary.sevens.bestStreak}</span></p>
                    </div>
                </div>
            </div>
        </div>
    `;


    const tableContainer = document.querySelector('.stats-results-table');
    if (reversedScores.length > 0) {
        const teamsMap = new Map();
        const competitionsMap = new Map();
        const teamIds = [...new Set(reversedScores.map(s => s.opponent))];
        const competitionIds = [...new Set(reversedScores.map(s => s.competitionId))];

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
                            <th>Team Rank</th>
                            <th>Match Rank</th>
                            <th>Opponent</th>
                            <th>Competition</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reversedScores.map(s => { // Use reversed scores for display
                            let resultClass = 'draw';
                            if (s.teamScore > s.opponentScore) resultClass = 'win';
                            if (s.teamScore < s.opponentScore) resultClass = 'loss';

                            return `
                                <tr>
                                    <td><span class="result-indicator ${resultClass}"></span></td>
                                    <td>${formatDate(s.date)}</td>
                                    <td>${formatTime(s.date)}</td>
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


// --- Main Profile Display ---
async function displayProfileData(user, publicData, privateData) {
    const populateField = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value || 'N/A';
    };

    let teamNameStr = 'N/A';
    let teamId = null;
    if (publicData) {
        populateField('first-name', publicData.firstName);
        populateField('last-name', publicData.lastName);
        populateField('display-nickname', publicData.nickname || '-');
        populateField('role', publicData.role);
        populateField('registration-date', formatDate(publicData.registerDate));
        populateField('recent-fixture', formatDate(publicData.recentFixture));
        populateField('registration-date-edit', formatDate(publicData.registerDate));
        populateField('recent-fixture-edit', formatDate(publicData.recentFixture));
        populateField('division', publicData.division);

        if (publicData.teamId) {
            teamId = publicData.teamId;
            const teamDocSnap = await getDoc(doc(db, 'teams', teamId));
            if (teamDocSnap.exists()) {
                teamNameStr = teamDocSnap.data().name;
                populateField('team-name', teamNameStr);
            }
        }

        if (publicData.registerExpiry) {
            const expiryDate = publicData.registerExpiry.toDate();
            const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 3600 * 24));
            populateField('register-expiry', formatDate(publicData.registerExpiry));
            populateField('days-to-expiry', daysRemaining > 0 ? daysRemaining : 'Expired');
            populateField('register-expiry-edit', formatDate(publicData.registerExpiry));
            populateField('days-to-expiry-edit', daysRemaining > 0 ? daysRemaining : 'Expired');
        }

        await renderStatistics(publicData.publicId, `${publicData.firstName} ${publicData.lastName}`, teamId, teamNameStr);
    }
    
    if (privateData) {
        populateField('email', privateData.email);
        populateField('dob', formatDate(privateData.dob));
        populateField('mobile-no', privateData.mobileNo);
        populateField('home-no', privateData.homeNo);
        if (privateData.address) {
            populateField('address-line-1', privateData.address.line1);
            populateField('address-line-2', privateData.address.line2);
            populateField('address-line-3', privateData.address.line3);
            populateField('parish', privateData.address.parish);
            populateField('postcode', privateData.address.postCode);
        }
    }
    
    // Set privacy flag display toggles in preferences grid
    if (publicData) {
        const displayMobile = document.getElementById('display-share-mobile-text');
        const displayHome = document.getElementById('display-share-home-text');
        if (displayMobile) displayMobile.textContent = publicData.shareMobileNo ? "Yes" : "No";
        if (displayHome) displayHome.textContent = publicData.shareHomeNo ? "Yes" : "No";
        
        const displayAdvancedStats = document.getElementById('display-share-advanced-stats-text');
        if (displayAdvancedStats) displayAdvancedStats.textContent = publicData.shareAdvancedStats ? "Yes" : "No (Coming Soon)";
    }
    
    // Set private preferences
    if (privateData) {
        const displayConsent = document.getElementById('display-consent-text');
        const displayConsentStats = document.getElementById('display-consent-stats-text');
        const displayConsentRoundups = document.getElementById('display-consent-roundups-text');

        if (displayConsent) displayConsent.textContent = privateData.consent ? "Yes" : "No";
        if (displayConsentStats) displayConsentStats.textContent = privateData.consentStats ? "Yes" : "No (Coming Soon)";
        if (displayConsentRoundups) displayConsentRoundups.textContent = privateData.consentRoundups ? "Yes" : "No (Coming Soon)";
    }
}


async function setupGlobalEditProfile(user, publicData, privateData) {
    const globalEditBtn = document.getElementById('global-edit-btn');
    const globalCancelBtn = document.getElementById('global-cancel-btn');
    const globalSaveBtn = document.getElementById('global-save-btn');
    const globalForm = document.getElementById('global-profile-form');

    const profileDisplay = document.getElementById('profile-info-display');
    const profileEdit = document.getElementById('profile-info-edit');
    const registrationDisplay = document.getElementById('registration-display');
    const registrationEdit = document.getElementById('registration-edit');
    const preferencesDisplay = document.getElementById('preferences-display');
    const preferencesEdit = document.getElementById('preferences-edit');

    if (!globalEditBtn || !globalForm) return;

    globalEditBtn.style.display = 'inline-block';

    const teamSelect = document.getElementById('edit-team');
    const divisionSelect = document.getElementById('edit-division');
    
    // Check if team is editable (July 1st to August 31st)
    const today = new Date();
    const month = today.getMonth(); // 0 is Jan, 6 is July, 7 is Aug
    const isOffSeason = (month === 6 || month === 7);

    if (isOffSeason) {
        teamSelect.disabled = false;
        document.getElementById('team-edit-help').textContent = "You can change your team during the off-season.";
        try {
            const teamsSnapshot = await getDocs(collection(db, 'teams'));
            const teams = [];
            teamsSnapshot.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
            teams.sort((a, b) => a.name.localeCompare(b.name));
            
            teamSelect.innerHTML = '<option value="">Select a team</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                teamSelect.appendChild(option);
            });
        } catch (err) {
            console.error("Failed to load teams", err);
            teamSelect.innerHTML = '<option value="">Error loading teams</option>';
        }
    } else {
        // Just populate the current team
        teamSelect.innerHTML = `<option value="${publicData.teamId || ''}">${document.getElementById('team-name').textContent}</option>`;
    }

    if (!publicData.division || publicData.division === 'Please select') {
        divisionSelect.disabled = false;
        document.getElementById('div-edit-help').textContent = "Please select your division.";
    }

    const setEditMode = (isEdit) => {
        profileDisplay.style.display = isEdit ? 'none' : 'block';
        registrationDisplay.style.display = isEdit ? 'none' : 'block';
        preferencesDisplay.style.display = isEdit ? 'none' : 'block';
        
        profileEdit.style.display = isEdit ? 'block' : 'none';
        registrationEdit.style.display = isEdit ? 'block' : 'none';
        preferencesEdit.style.display = isEdit ? 'block' : 'none';
        
        globalEditBtn.style.display = isEdit ? 'none' : 'inline-block';
        globalCancelBtn.style.display = isEdit ? 'inline-block' : 'none';
        globalSaveBtn.style.display = isEdit ? 'inline-block' : 'none';
    };

    globalEditBtn.addEventListener('click', () => {
        // Populate Public
        document.getElementById('edit-first-name').value = publicData.firstName || '';
        document.getElementById('edit-last-name').value = publicData.lastName || '';
        document.getElementById('edit-nickname').value = publicData.nickname || '';
        teamSelect.value = publicData.teamId || '';
        divisionSelect.value = publicData.division || '';
        document.getElementById('share-mobile-no').checked = !!publicData.shareMobileNo;
        document.getElementById('share-home-no').checked = !!publicData.shareHomeNo;

        // Populate Private
        document.getElementById('edit-email').value = privateData.email || '';
        document.getElementById('edit-mobile-no').value = privateData.mobileNo || '';
        document.getElementById('edit-home-no').value = privateData.homeNo || '';
        document.getElementById('edit-consent').checked = !!privateData.consent;
        document.getElementById('edit-consent-stats').checked = !!privateData.consentStats;
        document.getElementById('edit-consent-roundups').checked = !!privateData.consentRoundups;

        // Toggle phone sharing visibility based on existence of numbers
        const updatePhoneToggleState = (inputId, checkboxId) => {
            const input = document.getElementById(inputId);
            const checkbox = document.getElementById(checkboxId);
            const container = checkbox.closest('.checkbox-group');
            
            if (!input.value.trim()) {
                checkbox.disabled = true;
                checkbox.checked = false;
                if (container) container.style.opacity = '0.5';
            } else {
                checkbox.disabled = false;
                if (container) container.style.opacity = '1';
            }
        };

        const mobileInput = document.getElementById('edit-mobile-no');
        const homeInput = document.getElementById('edit-home-no');

        // Initial check
        updatePhoneToggleState('edit-mobile-no', 'share-mobile-no');
        updatePhoneToggleState('edit-home-no', 'share-home-no');

        // Live updates
        mobileInput.addEventListener('input', () => updatePhoneToggleState('edit-mobile-no', 'share-mobile-no'));
        homeInput.addEventListener('input', () => updatePhoneToggleState('edit-home-no', 'share-home-no'));

        if (privateData.address) {
            document.getElementById('edit-address-line-1').value = privateData.address.line1 || '';
            document.getElementById('edit-address-line-2').value = privateData.address.line2 || '';
            document.getElementById('edit-address-line-3').value = privateData.address.line3 || '';
            document.getElementById('edit-parish').value = privateData.address.parish || '';
            document.getElementById('edit-postcode').value = privateData.address.postCode || '';
        }
        
        if (privateData.dob && privateData.dob.toDate) {
            const d = privateData.dob.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            document.getElementById('edit-dob').value = `${year}-${month}-${day}`;
        }

        setEditMode(true);
    });

    globalCancelBtn.addEventListener('click', () => {
        setEditMode(false);
    });

    globalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('global-save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            // 1. Gather Private Data
            const updatedPrivateData = {
                ...privateData,
                email: document.getElementById('edit-email').value,
                mobileNo: document.getElementById('edit-mobile-no').value,
                homeNo: document.getElementById('edit-home-no').value,
                consent: document.getElementById('edit-consent').checked,
                consentStats: document.getElementById('edit-consent-stats').checked,
                consentRoundups: document.getElementById('edit-consent-roundups').checked,
                address: {
                    line1: document.getElementById('edit-address-line-1').value,
                    line2: document.getElementById('edit-address-line-2').value,
                    line3: document.getElementById('edit-address-line-3').value,
                    parish: document.getElementById('edit-parish').value,
                    postCode: document.getElementById('edit-postcode').value
                }
            };
            const dobVal = document.getElementById('edit-dob').value;
            if (dobVal) {
                const [year, month, day] = dobVal.split('-');
                const dobDate = new Date(year, month - 1, day, 12, 0, 0); 
                updatedPrivateData.dob = Timestamp.fromDate(dobDate);
            }

            // 2. Gather Public Data
            const updatedPublicData = {
                firstName: document.getElementById('edit-first-name').value,
                lastName: document.getElementById('edit-last-name').value,
                nickname: document.getElementById('edit-nickname').value,
                shareMobileNo: document.getElementById('share-mobile-no').checked,
                shareHomeNo: document.getElementById('share-home-no').checked
            };
            if (isOffSeason) {
                const newTeamId = teamSelect.value;
                if (newTeamId) {
                    updatedPublicData.teamId = newTeamId;
                }
            }
            if (!publicData.division || publicData.division === 'Please select') {
                const newDiv = divisionSelect.value;
                if (newDiv) {
                    updatedPublicData.division = newDiv;
                }
            }

            // Sync private values back to public if toggles are checked
            if (updatedPublicData.shareMobileNo && updatedPrivateData.mobileNo) {
                updatedPublicData.mobileNo = updatedPrivateData.mobileNo;
            } else {
                updatedPublicData.mobileNo = null;
            }
            if (updatedPublicData.shareHomeNo && updatedPrivateData.homeNo) {
                updatedPublicData.homeNo = updatedPrivateData.homeNo;
            } else {
                updatedPublicData.homeNo = null; 
            }

            // 3. Save to Firestore
            const privateDocRef = doc(db, 'players_private', publicData.publicId);
            const publicDocRef = doc(db, 'players_public', publicData.publicId);
            
            // Execute parallel updates
            await Promise.all([
                updateDoc(privateDocRef, updatedPrivateData),
                updateDoc(publicDocRef, updatedPublicData)
            ]);

            // 4. Update Local Memory
            Object.assign(privateData, updatedPrivateData);
            Object.assign(publicData, updatedPublicData);
            
            // 5. Re-render display
            const populateField = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value || 'N/A';
            };
            
            populateField('first-name', publicData.firstName);
            populateField('last-name', publicData.lastName);
            populateField('display-nickname', publicData.nickname || '-');
            if (publicData.teamId && isOffSeason) {
                const selectedOption = teamSelect.options[teamSelect.selectedIndex];
                if (selectedOption) populateField('team-name', selectedOption.textContent);
            }
            populateField('division', publicData.division);
            
            // Re-render display booleans
            const displayMobile = document.getElementById('display-share-mobile-text');
            const displayHome = document.getElementById('display-share-home-text');
            if (displayMobile) displayMobile.textContent = publicData.shareMobileNo ? "Yes" : "No";
            if (displayHome) displayHome.textContent = publicData.shareHomeNo ? "Yes" : "No";

            const displayAdvancedStats = document.getElementById('display-share-advanced-stats-text');
            if (displayAdvancedStats) displayAdvancedStats.textContent = publicData.shareAdvancedStats ? "Yes" : "No (Coming Soon)";

            const displayConsent = document.getElementById('display-consent-text');
            const displayConsentStats = document.getElementById('display-consent-stats-text');
            const displayConsentRoundups = document.getElementById('display-consent-roundups-text');
            if (displayConsent) displayConsent.textContent = privateData.consent ? "Yes" : "No";
            if (displayConsentStats) displayConsentStats.textContent = privateData.consentStats ? "Yes" : "No (Coming Soon)";
            if (displayConsentRoundups) displayConsentRoundups.textContent = privateData.consentRoundups ? "Yes" : "No (Coming Soon)";
            
            populateField('email', privateData.email);
            populateField('dob', formatDate(privateData.dob));
            populateField('mobile-no', privateData.mobileNo);
            populateField('home-no', privateData.homeNo);
            if (privateData.address) {
                populateField('address-line-1', privateData.address.line1);
                populateField('address-line-2', privateData.address.line2);
                populateField('address-line-3', privateData.address.line3);
                populateField('parish', privateData.address.parish);
                populateField('postcode', privateData.address.postCode);
            }
            
            document.getElementById('stats-player-name').textContent = `${publicData.firstName} ${publicData.lastName}`;

            setEditMode(false);
            
            // Show brief success alert
            const msgEl = document.getElementById('message');
            msgEl.textContent = 'Profile successfully updated.';
            msgEl.style.display = 'block';
            msgEl.className = 'success-message';
            setTimeout(() => msgEl.style.display = 'none', 3000);

        } catch (error) {
            console.error('Error saving profile data:', error);
            alert('Failed to save details: ' + error.message);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });
}

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    authReady.then(async ({ user, publicData, privateData }) => {
        const profileForm = document.getElementById('profile-form');
        if (!user) {
            profileForm.innerHTML = `<div class="page-header"><h1>My Profile</h1></div><div class="card"><p>Please log in to view your profile.</p><a href="/index" class="btn btn-primary">Log In</a></div>`;
            return;
        }

        if (publicData && privateData) {
            setupTabs();
            await displayProfileData(user, publicData, privateData);
            await setupGlobalEditProfile(user, publicData, privateData);
        } else {
            const content = document.getElementById('personal-details-content');
            content.innerHTML = `<div class="card-no-hover"><h2 class="heading-border">Profile Not Found</h2><div class="profile-details"><p>We could not find a player profile linked to your user account.</p><p>Please contact a committee member if you believe this is an error.</p></div></div>`;
            document.getElementById('statistics-content').innerHTML = '';
        }
    }).catch(error => {
        console.error("Error initializing profile page:", error);
    });
});

