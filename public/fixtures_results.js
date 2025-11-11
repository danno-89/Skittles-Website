import { db, collection, getDocs, query, orderBy, where, limit } from './firebase.config.js';

const competitionCache = new Map();
const teamCache = new Map();
let allFixtures = [];
let activeTab = 'fixtures';

// --- Helper Functions ---

function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date(date);
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}

function getTeamName(teamIdentifier) {
    if (typeof teamIdentifier === 'string' && teamIdentifier.startsWith('Display[')) {
        const startIndex = teamIdentifier.indexOf('[') + 1;
        const endIndex = teamIdentifier.indexOf(']');
        return `<strong>${teamIdentifier.substring(startIndex, endIndex)}</strong>`;
    }
    return teamCache.get(teamIdentifier)?.name || "Unknown Team";
}

function getWeekStartDate(date) {
    if (!date || !(date instanceof Date)) {
        return new Date();
    }
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
        snapshot.forEach(doc => competitionCache.set(doc.id, doc.data()));
    } catch (error) {
        console.error("Error populating competition cache:", error);
    }
}

async function populateTeamCache() {
    try {
        const snapshot = await getDocs(collection(db, "teams"));
        snapshot.forEach(doc => teamCache.set(doc.id, doc.data()));
    } catch (error) {
        console.error("Error populating team cache:", error);
    }
}

async function fetchAllFixtures(season) {
    try {
        const q = query(collection(db, "match_results"), where("season", "==", season), orderBy("scheduledDate", "asc"));
        const snapshot = await getDocs(q);
        allFixtures = snapshot.docs.map(doc => {
            const data = doc.data();
            data.scheduledDate = data.scheduledDate?.toDate();
            return { id: doc.id, ...data };
        });
    } catch (error) {
        console.error("Error fetching fixtures for season:", error);
        allFixtures = [];
    }
}

// --- Spare Slot Generation ---

function generateSpareSlots(fixtures) {
    const spareSlots = [];
    const fixturesByDate = new Map();

    fixtures.forEach(fixture => {
        if (fixture.status !== 'spare' && fixture.scheduledDate) {
            const dateStr = fixture.scheduledDate.toISOString().split('T')[0];
            if (!fixturesByDate.has(dateStr)) {
                fixturesByDate.set(dateStr, []);
            }
            fixturesByDate.get(dateStr).push(fixture);
        }
    });

    const standardTimes = ['19:00', '20:00', '21:00'];

    fixturesByDate.forEach((dayFixtures, dateStr) => {
        const scheduledTimes = new Set(dayFixtures.map(f => {
            return f.scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).substring(0, 5);
        }));
    
        standardTimes.forEach(time => {
            if (!scheduledTimes.has(time)) {
                const [hour, minute] = time.split(':');
                const [year, month, day] = dateStr.split('-').map(Number);
                const spareDate = new Date(Date.UTC(year, month - 1, day, parseInt(hour, 10), parseInt(minute, 10)));
    
                if (spareDate > new Date()) { 
                    spareSlots.push({
                        id: `spare-${dateStr}-${time}`,
                        scheduledDate: spareDate,
                        status: 'spare'
                    });
                }
            }
        });
    });
    
    return spareSlots;
}

// --- Main Display Logic ---

