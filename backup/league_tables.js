import { db } from './firebase.config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const leagueTableContainer = document.getElementById('league-table-container');
const seasonFilter = document.getElementById('season-filter');
const divisionTabsContainer = document.getElementById('division-tabs-container');

let currentTables = {};

if (leagueTableContainer && seasonFilter && divisionTabsContainer) {

    const populateSeasons = async () => {
        try {
            const seasonsSnapshot = await getDocs(collection(db, 'league_tables'));
            if (seasonsSnapshot.empty) {
                seasonFilter.disabled = true;
                seasonFilter.innerHTML = '<option>No seasons found</option>';
                return;
            }
            const seasons = seasonsSnapshot.docs.map(doc => doc.id).sort((a, b) => b.localeCompare(a));
            
            seasons.forEach(seasonId => {
                const option = document.createElement('option');
                option.value = seasonId;
                option.textContent = seasonId;
                seasonFilter.appendChild(option);
            });
            if (seasons.length > 0) {
                loadLeagueData(seasons[0]);
            }
        } catch (error) {
            console.error("Error loading seasons:", error);
            leagueTableContainer.innerHTML = "<p>Could not load season list.</p>";
        }
    };

    const renderTable = (divisionData, seasonId) => {
        const container = document.createElement('div');
        if (divisionData && Array.isArray(divisionData.standings)) {
            const teams = divisionData.standings;
            
            // Check if any team in the division has a max_score
            const hasMaxScore = teams.some(team => team.max_score !== undefined && team.max_score !== null);

            const table = document.createElement('table');
            table.className = 'league-standings-table';
            
            // Dynamically create the header
            let headerHtml = `
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Team</th>
                        <th>Pld</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>Pts</th>
                        <th>F</th>
                        <th>A</th>
                        <th>Win%</th>
                        <th>Ave</th>
                        ${hasMaxScore ? '<th>Max</th>' : ''}
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            table.innerHTML = headerHtml;
            const tbody = table.querySelector('tbody');
            
            // New comprehensive sorting logic
            teams.sort((a, b) => {
                const aPlayed = a.played ?? 0;
                const bPlayed = b.played ?? 0;
                const aPoints = a.points ?? 0;
                const bPoints = b.points ?? 0;
                const aPinsFor = a.pinsFor ?? 0;
                const bPinsFor = b.pinsFor ?? 0;
                const aMaxScore = a.max_score ?? 0;
                const bMaxScore = b.max_score ?? 0;

                // 1. Points
                if (aPoints !== bPoints) return bPoints - aPoints;
                
                // 2. Average
                const aAve = aPlayed > 0 ? aPinsFor / aPlayed : 0;
                const bAve = bPlayed > 0 ? bPinsFor / bPlayed : 0;
                if (aAve !== bAve) return bAve - aAve;

                // 3. Pins For
                if (aPinsFor !== bPinsFor) return bPinsFor - aPinsFor;
                
                // 4. Max Score
                if (aMaxScore !== bMaxScore) return bMaxScore - aMaxScore;

                // 5. Team Name (alphabetical)
                return (a.teamName ?? '').localeCompare(b.teamName ?? '');
            });
            
            teams.forEach((team, index) => {
                const row = document.createElement('tr');
                let rowContent;
                const position = index + 1;
                
                const played = team.played ?? 0;
                const won = team.won ?? 0;
                const pinsFor = team.pinsFor ?? 0;
                const pinsAgainst = team.pinsAgainst ?? 0;

                const winPercentage = played > 0 ? ((won / played) * 100).toFixed(1) + '%' : '0.0%';
                const avgScore = played > 0 ? (pinsFor / played).toFixed(1) : '0.0';

                let maxScoreCell = '';
                if (hasMaxScore) {
                    maxScoreCell = `<td>${team.max_score ?? '-'}</td>`;
                }

                if (seasonId === '2025-26') {
                    rowContent = `
                        <td>${position}</td>
                        <td>${team.teamName}</td>
                        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
                        <td>-</td><td>-</td><td>-</td><td>-</td>
                        ${hasMaxScore ? '<td>-</td>' : ''}
                    `;
                } else {
                     rowContent = `
                        <td>${position}</td>
                        <td>${team.teamName ?? 'N/A'}</td>
                        <td>${played}</td>
                        <td>${won}</td>
                        <td>${team.drawn ?? 0}</td>
                        <td>${team.lost ?? 0}</td>
                        <td>${team.points ?? 0}</td>
                        <td>${pinsFor.toLocaleString()}</td>
                        <td>${pinsAgainst.toLocaleString()}</td>
                        <td>${winPercentage}</td>
                        <td>${avgScore}</td>
                        ${maxScoreCell}
                    `;
                }

                row.innerHTML = rowContent;
                tbody.appendChild(row);
            });
            container.appendChild(table);
        }
        return container;
    };

    const switchTab = (divisionKey) => {
        // Deactivate all tabs
        divisionTabsContainer.querySelectorAll('.tab-link').forEach(tab => {
            tab.classList.remove('active');
        });
        // Hide all tables
        leagueTableContainer.querySelectorAll('.division-table').forEach(table => {
            table.style.display = 'none';
        });

        // Activate the selected tab and show the corresponding table
        const activeTab = divisionTabsContainer.querySelector(`[data-division="${divisionKey}"]`);
        const activeTable = leagueTableContainer.querySelector(`[data-division-content="${divisionKey}"]`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeTable) activeTable.style.display = 'block';
    }

    const loadLeagueData = async (seasonId) => {
        leagueTableContainer.innerHTML = '';
        divisionTabsContainer.innerHTML = '';
        if (!seasonId) return;

        try {
            const docSnap = await getDoc(doc(db, 'league_tables', seasonId));
            
            if (docSnap.exists()) {
                const leagueData = docSnap.data();
                const divisionOrder = ['premier_division', 'first_division', 'second_division', 'ladies_division', 'season'];
                const sortedDivisionKeys = Object.keys(leagueData).sort((a, b) => {
                    const indexA = divisionOrder.indexOf(a);
                    const indexB = divisionOrder.indexOf(b);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b);
                });

                sortedDivisionKeys.forEach((divisionKey, index) => {
                    if (Object.prototype.hasOwnProperty.call(leagueData, divisionKey) && divisionKey !== 'season') {
                        // Create and render the table
                        const tableContainer = renderTable(leagueData[divisionKey], seasonId);
                        tableContainer.className = 'division-table';
                        tableContainer.dataset.divisionContent = divisionKey;
                        leagueTableContainer.appendChild(tableContainer);
                        
                        // Create the tab
                        const tab = document.createElement('button');
                        tab.className = 'tab-link';
                        tab.dataset.division = divisionKey;
                        tab.textContent = leagueData[divisionKey].leagueName || divisionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        tab.onclick = () => switchTab(divisionKey);
                        divisionTabsContainer.appendChild(tab);

                        // Activate the first tab by default
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
