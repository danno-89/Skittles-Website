import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

const leagueTableContainer = document.getElementById('league-table-container');
const seasonFilter = document.getElementById('season-filter');
const divisionTabsContainer = document.getElementById('division-tabs-container');

if (leagueTableContainer && seasonFilter && divisionTabsContainer) {

    let teamsMap = new Map();

    const fetchTeams = async () => {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
    };

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
        
        const teams = divisionData.standings.map(team => ({
            teamId: team.teamId,
            teamName: teamsMap.get(team.teamId) || 'N/A',
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
                    <th class="number-col">Pos</th>
                    <th class="team-name-col">Team</th>
                    <th class="number-col">Pld</th>
                    <th class="number-col">W</th>
                    <th class="number-col">D</th>
                    <th class="number-col">L</th>
                    <th class="number-col">Pts</th>
                    <th class="number-col">F</th>
                    <th class="number-col">A</th>
                    <th class="number-col">Win%</th>
                    <th class="number-col">Ave</th>
                    ${hasMaxScore ? '<th class="number-col">Max</th>' : ''}
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

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
                <td class="number-col">${index + 1}</td>
                <td class="team-name-col">${team.teamName}</td>
                <td class="number-col">${team.played === 0 ? '-' : team.played}</td>
                <td class="number-col">${team.won === 0 ? '-' : team.won}</td>
                <td class="number-col">${team.drawn === 0 ? '-' : team.drawn}</td>
                <td class="number-col">${team.lost === 0 ? '-' : team.lost}</td>
                <td class="number-col">${team.points === 0 ? '-' : team.points}</td>
                <td class="number-col">${team.pinsFor === 0 ? '-' : team.pinsFor.toLocaleString()}</td>
                <td class="number-col">${team.pinsAgainst === 0 ? '-' : team.pinsAgainst.toLocaleString()}</td>
                <td class="number-col">${winPercentage === '0.0%' ? '-' : winPercentage}</td>
                <td class="number-col">${avgScore === '0.0' ? '-' : avgScore}</td>
                ${hasMaxScore ? `<td class="number-col">${team.max_score === 0 ? '-' : team.max_score}</td>` : ''}
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
                
                const getDivisionRank = (key) => {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('premier')) return 0;
                    if (lowerKey.includes('first') || lowerKey.includes('1')) return 1;
                    if (lowerKey.includes('second') || lowerKey.includes('2')) return 2;
                    if (lowerKey.includes('third') || lowerKey.includes('3')) return 3;
                    if (lowerKey.includes('fourth') || lowerKey.includes('4')) return 4;
                    if (lowerKey.includes('fifth') || lowerKey.includes('5')) return 5;
                    if (lowerKey.includes('ladies')) return 99;
                    return 100;
                };

                const sortedDivisionKeys = Object.keys(leagueData).sort((a, b) => {
                    if (a === 'season') return 1;
                    if (b === 'season') return -1;
                    
                    const rankA = getDivisionRank(a);
                    const rankB = getDivisionRank(b);

                    if (rankA !== rankB) {
                        return rankA - rankB;
                    }
                    
                    return a.localeCompare(b);
                });
                
                leagueTableContainer.innerHTML = ''; 

                let firstTab = true;
                sortedDivisionKeys.forEach((divisionKey) => {
                    if (divisionKey !== 'season') {
                        const divisionData = leagueData[divisionKey];
                        const leagueName = divisionData.leagueName || divisionKey;

                        if (leagueName.toLowerCase().includes('knockout')) {
                            return; 
                        }

                        const tableContainer = renderTable(leagueData[divisionKey]);
                        tableContainer.classList.add('division-table', 'league-standings-container');
                        tableContainer.dataset.divisionContent = divisionKey;
                        leagueTableContainer.appendChild(tableContainer);
                        
                        const tab = document.createElement('button');
                        tab.className = 'tab-link';
                        tab.dataset.division = divisionKey;
                        tab.textContent = leagueData[divisionKey].leagueName || divisionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        tab.onclick = () => switchTab(divisionKey);
                        divisionTabsContainer.appendChild(tab);

                        if (firstTab) {
                            tab.classList.add('active');
                            tableContainer.style.display = 'block';
                            firstTab = false;
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

    (async () => {
        await fetchTeams();
        await populateSeasons();
    })();
}
