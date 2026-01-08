
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './firebase.config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput.toDate) return dateInput.toDate(); // Handle Firestore Timestamps
    if (dateInput instanceof Date) return dateInput;
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;
        return d;
    } catch (e) {
        return null;
    }
};

const populateCompetitionDropdown = async () => {
    const competitionDropdown = document.getElementById('competition');
    competitionDropdown.innerHTML = '<option value="" disabled selected>Loading competitions...</option>';

    try {
        const now = new Date();
        const eventsQuery = query(
            collection(db, 'events'),
            where('season', '==', '2025-26'),
            where('registrationClosed', '>', now),
            where('registration', '==', true)
        );
        const eventsSnapshot = await getDocs(eventsQuery);

        const options = [];
        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            options.push({ id: doc.id, name: event.name });
        });

        options.sort((a, b) => a.name.localeCompare(b.name));

        competitionDropdown.innerHTML = '<option value="" disabled selected>Select a competition...</option>';
        options.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp.id;
            option.textContent = comp.name;
            competitionDropdown.appendChild(option);
        });

    } catch (error) {
        console.error('Error populating competitions:', error);
        competitionDropdown.innerHTML = '<option value="" disabled selected>Failed to load competitions</option>';
    }
};

// Function to fetch and display the competition date
const displayCompetitionDate = async (competitionId) => {
    const dateDisplay = document.getElementById('competition-date-display');
    const competitionDropdown = document.getElementById('competition');

    if (!competitionId) {
        dateDisplay.classList.add('hidden');
        return;
    }

    let competitionName = competitionDropdown.options[competitionDropdown.selectedIndex].text;

    try {
        const seasonQuery = await getDocs(query(collection(db, "seasons"), where("status", "==", "current"), limit(1)));
        if (seasonQuery.empty) {
            dateDisplay.classList.add('hidden');
            return;
        }
        const seasonName = seasonQuery.docs[0].data().name;

        const eventsQuery = await getDocs(query(collection(db, "events"), where("season", "==", seasonName), where("name", "==", competitionName), limit(1)));

        if (!eventsQuery.empty) {
            const eventData = eventsQuery.docs[0].data();
            const competitionDate = eventData.date ? parseDate(eventData.date) : null;

            if (competitionDate) {
                const formattedDate = competitionDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                dateDisplay.innerHTML = `Date: ${formattedDate} at 7:30pm`;
                dateDisplay.classList.remove('hidden');
            } else {
                dateDisplay.classList.add('hidden');
            }
        } else {
            dateDisplay.classList.add('hidden');
        }

    } catch (error) {
        console.error("Error fetching competition date:", error);
        dateDisplay.classList.add('hidden');
    }
};


// Function to update the team dropdowns with advanced filtering
const updateAvailableTeams = async (competitionId) => {
    const player1TeamDropdown = document.getElementById('player1-team');
    const player2TeamDropdown = document.getElementById('player2-team');
    const competitionDropdown = document.getElementById('competition');
    const selectedOption = competitionDropdown.options[competitionDropdown.selectedIndex];
    const competitionName = selectedOption ? selectedOption.text.toLowerCase() : '';

    player1TeamDropdown.innerHTML = '';
    player2TeamDropdown.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a team...';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    player1TeamDropdown.appendChild(defaultOption.cloneNode(true));
    player2TeamDropdown.appendChild(defaultOption.cloneNode(true));

    const noTeamOption = document.createElement('option');
    noTeamOption.value = 'no-team';
    noTeamOption.textContent = 'No Team';
    player1TeamDropdown.appendChild(noTeamOption.cloneNode(true));
    player2TeamDropdown.appendChild(noTeamOption.cloneNode(true));

    try {
        const playersSnapshot = await getDocs(collection(db, 'players_public'));
        const teamsWithEligiblePlayers = {}; // teamId -> { hasMale, hasFemale }

        playersSnapshot.forEach(playerDoc => {
            const playerData = playerDoc.data();
            if (!playerData.teamId) return;
            if (!teamsWithEligiblePlayers[playerData.teamId]) {
                teamsWithEligiblePlayers[playerData.teamId] = { hasMale: false, hasFemale: false };
            }
            if (playerData.division === "Men's") {
                teamsWithEligiblePlayers[playerData.teamId].hasMale = true;
            }
            if (playerData.division === "Ladies'") {
                teamsWithEligiblePlayers[playerData.teamId].hasFemale = true;
            }
        });

        const teamsQuery = query(collection(db, 'teams'), where('status', '==', 'active'));
        const teamsSnapshot = await getDocs(teamsQuery);

        teamsSnapshot.forEach(teamDoc => {
            const teamId = teamDoc.id;
            const teamData = teamDoc.data();
            const eligibility = teamsWithEligiblePlayers[teamId] || { hasMale: false, hasFemale: false };
            
            let isEligible = false;
            if (competitionName.includes('mixed')) {
                isEligible = eligibility.hasMale && eligibility.hasFemale;
            } else if (competitionName.includes('ladies')) {
                isEligible = eligibility.hasFemale;
            } else if (competitionName.includes("men's")) {
                isEligible = eligibility.hasMale;
            } else { // For other competitions, all active teams are eligible
                isEligible = true;
            }

            if (isEligible) {
                const option = document.createElement('option');
                option.value = teamData.name;
                option.textContent = teamData.name;
                player1TeamDropdown.appendChild(option.cloneNode(true));
                player2TeamDropdown.appendChild(option.cloneNode(true));
            }
        });

        // Set the dropdowns to the placeholder
        player1TeamDropdown.value = '';
        player2TeamDropdown.value = '';

    } catch (error) {
        console.error('Error updating available teams:', error);
    }
};

