import { firebaseConfig } from './firebase.config.js'; // Corrected path

try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

const leagueTableContainer = document.getElementById('league-table-container');
const seasonFilter = document.getElementById('season-filter');

if (leagueTableContainer && seasonFilter) {

    const populateSeasons = async () => {
        try {
            const seasonsSnapshot = await db.collection('league_tables').get();
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
                loadLeagueTables(seasons[0]);
            }
        } catch (error) {
            console.error("Error loading seasons:", error);
            leagueTableContainer.innerHTML = "<p>Could not load season list.</p>";
        }
    };

    const renderDivisionTable = (container, divisionName, divisionData, seasonId) => {
        if (divisionData && Array.isArray(divisionData.standings)) {
            const divisionHeading = document.createElement('h2');
            divisionHeading.textContent = divisionData.leagueName || divisionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            container.appendChild(divisionHeading);
            
            const table = document.createElement('table');
            table.className = 'league-standings-table'; 
            table.innerHTML = `
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
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            
            const teams = divisionData.standings;
            if (seasonId !== '2025-26') {
                teams.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
            }
            
            teams.forEach((team, index) => {
                const row = document.createElement('tr');
                let rowContent;
                const position = index + 1;

                if (seasonId === '2025-26') {
                    const teamName = typeof team === 'object' ? team.teamName : team;
                    rowContent = `
                        <td>${position}</td>
                        <td>${teamName}</td>
                        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
                        <td>-</td><td>-</td><td>-</td><td>-</td>
                    `;
                } else {
                    const played = team.played ?? 0;
                    const won = team.won ?? 0;
                    const pinsFor = team.pinsFor ?? 0;
                    const pinsAgainst = team.pinsAgainst ?? 0;

                    const winPercentage = played > 0 ? ((won / played) * 100).toFixed(1) + '%' : '0.0%';
                    const avgScore = played > 0 ? (pinsFor / played).toFixed(1) : '0.0';

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
                    `;
                }
                row.innerHTML = rowContent;
                tbody.appendChild(row);
            });
            container.appendChild(table);
        }
    };

    const loadLeagueTables = async (seasonId) => {
        leagueTableContainer.innerHTML = ''; 
        if (!seasonId) return; 

        try {
            const docSnap = await db.collection('league_tables').doc(seasonId).get();
            
            if (docSnap.exists) {
                const leagueData = docSnap.data();
                const divisionOrder = ['premier_division', 'first_division', 'second_division', 'ladies_division'];
                const sortedDivisionKeys = Object.keys(leagueData).sort((a, b) => {
                    const indexA = divisionOrder.indexOf(a);
                    const indexB = divisionOrder.indexOf(b);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b);
                });

                for (const divisionKey of sortedDivisionKeys) {
                    if (Object.prototype.hasOwnProperty.call(leagueData, divisionKey)) {
                        renderDivisionTable(leagueTableContainer, divisionKey, leagueData[divisionKey], seasonId);
                    }
                }
            } else {
                leagueTableContainer.innerHTML = `<p>No league data found for the ${seasonId} season.</p>`;
            }
        } catch (error) {
            console.error("Error loading league tables:", error);
            leagueTableContainer.innerHTML = "<p>Error loading league table data.</p>";
        }
    };

    seasonFilter.addEventListener('change', (e) => {
        loadLeagueTables(e.target.value);
    });

    populateSeasons();
}
