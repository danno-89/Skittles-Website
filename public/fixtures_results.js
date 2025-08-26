import { db, collection, getDocs, query, orderBy, where, limit } from './firebase.config.js';

const competitionCache = new Map();
const teamCache = new Map();
let allFixtures = [];

// --- Helper Functions ---

function formatTeamName(teamName) {
    if (typeof teamName === 'string' && teamName.startsWith('Display[')) {
        const startIndex = teamName.indexOf('[') + 1;
        const endIndex = teamName.indexOf(']');
        if (startIndex > 0 && endIndex > startIndex) {
            const displayText = teamName.substring(startIndex, endIndex);
            return `<strong>${displayText}</strong>`;
        }
    }
    return teamName;
}

function getTeamName(teamIdentifier) {
    if (typeof teamIdentifier === 'string' && teamIdentifier.startsWith('Display[')) {
        return teamIdentifier;
    }
    return teamCache.get(teamIdentifier)?.name || "Unknown Team";
}

function getWeekStartDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// --- Firestore & Data Functions ---

async function populateCompetitionCache() {
    try {
        const snapshot = await getDocs(collection(db, "competitions"));
        snapshot.forEach(doc => {
            competitionCache.set(doc.id, doc.data());
        });
    } catch (error) {
        console.error("Error populating competition cache:", error);
    }
}

async function populateTeamCache() {
    try {
        const snapshot = await getDocs(collection(db, "teams"));
        snapshot.forEach(doc => {
            teamCache.set(doc.id, doc.data());
        });
    } catch (error) {
        console.error("Error populating team cache:", error);
    }
}

async function fetchAllFixtures() {
    try {
        const q = query(collection(db, "match_results"), orderBy("scheduledDate", "asc"));
        const snapshot = await getDocs(q);
        allFixtures = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.scheduledDate && typeof data.scheduledDate.toDate === 'function') {
                data.scheduledDate = data.scheduledDate.toDate();
            } else if (typeof data.scheduledDate === 'string') {
                data.scheduledDate = new Date(data.scheduledDate);
            }
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error("Error fetching all fixtures:", error);
        allFixtures = [];
    }
}

// --- Main Display Logic ---