// Function to create a player name dropdown with a forced division parameter
const createPlayerDropdown = async (teamName, wrapperElementId, competitionId, forcedDivision = null, isRequired = true) => {
    const wrapper = document.getElementById(wrapperElementId);
    wrapper.innerHTML = ''; // Clear previous input

    const inputId = wrapperElementId.replace('-wrapper', '');

    if (teamName === 'no-team' || !teamName) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = inputId;
        input.name = inputId;
        input.className = 'form-input';
        input.placeholder = 'Enter player name';
        if (isRequired) {
            input.required = true;
        }
        wrapper.appendChild(input);
        return;
    }

    try {
        const teamsQuery = query(collection(db, 'teams'), where('name', '==', teamName), limit(1));
        const teamsSnapshot = await getDocs(teamsQuery);
        if (teamsSnapshot.empty) return;
        const teamId = teamsSnapshot.docs[0].id;

        const playersQuery = query(collection(db, 'players_public'), where('teamId', '==', teamId));
        const playersSnapshot = await getDocs(playersQuery);

        const eligiblePlayers = [];

        playersSnapshot.forEach(playerDoc => {
            const playerData = playerDoc.data();
            const fullName = `${playerData.firstName} ${playerData.lastName}`;
            const player = { id: playerDoc.id, name: fullName };

            if (forcedDivision) {
                if (playerData.division === forcedDivision) {
                    eligiblePlayers.push(player);
                }
            } else {
                 eligiblePlayers.push(player); // No division enforcement for other competitions
            }
        });

        eligiblePlayers.sort((a, b) => a.name.localeCompare(b.name));

        const select = document.createElement('select');
        select.id = inputId;
        select.name = inputId;
        select.className = 'form-select';
        if (isRequired) {
            select.required = true;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a player...';
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        eligiblePlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            select.appendChild(option);
        });

        wrapper.appendChild(select);

    } catch (error) {
        console.error('Error creating player dropdown:', error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    populateCompetitionDropdown();
    const registrationForm = document.getElementById('registration-form');
    const competitionDropdown = document.getElementById('competition');
    const player1Label = document.getElementById('player1-label');
    const player2Label = document.getElementById('player2-label');
    const player1TeamDropdown = document.getElementById('player1-team');
    const player2TeamDropdown = document.getElementById('player2-team');
    const player2Section = document.getElementById('player2-label').nextElementSibling;
    const contactInfoSection = document.getElementById('contact-info-section');

    const handleCompetitionChange = () => {
        const competitionId = competitionDropdown.value;
        const selectedOption = competitionDropdown.options[competitionDropdown.selectedIndex];
        const competitionName = selectedOption ? selectedOption.text.toLowerCase() : '';
        const isIndividual = competitionName.includes('singles') || competitionName.includes('individual');

        displayCompetitionDate(competitionId); // Fetch and display the date
        updateAvailableTeams(competitionId);

        // Player 1 is always required
        createPlayerDropdown(null, 'player1-name-wrapper', competitionId, null, true);

        // Player 2 is only required for non-individual competitions
        createPlayerDropdown(null, 'player2-name-wrapper', competitionId, null, !isIndividual);


        if (isIndividual) {
            player2Section.classList.add('hidden');
            player2Label.classList.add('hidden');
            player2TeamDropdown.required = false;
        } else {
            player2Section.classList.remove('hidden');
            player2Label.classList.remove('hidden');
            player2TeamDropdown.required = true;
        }

        if (competitionName.includes('mixed')) {
            player1Label.textContent = 'Male Player';
            player2Label.textContent = 'Female Player';
        } else {
            player1Label.textContent = 'Player 1';
            player2Label.textContent = 'Player 2';
        }
    };

    competitionDropdown.addEventListener('change', handleCompetitionChange);

    player1TeamDropdown.addEventListener('change', () => {
        const competitionId = competitionDropdown.value;
        const selectedOption = competitionDropdown.options[competitionDropdown.selectedIndex];
        const competitionName = selectedOption ? selectedOption.text.toLowerCase() : '';
        let forcedDivision = null;
        if (competitionName.includes('mixed')) {
            forcedDivision = "Men's";
        } else if (competitionName.includes('ladies')) {
            forcedDivision = "Ladies'";
        } else if (competitionName.includes("men's")) {
            forcedDivision = "Men's";
        }
        createPlayerDropdown(player1TeamDropdown.value, 'player1-name-wrapper', competitionId, forcedDivision, true);
    });

    player2TeamDropdown.addEventListener('change', () => {
        const competitionId = competitionDropdown.value;
        const selectedOption = competitionDropdown.options[competitionDropdown.selectedIndex];
        const competitionName = selectedOption ? selectedOption.text.toLowerCase() : '';
        const isIndividual = competitionName.includes('singles') || competitionName.includes('individual');

        let forcedDivision = null;
        if (competitionName.includes('mixed')) {
            forcedDivision = "Ladies'";
        } else if (competitionName.includes('ladies')) {
            forcedDivision = "Ladies'";
        } else if (competitionName.includes("men's")) {
            forcedDivision = "Men's";
        }
        createPlayerDropdown(player2TeamDropdown.value, 'player2-name-wrapper', competitionId, forcedDivision, !isIndividual);
    });
    
    const toggleContactInfo = () => {
        if (player1TeamDropdown.value === 'no-team' && player2TeamDropdown.value === 'no-team') {
            contactInfoSection.classList.remove('hidden');
        } else {
            contactInfoSection.classList.add('hidden');
        }
    };

    player1TeamDropdown.addEventListener('change', toggleContactInfo);
    player2TeamDropdown.addEventListener('change', toggleContactInfo);

    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const competition = competitionDropdown.value;
            const selectedOption = competitionDropdown.options[competitionDropdown.selectedIndex];
            const competitionName = selectedOption ? selectedOption.text.toLowerCase() : '';
            const isIndividual = competitionName.includes('singles') || competitionName.includes('individual');

            const player1Team = player1TeamDropdown.value;
            const player2Team = player2TeamDropdown.value;
            const contactNumber = document.getElementById('contact-number').value;

            let player1Name, player1PublicId, player2Name, player2PublicId;

            if (player1Team === 'no-team') {
                player1Name = document.getElementById('player1-name').value;
                player1PublicId = null;
            } else {
                const player1Select = document.getElementById('player1-name');
                player1PublicId = player1Select.value;
                player1Name = player1Select.options[player1Select.selectedIndex].text;
            }

            if (!isIndividual) {
                if (player2Team === 'no-team') {
                    player2Name = document.getElementById('player2-name').value;
                    player2PublicId = null;
                } else {
                    const player2Select = document.getElementById('player2-name');
                    player2PublicId = player2Select.value;
                    player2Name = player2Select.options[player2Select.selectedIndex].text;
                }
            }

            if (!player1Name || (!player2Name && !isIndividual) || !player1Team || (!player2Team && !isIndividual)) {
                alert('All player and team fields are required.');
                return;
            }

            if (player1Team === 'no-team' && (player2Team === 'no-team' || isIndividual) && !contactNumber) {
                alert('A contact number is required as neither player is registered to a team.');
                return;
            }

            const registrationData = {
                player1Name,
                player1Team: player1Team === 'no-team' ? '' : player1Team,
                player1PublicId,
                timestamp: new Date()
            };

            if (!isIndividual) {
                registrationData.player2Name = player2Name;
                registrationData.player2Team = player2Team === 'no-team' ? '' : player2Team;
                registrationData.player2PublicId = player2PublicId;
            }
            
            if (contactNumber) {
                registrationData.contactNumber = contactNumber;
            }

            try {
                const docRef = doc(db, 'competition-registrations', competition);
                const docSnap = await getDoc(docRef);
                const existingEntries = docSnap.exists() ? docSnap.data().entries : [];
                await setDoc(docRef, { entries: [...existingEntries, registrationData] });

                alert('Registration successful!');
                window.location.href = `other_competitions.html?tab=${competition}`;
            } catch (error) {
                console.error('Error adding document: ', error);
                alert('There was an error with your registration. Please try again.');
            }
        });
    }
    
    // Initial setup
    handleCompetitionChange();
});
