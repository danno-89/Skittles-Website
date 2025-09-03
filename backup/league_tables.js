import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

const leagueTableContainer = document.getElementById('league-table-container');
const seasonFilter = document.getElementById('season-filter');
const divisionTabsContainer = document.getElementById('division-tabs-container');

if (leagueTableContainer && seasonFilter && divisionTabsContainer) {

    const populateSeasons = async () => {
        try {
            const seasonsSnapshot = await getDocs(collection(db, 'league_tables'));
            const seasons = seasonsSnapshot.docs.map(doc => doc.id).sort((a, b) => b.localeCompare(a));
            
            seasonFilter.innerHTML = '<option value="">Select a Season</option>';
            seasons.forEach(seasonId => {
                const option = document.createElement('option');
                option.value = seasonId;
                option.textContent = seasonId;
                seasonFilter.appendChild(option);
            });

            const defaultSeason = seasons.includes('2025-26') ? '2025-26' : seasons[0];
            if (defaultSeason) {
                seasonFilter.value = defaultSeason;
                loadLeagueData(defaultSeason);
            }
        } catch (error) {
            console.error("Error loading seasons:", error);
        }
    };

    const renderTable = (divisionData) => {
        const container = document.createElement('div');
        if (!divisionData || !Array.isArray(divisionData.standings)) {
            return container; 
        }
        
        // --- THIS IS THE DEFINITIVE FIX ---
        // 1. Clean the data: Ensure every team has all necessary properties, defaulting to 0.
        const teams = divisionData.standings.map(team => ({
            teamId: team.teamId,
            teamName: team.teamName ?? 'N/A',
            played: team.played ?? 0,
            won: team.won ?? 0,
            drawn: team.drawn ?? 0,
            lost: team.lost ?? 0,
            points: team.points ?? 0,
            pinsFor: team.pinsFor ?? 0,
            pinsAgainst: team.pinsAgainst ?? 0,
            max_score: team.max_score ?? 0,
        }));

        const hasMaxScore = teams.some(team => team.max_score > 0);

        const table = document.createElement('table');
        table.className = 'league-standings-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Pos</th><th>Team</th><th>Pld</th><th>W</th><th>D</th><th>L</th>
                    <th>Pts</th><th>F</th><th>A</th><th>Win%</th><th>Ave</th>
                    ${hasMaxScore ? '<th>Max</th>' : ''}
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        // 2. Sort the clean data using the explicit logic.
        teams.sort((a, b) => {
            const aAve = a.played > 0 ? a.pinsFor / a.played : 0;
            const bAve = b.played > 0 ? b.pinsFor / b.played : 0;

            const pointsDiff = b.points - a.points;
            if (pointsDiff !== 0) return pointsDiff;

            const aveDiff = bAve - aAve;
            if (aveDiff !== 0) return aveDiff;

            const pinsForDiff = b.pinsFor - a.pinsFor;
            if (pinsForDiff !== 0) return pinsForDiff;

            const maxDiff = b.max_score - a.max_score;
            if (maxDiff !== 0) return maxDiff;

            return a.teamName.localeCompare(b.teamName);
        });
        
        teams.forEach((team, index) => {
            const row = document.createElement('tr');
            const winPercentage = team.played > 0 ? `${((team.won / team.played) * 100).toFixed(1)}%` : '0.0%';
            const avgScore = team.played > 0 ? (team.pinsFor / team.played).toFixed(1) : '0.0';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${team.teamName}</td>
                <td>${team.played === 0 ? '-' : team.played}</td>
                <td>${team.won === 0 ? '-' : team.won}</td>
                <td>${team.drawn === 0 ? '-' : team.drawn}</td>
                <td>${team.lost === 0 ? '-' : team.lost}</td>
                <td>${team.points === 0 ? '-' : team.points}</td>
                <td>${team.pinsFor === 0 ? '-' : team.pinsFor.toLocaleString()}</td>
                <td>${team.pinsAgainst === 0 ? '-' : team.pinsAgainst.toLocaleString()}</td>
                <td>${winPercentage === '0.0%' ? '-' : winPercentage}</td>
                <td>${avgScore === '0.0' ? '-' : avgScore}</td>
                ${hasMaxScore ? `<td>${team.max_score === 0 ? '-' : team.max_score}</td>` : ''}
            `;
            tbody.appendChild(row);
        });
        container.appendChild(table);
        return container;
    };

    const switchTab = (divisionKey) => {
        divisionTabsContainer.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
        leagueTableContainer.querySelectorAll('.division-table').forEach(table => table.style.display = 'none');

        const activeTab = divisionTabsContainer.querySelector(`[data-division="${divisionKey}"]`);
        const activeTable = leagueTableContainer.querySelector(`[data-division-content="${divisionKey}"]`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeTable) activeTable.style.display = 'block';
    }

    const loadLeagueData = async (seasonId) => {
        leagueTableContainer.innerHTML = '<p>Loading table...</p>';
        divisionTabsContainer.innerHTML = '';
        if (!seasonId) {
            leagueTableContainer.innerHTML = '';
            return;
        }

        try {
            const docSnap = await getDoc(doc(db, 'league_tables', seasonId));
            
            if (docSnap.exists()) {
                const leagueData = docSnap.data();
                const divisionOrder = ['premier_division', 'first_division', 'second_division', 'ladies_division'];
                const sortedDivisionKeys = Object.keys(leagueData).sort((a, b) => {
                    const indexA = divisionOrder.indexOf(a);
                    const indexB = divisionOrder.indexOf(b);
                    if(a === 'season') return 1;
                    if(b === 'season') return -1;
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b);
                });
                
                leagueTableContainer.innerHTML = ''; 

                sortedDivisionKeys.forEach((divisionKey, index) => {
                    if (divisionKey !== 'season') {
                        const tableContainer = renderTable(leagueData[divisionKey]);
                        tableContainer.className = 'division-table';
                        tableContainer.dataset.divisionContent = divisionKey;
                        leagueTableContainer.appendChild(tableContainer);
                        
                        const tab = document.createElement('button');
                        tab.className = 'tab-link';
                        tab.dataset.division = divisionKey;
                        tab.textContent = leagueData[divisionKey].leagueName || divisionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        tab.onclick = () => switchTab(divisionKey);
                        divisionTabsContainer.appendChild(tab);

                        if (index === 0) {
                            tab.classList.add('active');
                            tableContainer.style.display = 'block';
                        } else {
                            tableContainer.style.display = 'none';
                        }
                    }
                });
            } else {
                leagueTableContainer.innerHTML = `<p>No league data found for the ${seasonId} season.</p>`;
            }
        } catch (error) {
            console.error("Error loading league tables:", error);
            leagueTableContainer.innerHTML = "<p>Error loading league table data.</p>";
        }
    };

    seasonFilter.addEventListener('change', (e) => {
        loadLeagueData(e.target.value);
    });

    populateSeasons();
}