async function displayMatchResults() {
    const resultsContainer = document.getElementById('results-container');
    const teamFilter = document.getElementById('team-filter').value;
    const competitionFilter = document.getElementById('competition-filter').value;
    const seasonFilter = document.getElementById('season-filter').value;
    const excludePostponed = document.getElementById('exclude-postponed-filter').checked;
    const onlyPostponed = document.getElementById('only-postponed-filter').checked;
    const onlySpare = document.getElementById('only-spare-filter').checked;

    if (!resultsContainer) return;
    resultsContainer.innerHTML = '<p>Loading fixtures...</p>';

    const filteredFixtures = allFixtures.filter(match => {
        const awayTeamId = match.awayTeamId || match.awayTeamis;
        const teamMatch = !teamFilter || match.homeTeamId === teamFilter || awayTeamId === teamFilter;
        const competitionMatch = !competitionFilter || match.division === competitionFilter;
        const seasonMatch = !seasonFilter || match.season === seasonFilter;
        
        let statusMatch = true;
        if (onlySpare) {
            statusMatch = match.status === 'spare';
        } else {
            statusMatch = (!excludePostponed || match.status !== 'postponed') && (!onlyPostponed || match.status === 'postponed');
        }

        return teamMatch && competitionMatch && seasonMatch && statusMatch;
    });

    if (filteredFixtures.length === 0) {
        resultsContainer.innerHTML = '<p>No fixtures found matching your criteria.</p>';
        return;
    }
    
    const groupedFixtures = filteredFixtures.reduce((groups, match) => {
        const matchDate = match.scheduledDate;
        const weekStartDate = getWeekStartDate(matchDate);
        const weekKey = weekStartDate.toISOString().split('T')[0];

        if (!groups[weekKey]) {
            groups[weekKey] = { startDate: weekStartDate, matches: [] };
        }
        groups[weekKey].matches.push(match);
        return groups;
    }, {});

    let tableBodyHTML = '';
    const sortedWeekKeys = Object.keys(groupedFixtures).sort();

    for (const weekKey of sortedWeekKeys) {
        const group = groupedFixtures[weekKey];
        group.matches.sort((a, b) => a.scheduledDate - b.scheduledDate);

        const weekStartDateFormatted = group.startDate.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
        
        const containsRound = group.matches.some(match => match.round);
        const headerClass = containsRound ? 'week-header is-cup-week' : 'week-header';

        tableBodyHTML += `<tr class="${headerClass}" data-week-key="${weekKey}"><td colspan="8"><span class="arrow">▼</span> Week Commencing: ${weekStartDateFormatted}</td></tr>`;

        let lastRenderedDate = null;
        for (const match of group.matches) {
            const dateObj = match.scheduledDate;
            const date = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
            const time = dateObj.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });
            const dateCell = (date === lastRenderedDate) ? '' : date;
            if (date !== lastRenderedDate) lastRenderedDate = date;

            if (match.status === 'spare') {
                tableBodyHTML += `<tr class="week-row week-${weekKey} status-spare">
                                    <td>${dateCell}</td>
                                    <td>${time}</td>
                                    <td colspan="6">Spare slot for Postponed Fixtures</td>
                                  </tr>`;
            } else {
                const awayTeamIdentifier = match.awayTeamId || match.awayTeamis;
                const homeTeamName = formatTeamName(getTeamName(match.homeTeamId));
                const awayTeamName = formatTeamName(getTeamName(awayTeamIdentifier));
                const hasResult = match.homeScore != null && match.awayScore != null;
                const score = hasResult ? `${match.homeScore} - ${match.awayScore}` : '-';
                const divisionName = competitionCache.get(match.division)?.name || 'N/A';
                const round = match.round || '';
                let statusCell = hasResult ? `<a href="match_details.html?matchId=${match.id}" class="btn-details">Details</a>` : (match.status === 'postponed' ? `<span class="status-postponed">postponed</span>` : '');
                tableBodyHTML += `<tr class="week-row week-${weekKey}"><td>${dateCell}</td><td>${time}</td><td>${homeTeamName}</td><td>${awayTeamName}</td><td class="score">${score}</td><td class="status-cell">${statusCell}</td><td>${divisionName}</td><td>${round}</td></tr>`;
            }
        }
    }

    resultsContainer.innerHTML = `<table class="results-table"><thead class="sticky-header"><tr><th>Date</th><th>Time</th><th>Home Team</th><th>Away Team</th><th class="centered-header">Score</th><th class="centered-header">Status</th><th>Competition</th><th>Round</th></tr></thead><tbody>${tableBodyHTML}</tbody></table>`;
}

// --- Filter Logic ---

function handleFilterChange() {
    const seasonFilter = document.getElementById('season-filter').value;
    const teamFilter = document.getElementById('team-filter').value;
    const competitionFilter = document.getElementById('competition-filter').value;

    const fixturesInSeason = allFixtures.filter(match => match.season === seasonFilter);

    // Update competitions based on selected team
    let relevantFixturesForComp = fixturesInSeason;
    if (teamFilter) {
        relevantFixturesForComp = fixturesInSeason.filter(match => match.homeTeamId === teamFilter || (match.awayTeamId || match.awayTeamis) === teamFilter);
    }
    const availableCompetitions = [...new Set(relevantFixturesForComp.map(match => match.division))];
    populateCompetitionDropdown(availableCompetitions);

    // Update teams based on selected competition
    let relevantFixturesForTeam = fixturesInSeason;
    if (competitionFilter) {
        relevantFixturesForTeam = fixturesInSeason.filter(match => match.division === competitionFilter);
    }
    const availableTeams = new Set();
    relevantFixturesForTeam.forEach(match => {
        if (teamCache.has(match.homeTeamId)) availableTeams.add(match.homeTeamId);
        const awayTeamId = match.awayTeamId || match.awayTeamis;
        if (teamCache.has(awayTeamId)) availableTeams.add(awayTeamId);
    });
    populateTeamDropdown([...availableTeams]);
    
    // Re-apply original selections if they are still valid
    if ([...document.getElementById('competition-filter').options].some(opt => opt.value === competitionFilter)) {
        document.getElementById('competition-filter').value = competitionFilter;
    }
    if ([...document.getElementById('team-filter').options].some(opt => opt.value === teamFilter)) {
        document.getElementById('team-filter').value = teamFilter;
    }
    
    displayMatchResults();
}


