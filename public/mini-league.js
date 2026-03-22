import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

const miniLeagueContainer = document.getElementById('mini-league-container');

if (miniLeagueContainer) {

    const fetchCollection = async (collectionName) => {
        const snapshot = await getDocs(collection(db, collectionName));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    const createTeamMap = (teams) => {
        return new Map(teams.map(team => [team.id, team.name]));
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
        table.classList.add('styled-table', 'mini-table');

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.append(
            createHeaderCell('Pos', ['pos-col', 'number-col']),
            createHeaderCell('Team', ['team-name-col']),
            createHeaderCell('Pld', ['number-col']),
            createHeaderCell('Pts', ['number-col', 'pts-col']),
            createHeaderCell('Ave', ['number-col', 'col-average'])
        );

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        divisionData.standings
            .map(team => ({
                ...team,
                teamName: teamsMap.get(team.teamId) || 'N/A',
                played: team.played ?? 0,
                points: team.points ?? 0,
                pinsFor: team.pinsFor ?? 0,
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
                const avgScore = team.played > 0 ? (team.pinsFor / team.played).toFixed(1) : '-';

                row.append(
                    createCell(index + 1, ['pos-col', 'number-col']),
                    createCell(team.teamName, ['team-name-col']),
                    createCell(team.played || '-', ['number-col']),
                    createCell(team.points || '-', ['number-col', 'pts-col']),
                    createCell(avgScore, ['number-col', 'col-average'])
                );
                tbody.appendChild(row);
            });

        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    };

    const loadLeagueData = async () => {
        miniLeagueContainer.innerHTML = '<p>Loading standings...</p>';

        try {
            const seasonsList = await fetchCollection('league_tables');
            const defaultSeason = seasonsList.some(s => s.id === '2025-26') ? '2025-26' : (seasonsList.length ? seasonsList.sort((a, b) => b.id.localeCompare(a.id))[0].id : null);
            
            if (!defaultSeason) {
                miniLeagueContainer.innerHTML = '<p>No current season found.</p>';
                return;
            }

            const docSnap = await getDoc(doc(db, 'league_tables', defaultSeason));
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

                miniLeagueContainer.innerHTML = '';

                sortedDivisionKeys.forEach((divisionKey) => {
                    const divisionData = leagueData[divisionKey];
                    
                    const wrapper = document.createElement('div');
                    const heading = document.createElement('h3');
                    heading.textContent = divisionData.leagueName || divisionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    heading.style.marginTop = '0';
                    heading.style.marginBottom = '10px';
                    heading.style.color = 'var(--club-green)';
                    heading.style.fontSize = '1.2rem';
                    wrapper.appendChild(heading);

                    const tableContainer = renderTable(divisionData, teamsMap);
                    wrapper.appendChild(tableContainer);
                    
                    miniLeagueContainer.appendChild(wrapper);
                });
            } else {
                miniLeagueContainer.innerHTML = `<p>No league data found.</p>`;
            }
        } catch (error) {
            console.error("Error loading mini league tables:", error);
            miniLeagueContainer.innerHTML = "<p>Error loading league table data.</p>";
        }
    };

    loadLeagueData();
}