function renderFixturesTable(fixtures, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (fixtures.length === 0) {
        container.innerHTML = '<p>No matches found for this category.</p>';
        return;
    }

    const isFixturesTab = activeTab === 'fixtures';
    const isResultsTab = activeTab === 'results';
    const isPostponedTab = activeTab === 'postponed';

    const groupedFixtures = fixtures.reduce((groups, match) => {
        if (!match.scheduledDate) return groups;
        const weekStartDate = getWeekStartDate(match.scheduledDate);
        const weekKey = weekStartDate.toISOString().split('T')[0];
        if (!groups[weekKey]) {
            groups[weekKey] = { startDate: weekStartDate, matches: [] };
        }
        groups[weekKey].matches.push(match);
        return groups;
    }, {});

    let html = '';
    const sortedWeekKeys = Object.keys(groupedFixtures).sort();

    if (isResultsTab) {
        sortedWeekKeys.reverse();
    }

    for (const weekKey of sortedWeekKeys) {
        const group = groupedFixtures[weekKey];
        group.matches.sort((a, b) => a.scheduledDate - b.scheduledDate);
        const weekStartDateFormatted = formatDate(group.startDate);

        const relevantMatches = group.matches.filter(m => m.status !== 'rescheduled' && m.status !== 'spare');
        const isCupWeek = relevantMatches.length > 0 && relevantMatches.every(match => {
            const competitionName = competitionCache.get(match.division)?.name || '';
            return competitionName !== 'Premier Division' && competitionName !== 'First Division';
        });
        const headerClass = isCupWeek ? 'week-header cup-week-header' : 'week-header';

        let tableHeader;
        if (isFixturesTab) {
            tableHeader = `
                <thead class="sticky-header">
                    <tr>
                        <th class="date-col">Date</th>
                        <th class="time-col">Time</th>
                        <th class="home-team-col">Home Team</th>
                        <th class="away-team-col">Away Team</th>
                        <th class="competition-col">Competition</th>
                        <th class="round-col">Round</th>
                        <th class="status-cell">Status</th>
                    </tr>
                </thead>`;
        } else {
            tableHeader = `
                <thead class="sticky-header">
                    <tr>
                        <th class="date-col">Date</th>
                        <th class="time-col">Time</th>
                        <th class="home-team-col">Home Team</th>
                        <th class="away-team-col">Away Team</th>
                        ${!isPostponedTab ? '<th class="score">Score</th>' : ''}
                        ${!isPostponedTab ? `<th class="status-cell">${isResultsTab ? '' : 'Status'}</th>` : ''}
                        <th class="competition-col">Competition</th>
                        <th class="round-col">Round</th>
                        ${isPostponedTab ? '<th class="postponed-by-col">Postponed by</th>' : ''}
                    </tr>
                </thead>`;
        }

        let tableBody = '<tbody>';
        let lastRenderedDate = null;

        for (const match of group.matches) {
            const dateObj = match.scheduledDate;
            const date = formatDate(dateObj);
            const time = dateObj.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });
            const dateCell = (date === lastRenderedDate) ? '' : date;
            if (date !== lastRenderedDate) lastRenderedDate = date;

            if (match.status === 'spare') {
                const spareColspan = 5;
                tableBody += `
                    <tr class="status-spare">
                        <td class="date-col">${dateCell}</td>
                        <td class="time-col">${time}</td>
                        <td colspan="${spareColspan}">Spare slot for Postponed Fixtures</td>
                    </tr>`;
            } else {
                const awayTeamId = match.awayTeamId || match.awayTeamis;
                const homeTeamName = getTeamName(match.homeTeamId);
                const awayTeamName = getTeamName(awayTeamId);
                const divisionName = competitionCache.get(match.division)?.name || 'N/A';
                const round = match.round || '';

                if (isPostponedTab) {
                    const postponedByTeamName = getTeamName(match.postponedBy);
                    tableBody += `
                        <tr class="status-postponed">
                            <td class="date-col">${dateCell}</td>
                            <td class="time-col">${time}</td>
                            <td class="home-team-col">${homeTeamName}</td>
                            <td class="away-team-col">${awayTeamName}</td>
                            <td class="competition-col">${divisionName}</td>
                            <td class="round-col">${round}</td>
                            <td class="postponed-by-col">${postponedByTeamName}</td>
                        </tr>`;
                } else if (isFixturesTab) {
                    let status = match.status || 'scheduled';
                    let statusCell = (status === 'scheduled') ? '<span></span>' : `<span>${status}</span>`;
                    tableBody += `
                        <tr class="status-${status}">
                            <td class="date-col">${dateCell}</td>
                            <td class="time-col">${time}</td>
                            <td class="home-team-col">${homeTeamName}</td>
                            <td class="away-team-col">${awayTeamName}</td>
                            <td class="competition-col">${divisionName}</td>
                            <td class="round-col">${round}</td>
                            <td class="status-cell">${statusCell}</td>
                        </tr>`;
                } else { // Results Tab
                    const hasResult = match.homeScore != null && match.awayScore != null;
                    const score = hasResult ? `${match.homeScore} - ${match.awayScore}` : '-';
                    let homeTeamHtml = homeTeamName;
                    let awayTeamHtml = awayTeamName;
                    let status = match.status || (hasResult ? 'completed' : 'scheduled');
                    let statusCell = `<a href="match_details.html?matchId=${match.id}&from=fixtures" class="details-link"><icon-component name="notebook"></icon-component></a>`;

                    if (hasResult) {
                        const homeScore = parseInt(match.homeScore, 10);
                        const awayScore = parseInt(match.awayScore, 10);
                        if (homeScore > awayScore) {
                            homeTeamHtml = `<span class="winner">${homeTeamName}</span>`;
                        } else if (awayScore > homeScore) {
                            awayTeamHtml = `<span class="winner">${awayTeamName}</span>`;
                        }
                    }

                    tableBody += `
                        <tr class="status-${status}">
                            <td class="date-col">${dateCell}</td>
                            <td class="time-col">${time}</td>
                            <td class="home-team-col">${homeTeamHtml}</td>
                            <td class="away-team-col">${awayTeamHtml}</td>
                            <td class="score">${score}</td>
                            <td class="status-cell">${statusCell}</td>
                            <td class="competition-col">${divisionName}</td>
                            <td class="round-col">${round}</td>
                        </tr>`;
                }
            }
        }
        tableBody += '</tbody>';

        html += `
            <details class="week-details" open>
                <summary class="${headerClass}">Week Commencing: ${weekStartDateFormatted}</summary>
                <div class="table-container">
                    <table class="results-table">
                        ${tableHeader}
                        ${tableBody}
                    </table>
                </div>
            </details>`;
    }
    container.innerHTML = html;
}