function populateCompetitionDropdown(competitionIds) {
    const competitionFilterSelect = document.getElementById('competition-filter');
    const currentValue = competitionFilterSelect.value;
    competitionFilterSelect.innerHTML = '<option value="">All Competitions</option>';
    
    competitionIds.forEach(id => {
        const competition = competitionCache.get(id);
        if (competition && competition.fixtures === true) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = competition.name;
            competitionFilterSelect.appendChild(option);
        }
    });
    competitionFilterSelect.value = currentValue;
}

function populateTeamDropdown(teamIds) {
    const teamFilterSelect = document.getElementById('team-filter');
    const currentValue = teamFilterSelect.value;
    teamFilterSelect.innerHTML = '<option value="">All Teams</option>';

    const sortedTeams = teamIds
        .map(id => ({ id, name: teamCache.get(id)?.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sortedTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamFilterSelect.appendChild(option);
    });
    teamFilterSelect.value = currentValue;
}


async function populateSeasonFilter() {
    const seasonFilterSelect = document.getElementById('season-filter');
    let currentSeason = null;
    try {
        const q = query(collection(db, "seasons"), where("status", "==", "current"), limit(1));
        const seasonsSnapshot = await getDocs(q);
        if (!seasonsSnapshot.empty) {
            currentSeason = seasonsSnapshot.docs[0].id;
        }
    } catch (error) {
        console.error("Error fetching current season:", error);
    }

    const uniqueSeasons = [...new Set(allFixtures.map(fixture => fixture.season).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    seasonFilterSelect.innerHTML = '';
    if (!currentSeason && uniqueSeasons.length > 0) {
        currentSeason = uniqueSeasons[0]; 
    }

    uniqueSeasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = season;
        if (season === currentSeason) {
            option.selected = true;
        }
        seasonFilterSelect.appendChild(option);
    });
}


// --- Event Listeners & Initialization ---

function setupEventListeners() {
    document.getElementById('season-filter')?.addEventListener('change', handleFilterChange);
    document.getElementById('team-filter')?.addEventListener('change', handleFilterChange);
    document.getElementById('competition-filter')?.addEventListener('change', handleFilterChange);
    
    const excludePostponed = document.getElementById('exclude-postponed-filter');
    const onlyPostponed = document.getElementById('only-postponed-filter');
    const onlySpare = document.getElementById('only-spare-filter');

    excludePostponed?.addEventListener('change', () => {
        if (excludePostponed.checked) {
            onlyPostponed.checked = false;
            onlySpare.checked = false;
        }
        displayMatchResults();
    });

    onlyPostponed?.addEventListener('change', () => {
        if (onlyPostponed.checked) {
            excludePostponed.checked = false;
            onlySpare.checked = false;
        }
        displayMatchResults();
    });

    onlySpare?.addEventListener('change', () => {
        if (onlySpare.checked) {
            excludePostponed.checked = false;
            onlyPostponed.checked = false;
        }
        displayMatchResults();
    });
    
    document.getElementById('results-container').addEventListener('click', function(event) {
        const headerRow = event.target.closest('.week-header, .is-cup-week');
        if (headerRow) {
            const weekKey = headerRow.dataset.weekKey;
            const rows = document.querySelectorAll(`.week-row.week-${weekKey}`);
            const arrow = headerRow.querySelector('.arrow');
            let isVisible = false;
            rows.forEach(row => {
                const currentDisplay = window.getComputedStyle(row).display;
                if (currentDisplay !== 'none') isVisible = true;
                row.style.display = currentDisplay === 'none' ? '' : 'none';
            });
            if (arrow) arrow.textContent = isVisible ? '►' : '▼';
        }
    });

    const toggleBtn = document.getElementById('toggle-all-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = toggleBtn.textContent === 'Expand All';
            document.querySelectorAll('.week-row').forEach(row => row.style.display = isCollapsed ? '' : 'none');
            document.querySelectorAll('.arrow').forEach(arrow => arrow.textContent = isCollapsed ? '▼' : '►');
            toggleBtn.textContent = isCollapsed ? 'Collapse All' : 'Expand All';
        });
    }
}

async function initializePage() {
    await Promise.all([populateCompetitionCache(), populateTeamCache()]);
    await fetchAllFixtures();
    await populateSeasonFilter();
    handleFilterChange();
    setupEventListeners();
}

initializePage();
