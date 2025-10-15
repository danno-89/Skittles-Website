import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

const leagueTableContainer = document.getElementById('league-table-container');
const seasonFilter = document.getElementById('season-filter');
const divisionTabsContainer = document.getElementById('division-tabs-container');

if (leagueTableContainer && seasonFilter && divisionTabsContainer) {

    const fetchCollection = async (collectionName) => {
        const snapshot = await getDocs(collection(db, collectionName));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    const createTeamMap = (teams) => {
        return new Map(teams.map(team => [team.id, team.name]));
    };

    const populateSeasons = (seasons) => {
        seasonFilter.innerHTML = '<option value="">Select a Season</option>';
        seasons.sort((a, b) => b.id.localeCompare(a.id)).forEach(season => {
            const option = document.createElement('option');
            option.value = season.id;
            option.textContent = season.id;
            seasonFilter.appendChild(option);
        });

        const defaultSeason = seasons.some(s => s.id === '2025-26') ? '2025-26' : (seasons[0]?.id || '');
        if (defaultSeason) {
            seasonFilter.value = defaultSeason;
            loadLeagueData(defaultSeason);
        }
    };

    const createCell = (text, classList = []) => {
        const cell = document.createElement('td');
        cell.textContent = text;
        classList.forEach(c => cell.classList.add(c));
        return cell;
    };

    const createHeaderCell = (text, classList = []) => {
        const cell = document.createElement('th');
        cell.textContent = text;
        classList.forEach(c => cell.classList.add(c));
        return cell;
    };

    const renderTable = (divisionData, teamsMap) => {
        const container = document.createElement('div');
        container.classList.add('table-container');

        if (!divisionData || !Array.isArray(divisionData.standings)) {
            return container;
        }

        const table = document.createElement('table');
        table.classList.add('styled-table');

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.append(
            createHeaderCell('Pos', ['pos-col', 'number-col']),
            createHeaderCell('Team', ['team-name-col']),
            createHeaderCell('Pld', ['number-col']),
            createHeaderCell('W', ['number-col']),
            createHeaderCell('D', ['number-col']),
            createHeaderCell('L', ['number-col']),
            createHeaderCell('Pts', ['number-col', 'pts-col']),
            createHeaderCell('F', ['number-col', 'col-pins-for']),
            createHeaderCell('A', ['number-col', 'col-pins-against']),
            createHeaderCell('Win%', ['number-col', 'col-win-percentage']),
            createHeaderCell('Ave', ['number-col', 'col-average'])
        );

        const hasMaxScore = divisionData.standings.some(team => team.max_score > 0);
        if (hasMaxScore) {
            headerRow.appendChild(createHeaderCell('Max', ['number-col']));
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        divisionData.standings
            .map(team => ({
                ...team,
                teamName: teamsMap.get(team.teamId) || 'N/A',
                played: team.played ?? 0,
                won: team.won ?? 0,
                drawn: team.drawn ?? 0,
                lost: team.lost ?? 0,
                points: team.points ?? 0,
                pinsFor: team.pinsFor ?? 0,
                pinsAgainst: team.pinsAgainst ?? 0,
                max_score: team.max_score ?? 0,
            }))
            .sort((a, b) => {
                const aAve = a.played > 0 ? a.pinsFor / a.played : 0;
                const bAve = b.played > 0 ? b.pinsFor / b.played : 0;
                if (b.points !== a.points) return b.points - a.points;
                if (bAve !== aAve) return bAve - aAve;
                if (b.pinsFor !== a.pinsFor) return b.pinsFor - a.pinsFor;
                if (b.max_score !== a.max_score) return b.max_score - a.max_score;
                return a.teamName.localeCompare(b.teamName);
            })
            .forEach((team, index) => {
                const row = document.createElement('tr');
                const winPercentage = team.played > 0 ? `${((team.won / team.played) * 100).toFixed(1)}%` : '-';
                const avgScore = team.played > 0 ? (team.pinsFor / team.played).toFixed(1) : '-';

                row.append(
                    createCell(index + 1, ['pos-col', 'number-col']),
                    createCell(team.teamName, ['team-name-col']),
                    createCell(team.played || '-', ['number-col']),
                    createCell(team.won || '-', ['number-col']),
                    createCell(team.drawn || '-', ['number-col']),
                    createCell(team.lost || '-', ['number-col']),
                    createCell(team.points || '-', ['number-col', 'pts-col']),
                    createCell(team.pinsFor ? team.pinsFor.toLocaleString() : '-', ['number-col', 'col-pins-for']),
                    createCell(team.pinsAgainst ? team.pinsAgainst.toLocaleString() : '-', ['number-col', 'col-pins-against']),
                    createCell(winPercentage, ['number-col', 'col-win-percentage']),
                    createCell(avgScore, ['number-col', 'col-average'])
                );

                if (hasMaxScore) {
                    row.appendChild(createCell(team.max_score || '-', ['number-col']));
                }

                tbody.appendChild(row);
            });

        table.appendChild(tbody);
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
    };

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
                const teamsMap = await fetchCollection('teams').then(createTeamMap);

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

                const sortedDivisionKeys = Object.keys(leagueData)
                    .filter(key => {
                        if (key === 'season') return false;
                        const division = leagueData[key];
                        if (typeof division !== 'object' || division === null) return false;
                        const leagueName = division.leagueName || key;
                        return !leagueName.toLowerCase().includes('knockout');
                    })
                    .sort((a, b) => getDivisionRank(a) - getDivisionRank(b) || a.localeCompare(b));

                leagueTableContainer.innerHTML = '';

                sortedDivisionKeys.forEach((divisionKey, index) => {
                    const divisionData = leagueData[divisionKey];
                    const tableContainer = renderTable(divisionData, teamsMap);
                    tableContainer.classList.add('division-table');
                    tableContainer.dataset.divisionContent = divisionKey;
                    tableContainer.style.display = index === 0 ? 'block' : 'none';
                    leagueTableContainer.appendChild(tableContainer);

                    const tab = document.createElement('button');
                    tab.className = 'tab-link';
                    if (index === 0) {
                        tab.classList.add('active');
                    }
                    tab.dataset.division = divisionKey;
                    tab.textContent = divisionData.leagueName || divisionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    tab.onclick = () => switchTab(divisionKey);
                    divisionTabsContainer.appendChild(tab);
                });
            } else {
                leagueTableContainer.innerHTML = `<p>No league data found for the ${seasonId} season.</p>`;
            }
        } catch (error) {
            console.error("Error loading league tables:", error);
            leagueTableContainer.innerHTML = "<p>Error loading league table data.</p>";
        }
    };

    const init = async () => {
        if (leagueTableContainer && seasonFilter && divisionTabsContainer) {
            const seasons = await fetchCollection('league_tables');
            populateSeasons(seasons);
            seasonFilter.addEventListener('change', (e) => loadLeagueData(e.target.value));
        }
    };

    init();
}