async function updateView() {
    const teamFilter = document.getElementById('team-filter').value;
    const competitionFilter = document.getElementById('competition-filter').value;
    const isFilterActive = teamFilter || competitionFilter;

    let filteredFixtures = allFixtures.filter(match => {
        const awayTeamId = match.awayTeamId || match.awayTeamis;
        const teamMatch = !teamFilter || match.homeTeamId === teamFilter || awayTeamId === teamFilter;
        const competitionMatch = !competitionFilter || match.division === competitionFilter;
        return teamMatch && competitionMatch;
    });

    if (activeTab === 'fixtures') {
        let scheduledFixtures = filteredFixtures.filter(m => 
            (!m.status || m.status === 'scheduled' || m.status === 'rescheduled') && (m.homeScore == null)
        );
        
        let displayFixtures = [...scheduledFixtures];
        if (!isFilterActive) {
            const spareSlots = generateSpareSlots(allFixtures);
            displayFixtures.push(...spareSlots);
        }

        renderFixturesTable(displayFixtures, 'fixtures-container');
    } else if (activeTab === 'results') {
        let results = filteredFixtures.filter(m => m.status === 'completed' || (m.homeScore != null && m.awayScore != null && m.status !== 'postponed'));
        renderFixturesTable(results, 'results-container');
    } else if (activeTab === 'postponed') {
        let postponements = filteredFixtures.filter(m => m.status === 'postponed');
        renderFixturesTable(postponements, 'postponements-container');
    }
}

// --- Filter Logic ---

function populateFilterDropdowns() {
    const teamFilter = document.getElementById('team-filter').value;
    const competitionFilter = document.getElementById('competition-filter').value;

    const availableCompetitions = [...new Set(allFixtures.map(m => m.division))];
    populateCompetitionDropdown(availableCompetitions);

    const availableTeams = new Set();
    allFixtures.forEach(match => {
        if (teamCache.has(match.homeTeamId)) availableTeams.add(match.homeTeamId);
        const awayTeamId = match.awayTeamId || match.awayTeamis;
        if (teamCache.has(awayTeamId)) availableTeams.add(awayTeamId);
    });
    populateTeamDropdown([...availableTeams]);
    
    document.getElementById('competition-filter').value = competitionFilter;
    document.getElementById('team-filter').value = teamFilter;
}

function populateCompetitionDropdown(competitionIds) {
    const competitionFilterSelect = document.getElementById('competition-filter');
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
}

function populateTeamDropdown(teamIds) {
    const teamFilterSelect = document.getElementById('team-filter');
    teamFilterSelect.innerHTML = '<option value="">All Teams</option>';
    const sortedTeams = teamIds
        .map(id => ({ id, name: teamCache.get(id)?.name }))
        .filter(team => team.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    sortedTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamFilterSelect.appendChild(option);
    });
}

async function populateSeasonFilterAndInitialLoad() {
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

    const allSeasonsQuery = await getDocs(collection(db, "match_results"));
    const uniqueSeasons = [...new Set(allSeasonsQuery.docs.map(doc => doc.data().season).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    
    seasonFilterSelect.innerHTML = '';
    if (!currentSeason && uniqueSeasons.length > 0) {
        currentSeason = uniqueSeasons[0];
    }

    uniqueSeasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season;
        option.textContent = season;
        if (season === currentSeason) option.selected = true;
        seasonFilterSelect.appendChild(option);
    });
    
    await handleSeasonChange();
}

async function handleSeasonChange() {
    const selectedSeason = document.getElementById('season-filter').value;
    if (!selectedSeason) return;
    
    document.getElementById('fixtures-container').innerHTML = '<p>Loading fixtures...</p>';
    document.getElementById('results-container').innerHTML = '';
    document.getElementById('postponements-container').innerHTML = '';

    await fetchAllFixtures(selectedSeason);
    populateFilterDropdowns();
    updateView();
}

// --- Event Listeners & Initialization ---

function setupEventListeners() {
    const modal = document.getElementById('filter-modal');
    const filterBtn = document.getElementById('filter-modal-btn');
    const closeBtn = document.querySelector('.modal .close-btn');
    const applyBtn = document.getElementById('apply-filters-btn');

    filterBtn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = 'none';
    }
    applyBtn.onclick = () => {
        updateView();
        modal.style.display = 'none';
    };

    document.querySelector('.tab-bar').addEventListener('click', (e) => {
        if (e.target.matches('.tab-link')) {
            activeTab = e.target.dataset.tab;
            document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(content => content.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(activeTab).classList.add('active');
            updateView();
        }
    });

    document.getElementById('season-filter').addEventListener('change', handleSeasonChange);
}

async function initializePage() {
    await Promise.all([populateCompetitionCache(), populateTeamCache()]);
    await populateSeasonFilterAndInitialLoad();
    setupEventListeners();
}

initializePage();
