import { db, collection, getDocs, doc, getDoc, query, where } from './firebase.config.js';

const groupContainer = document.getElementById('group-container');
const seasonFilter = document.getElementById('season-filter');
const groupTabsContainer = document.getElementById('group-tabs-container');

// Function to fetch all team data and create a map of teamId to teamName
const getTeamData = async () => {
    const teams = {};
    try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        querySnapshot.forEach((doc) => {
            teams[doc.id] = doc.data().name;
        });
    } catch (error) {
        console.error("Error fetching team data:", error);
    }
    return teams;
};

// Function to fetch fixtures for a specific group, now including the match ID
const getFixturesForGroup = async (seasonId, groupName) => {
    const fixtures = [];
    try {
        const q = query(collection(db, "match_results"), 
            where("season", "==", seasonId),
            where("division", "==", "ssc-cup"),
            where("round", "==", groupName)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            fixtures.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error(`Error fetching fixtures for ${groupName}:`, error);
    }
    return fixtures;
};

// --- Helper function to get the start of a week (Monday) ---
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

if (groupContainer && seasonFilter && groupTabsContainer) {
    let teamData = {}; // To store the fetched team data
    let teamAverages = {}; // To store the team averages for handicap calculation

    const populateSeasons = async () => {
        try {
            const seasonsSnapshot = await getDocs(collection(db, 'ssc_cup'));
            const seasons = seasonsSnapshot.docs.map(doc => doc.id).sort((a, b) => b.localeCompare(a));
            
            seasonFilter.innerHTML = '<option value="">Select a Season</option>';
            seasons.forEach(seasonId => {
                const option = document.createElement('option');
                option.value = seasonId;
                option.textContent = seasonId;
                seasonFilter.appendChild(option);
            });

            if (seasons.length > 0) {
                seasonFilter.value = seasons[0];
                loadGroupData(seasons[0]);
            }
        } catch (error) {
            console.error("Error loading seasons:", error);
        }
    };

    const renderTable = (groupData) => {
        const container = document.createElement('div');
        container.className = 'league-standings-container'; 

        if (!groupData || !Array.isArray(groupData.standings)) {
            return container; 
        }
        
        const teams = groupData.standings.map(team => ({
            teamName: teamData[team.teamName] || team.teamName,
            played: team.played ?? 0,
            won: team.won ?? 0,
            drawn: team.drawn ?? 0,
            lost: team.lost ?? 0,
            points: team.points ?? 0,
        }));

        const table = document.createElement('table');
        table.className = 'league-standings-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Pos</th><th>Team</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>Pts</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        teams.sort((a, b) => b.points - a.points || b.played - a.played || a.teamName.localeCompare(b.teamName));
        
        teams.forEach((team, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${team.teamName}</td>
                <td>${team.played || '-'}</td>
                <td>${team.won || '-'}</td>
                <td>${team.drawn || '-'}</td>
                <td>${team.lost || '-'}</td>
                <td>${team.points || '-'}</td>
            `;
            tbody.appendChild(row);
        });
        container.appendChild(table);
        return container;
    };

    const renderFixtures = (fixtures) => {
        const container = document.createElement('div');
        container.className = 'fixtures-container';
    
        if (!fixtures || fixtures.length === 0) {
            container.innerHTML = '<p>No fixtures available for this group.</p>';
            return container;
        }
    
        const fixturesByWeek = fixtures.reduce((acc, fixture) => {
            if (!fixture.scheduledDate) return acc;
            const fixtureDate = fixture.scheduledDate.toDate ? fixture.scheduledDate.toDate() : new Date(fixture.scheduledDate);
            if (isNaN(fixtureDate.getTime())) return acc;
    
            const startOfWeek = getStartOfWeek(fixtureDate).toISOString().split('T')[0];
            if (!acc[startOfWeek]) {
                acc[startOfWeek] = [];
            }
            acc[startOfWeek].push(fixture);
            return acc;
        }, {});
    
        const sortedWeeks = Object.keys(fixturesByWeek).sort((a, b) => new Date(a) - new Date(b));
    
        let html = '';
        sortedWeeks.forEach(week => {
            const fixturesInWeek = fixturesByWeek[week].sort((a,b) => {
                const dateA = a.scheduledDate.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate);
                const dateB = b.scheduledDate.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate);
                return dateA - dateB;
            });

            const weekStartDate = new Date(week);
            const weekCommencing = weekStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    
            html += `<details class="week-details" open>`;
            html += `<summary class="week-summary">Week Commencing: ${weekCommencing}</summary>`;
            html += `<div class="table-container">`;
            html += `<table class="results-table">
                        <thead>
                            <tr>
                                <th class="date-col">Date</th>
                                <th class="time-col">Time</th>
                                <th class="home-team-col">Home Team</th>
                                <th class="away-team-col">Away Team</th>
                                <th class="score-col">Score</th>
                                <th class="score-balance-col">Score Balance</th>
                                <th class="status-col">Status</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
            fixturesInWeek.forEach(fixture => {
                const homeTeamId = fixture.homeTeamId;
                const awayTeamId = fixture.awayTeamId;
                const homeTeamName = teamData[homeTeamId] || 'Unknown Team';
                const awayTeamName = teamData[awayTeamId] || 'Unknown Team';
                
                const fixtureDate = fixture.scheduledDate.toDate ? fixture.scheduledDate.toDate() : new Date(fixture.scheduledDate);
                const formattedDate = fixtureDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                const formattedTime = fixtureDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

                const hasResult = (typeof fixture.home_score === 'number' && typeof fixture.away_score ==='number') || (typeof fixture.homeScore === 'number' && typeof fixture.awayScore ==='number');
                const score = hasResult ? `${fixture.homeScore || fixture.home_score} - ${fixture.awayScore || fixture.away_score}` : '-';

                let handicapText = '';
                const homeAvg = teamAverages[homeTeamId];
                const awayAvg = teamAverages[awayTeamId];

                if (homeAvg && awayAvg) {
                    const handicap = Math.round(Math.abs(homeAvg - awayAvg) * 0.95);
                    if (handicap > 0) {
                        const underdogName = homeAvg < awayAvg ? homeTeamName : awayTeamName;
                        handicapText = `+${handicap} for ${underdogName}`;
                    }
                }

                let rowClass = '';
                let statusText = '';
                if (fixture.status && fixture.status.toLowerCase() === 'rescheduled') {
                    rowClass = 'status-rescheduled';
                    statusText = 'Rescheduled';
                } else if (fixture.status && fixture.status.toLowerCase() === 'postponed') {
                    rowClass = 'status-postponed';
                    statusText = 'Postponed';
                }
    
                html += `
                    <tr class="${rowClass}">
                        <td>${formattedDate}</td>
                        <td>${formattedTime}</td>
                        <td class="team-name home-team">${homeTeamName}</td>
                        <td class="team-name away-team">${awayTeamName}</td>
                        <td class="score-col">${score}</td>
                        <td class="score-balance-col">${handicapText}</td>
                        <td class="status-col">${statusText}</td>
                    </tr>
                `;
            });
    
            html += `</tbody></table></div></details>`;
        });
        
        container.innerHTML = html;
        return container;
    };

    const switchTab = (groupKey) => {
        groupTabsContainer.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
        groupContainer.querySelectorAll('.group-content').forEach(content => content.style.display = 'none');

        const activeTab = groupTabsContainer.querySelector(`[data-group="${groupKey}"]`);
        const activeContent = groupContainer.querySelector(`[data-group-content="${groupKey}"]`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.style.display = 'block';
    }

    const loadGroupData = async (seasonId) => {
        groupContainer.innerHTML = '<p>Loading data...</p>';
        groupTabsContainer.innerHTML = '';
        if (!seasonId) {
            groupContainer.innerHTML = '';
            return;
        }

        try {
            const docSnap = await getDoc(doc(db, 'ssc_cup', seasonId));
            
            if (docSnap.exists()) {
                const cupData = docSnap.data();
                teamAverages = cupData.teamAverages || {}; 
                const sortedGroupKeys = Object.keys(cupData).sort();
                
                groupContainer.innerHTML = ''; 

                let firstTab = true;
                for (const groupKey of sortedGroupKeys) {
                    if (groupKey.toLowerCase().startsWith('group')) {
                        const groupData = cupData[groupKey];
                        const groupLetter = groupKey.split('_')[1];

                        const contentContainer = document.createElement('div');
                        contentContainer.className = 'group-content';
                        contentContainer.dataset.groupContent = groupKey;

                        const tableContainer = renderTable(groupData);
                        contentContainer.appendChild(tableContainer);

                        const subheader = document.createElement('h2');
                        subheader.textContent = 'Group Fixtures';
                        subheader.className = 'group-fixtures-subheader';
                        contentContainer.appendChild(subheader);
                        
                        const narrativeDiv = document.createElement('div');
                        narrativeDiv.className = 'handicap-narrative';
                        narrativeDiv.innerHTML = `
                            <p>As the SSC Cup is a Score Balanced competition, for each fixture, one team will be awarded an additional score of pins, based on the teams average scores (since the start of Sep 2024) in order to balance the match.</p>
                            <p>All fixtures should be played as normal with the additional pins, indicated in the score balance column, added to the final score of the match.</p>
                            <p>Where no score is provided, there is no balancing score as the averages are already similar.</p>
                        `;
                        contentContainer.appendChild(narrativeDiv);

                        const fixtures = await getFixturesForGroup(seasonId, `Group Stage - ${groupLetter}`);
                        const fixturesContainer = renderFixtures(fixtures);
                        contentContainer.appendChild(fixturesContainer);
                        
                        groupContainer.appendChild(contentContainer);
                        
                        const tab = document.createElement('button');
                        tab.className = 'tab-link';
                        tab.dataset.group = groupKey;
                        tab.textContent = groupKey.replace(/_/g, ' ');
                        tab.onclick = () => switchTab(groupKey);
                        groupTabsContainer.appendChild(tab);

                        if (firstTab) {
                            tab.classList.add('active');
                            contentContainer.style.display = 'block';
                            firstTab = false;
                        } else {
                            contentContainer.style.display = 'none';
                        }
                    }
                }
            } else {
                groupContainer.innerHTML = `<p>No cup data found for the ${seasonId} season.</p>`;
            }
        } catch (error) {
            console.error("Error loading cup data:", error);
            groupContainer.innerHTML = "<p>Error loading cup data.</p>";
        }
    };

    seasonFilter.addEventListener('change', (e) => {
        loadGroupData(e.target.value);
    });

    // Fetch team data first, then populate the seasons and the rest of the page
    getTeamData().then(data => {
        teamData = data;
        populateSeasons();
    });
}
