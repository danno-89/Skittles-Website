import { firebaseConfig } from './firebase.config.js';

try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

const resultsContainer = document.getElementById('results-container');
const teamFilter = document.getElementById('team-filter');
const excludePostponedFilter = document.getElementById('exclude-postponed-filter');
const onlyPostponedFilter = document.getElementById('only-postponed-filter');

if (resultsContainer && teamFilter && excludePostponedFilter && onlyPostponedFilter) {

    let allFixtures = [];
    const teamCache = new Map();
    const competitionCache = new Map();

    // --- Corrected Helper Functions ---
    const fetchTeamName = async (teamId) => {
        if (!teamId) return 'N/A';
        if (teamCache.has(teamId)) return teamCache.get(teamId);
        try {
            const teamDoc = await db.collection('teams').doc(teamId).get();
            const name = teamDoc.exists ? teamDoc.data().name : 'Unknown Team';
            teamCache.set(teamId, name);
            return name;
        } catch (e) { return 'N/A'; }
    };

    const fetchCompetitionName = async (compId) => {
        if (!compId) return '';
        if (competitionCache.has(compId)) return competitionCache.get(compId);
        try {
            const compDoc = await db.collection('competitions').doc(compId).get();
            const name = compDoc.exists ? compDoc.data().name : compId;
            competitionCache.set(compId, name);
            return name;
        } catch (e) { return compId; }
    };

    const fetchAndProcessData = async () => {
        try {
            const [fixturesSnapshot, teamsSnapshot] = await Promise.all([
                db.collection("match_results").where("season", "==", "2024-25").orderBy("scheduledDate", "desc").get(),
                db.collection("teams").get()
            ]);

            teamsSnapshot.forEach(doc => teamCache.set(doc.id, doc.data().name || 'Unknown Team'));
            populateTeamFilter(Array.from(teamCache.values()).sort());

            allFixtures = await Promise.all(fixturesSnapshot.docs.map(async doc => {
                const result = doc.data();
                const divisionName = await fetchCompetitionName(result.division);
                return { ...result, divisionName };
            }));

            renderFixtures();
        } catch (error) {
            console.error("Error fetching initial data:", error);
            resultsContainer.innerHTML = '<p>Error loading initial fixture data.</p>';
        }
    };

    const populateTeamFilter = (teamNames) => {
        teamNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            teamFilter.appendChild(option);
        });
    };

    const renderFixtures = async () => {
        let filteredFixtures = [...allFixtures];
        const selectedTeam = teamFilter.value;

        if (selectedTeam) {
            filteredFixtures = filteredFixtures.filter(f => f.homeTeamId === selectedTeam || f.awayTeamId === selectedTeam);
        }
        if (excludePostponedFilter.checked) {
            filteredFixtures = filteredFixtures.filter(f => !f.postponedDate);
        }
        if (onlyPostponedFilter.checked) {
            filteredFixtures = filteredFixtures.filter(f => f.postponedDate);
        }
        
        resultsContainer.innerHTML = '';
        if (filteredFixtures.length === 0) {
            resultsContainer.innerHTML = '<p>No match results found for the selected filters.</p>';
            return;
        }

        const groupedResults = {};
        filteredFixtures.forEach(result => {
            const dateKey = new Date(result.scheduledDate).toLocaleDateString('en-CA');
            if (!groupedResults[dateKey]) groupedResults[dateKey] = [];
            groupedResults[dateKey].push(result);
        });

        const sortedDateKeys = Object.keys(groupedResults).sort((a, b) => new Date(b) - new Date(a));

        for (const dateKey of sortedDateKeys) {
            const dateHeading = document.createElement('h2');
            dateHeading.className = 'date-group-heading';
            const date = new Date(dateKey);
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
            dateHeading.textContent = date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            resultsContainer.appendChild(dateHeading);

            for (const result of groupedResults[dateKey]) {
                const [homeTeam, awayTeam] = await Promise.all([
                    fetchTeamName(result.homeTeamId),
                    fetchTeamName(result.awayTeamId)
                ]);

                let timeOrStatus = new Date(result.scheduledDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
                let homeTeamClass = 'team-name home-team';
                let awayTeamClass = 'team-name away-team';
                
                if (result.postponedDate && result.postponedTeamId) {
                    timeOrStatus = `<span class="status-postponed">Postponed</span>`;
                    if (result.postponedTeamId === result.homeTeamId) homeTeamClass += ' postponed-team';
                    if (result.postponedTeamId === result.awayTeamId) awayTeamClass += ' postponed-team';
                }

                const resultCard = document.createElement('div');
                resultCard.className = 'result-card';
                resultCard.innerHTML = `
                    <span class="result-time">${timeOrStatus}</span>
                    <span class="${homeTeamClass}">${homeTeam}</span>
                    <span class="score">${result.homeScore ?? 'v'} - ${result.awayScore ?? ''}</span>
                    <span class="${awayTeamClass}">${awayTeam}</span>
                    <span class="result-division">${result.divisionName}</span>
                `;
                resultsContainer.appendChild(resultCard);
            }
        }
    };

    teamFilter.addEventListener('change', () => {
        // Find the team ID from the selected team name to filter correctly
        const selectedTeamName = teamFilter.value;
        let teamId = '';
        for (const [id, name] of teamCache.entries()) {
            if (name === selectedTeamName) {
                teamId = id;
                break;
            }
        }
        
        let filteredFixtures = [...allFixtures];
        if (teamId) {
             filteredFixtures = allFixtures.filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId);
        }

        // Re-render with the correct subset of fixtures
        renderFixtures(filteredFixtures, true);
    });

    excludePostponedFilter.addEventListener('change', () => {
        if (excludePostponedFilter.checked) onlyPostponedFilter.checked = false;
        renderFixtures();
    });
    onlyPostponedFilter.addEventListener('change', () => {
        if (onlyPostponedFilter.checked) excludePostponedFilter.checked = false;
        renderFixtures();
    });

    fetchAndProcessData();
}
