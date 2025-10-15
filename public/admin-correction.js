import { db, collection, getDocs, doc, getDoc, updateDoc, query, where } from './firebase.config.js';

const seasonSelect = document.getElementById('season-select');
const divisionSelect = document.getElementById('division-select');
const generateBtn = document.getElementById('generate-table-btn');
const correctionContainer = document.getElementById('correction-container');
const currentTableContainer = document.getElementById('current-table');
const correctedTableContainer = document.getElementById('corrected-table');
const confirmBtn = document.getElementById('confirm-update-btn');

let teamsMap = new Map();
let correctedTableData = [];

async function init() {
    await fetchTeams();
    await populateSeasons();
    
    seasonSelect.addEventListener('change', () => populateDivisions(seasonSelect.value));

    generateBtn.addEventListener('click', generateCorrectedTable);
    confirmBtn.addEventListener('click', confirmUpdate);
}

async function fetchTeams() {
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
}

async function populateSeasons() {
    const seasonsSnapshot = await getDocs(collection(db, 'league_tables'));
    const seasons = seasonsSnapshot.docs.map(doc => doc.id).sort((a, b) => b.localeCompare(a));
    
    seasonSelect.innerHTML = '<option value="">Select a Season</option>';
    seasons.forEach(seasonId => {
        const option = document.createElement('option');
        option.value = seasonId;
        option.textContent = seasonId;
        seasonSelect.appendChild(option);
    });

    if (seasons.length > 0) {
        seasonSelect.value = seasons[0];
        await populateDivisions(seasons[0]);
    }
}

async function populateDivisions(seasonId) {
    divisionSelect.innerHTML = '<option value="">Select a Division</option>';
    if (!seasonId) return;

    try {
        const docSnap = await getDoc(doc(db, 'league_tables', seasonId));
        if (docSnap.exists()) {
            const leagueData = docSnap.data();
            const divisionKeys = Object.keys(leagueData).filter(key => key !== 'season');

            for (const key of divisionKeys) {
                const compDocSnap = await getDoc(doc(db, 'competitions', key));
                if (compDocSnap.exists()) {
                    const option = document.createElement('option');
                    option.value = key; // Use the key (e.g., 'premier-division') as the value
                    option.textContent = compDocSnap.data().name;
                    divisionSelect.appendChild(option);
                }
            }
        }
    } catch (error) {
        console.error("Error populating divisions:", error);
    }
}

async function generateCorrectedTable() {
    const season = seasonSelect.value;
    const division = divisionSelect.value;

    if (!season || !division) {
        alert('Please select a season and division.');
        return;
    }

    correctionContainer.style.display = 'block';
    confirmBtn.style.display = 'none';

    const currentTable = await fetchCurrentTable(season, division);
    renderTable(currentTable, currentTableContainer, 'Current');

    const completedMatches = await fetchCompletedMatches(season, division);

    correctedTableData = recalculateTable(completedMatches, currentTable);
    renderTable(correctedTableData, correctedTableContainer, 'Corrected', currentTable);

    const hasChanges = JSON.stringify(currentTable.map(t => ({...t, teamName: undefined})).sort((a,b) => (a.id || a.teamId).localeCompare(b.id || b.teamId))) !== 
                     JSON.stringify(correctedTableData.map(t => ({...t, teamName: undefined})).sort((a,b) => (a.id || a.teamId).localeCompare(b.id || b.teamId)));

    if (hasChanges) {
        confirmBtn.style.display = 'block';
    }
}

async function fetchCurrentTable(season, division) {
    const leagueRef = doc(db, "league_tables", season);
    const leagueSnap = await getDoc(leagueRef);

    if (leagueSnap.exists()) {
        const leagueData = leagueSnap.data();
        if (leagueData[division] && leagueData[division].standings) {
            return leagueData[division].standings.map(team => ({
                ...team,
                id: team.teamId, 
                teamName: teamsMap.get(team.teamId) || 'Unknown'
            }));
        }
    }
    console.warn(`Could not find current table for ${season} > ${division}`);
    return [];
}

async function fetchCompletedMatches(season, division) {
    const matchesQuery = query(
        collection(db, "match_results"),
        where("season", "==", season),
        where("division", "==", division),
        where("status", "==", "completed")
    );
    const matchesSnapshot = await getDocs(matchesQuery);
    return matchesSnapshot.docs.map(doc => doc.data());
}

function recalculateTable(matches, currentTable) {
    const newTableMap = new Map();

    // Initialise map with all teams from the current table to include teams that haven't played
    currentTable.forEach(team => {
        const teamId = team.id || team.teamId;
        if (!newTableMap.has(teamId)) {
            newTableMap.set(teamId, { id: teamId, played: 0, won: 0, drawn: 0, lost: 0, points: 0, pinsFor: 0, pinsAgainst: 0 });
        }
    });

    matches.forEach(match => {
        const { homeTeamId, awayTeamId, homeScore, awayScore } = match;

        const homeTeam = newTableMap.get(homeTeamId);
        const awayTeam = newTableMap.get(awayTeamId);

        if (!homeTeam || !awayTeam) return;

        let homePoints = 0, awayPoints = 0;
        let homeResult = 'lost', awayResult = 'lost';

        if (homeScore > awayScore) {
            homePoints = 2;
            homeResult = 'won';
        } else if (awayScore > homeScore) {
            awayPoints = 2;
            awayResult = 'won';
        } else {
            homePoints = 1;
            awayPoints = 1;
            homeResult = 'drawn';
            awayResult = 'drawn';
        }

        updateTeamStats(homeTeam, homeResult, homePoints, homeScore, awayScore);
        updateTeamStats(awayTeam, awayResult, awayPoints, awayScore, homeScore);
    });

    return Array.from(newTableMap.values());
}

function updateTeamStats(team, result, points, scoreFor, scoreAgainst) {
    team.played++;
    if (result === 'won') team.won++;
    if (result === 'drawn') team.drawn++;
    if (result === 'lost') team.lost++;
    team.points += points;
    team.pinsFor += scoreFor;
    team.pinsAgainst += scoreAgainst;
}

function renderTable(data, container, type, comparisonData = null) {
    const table = document.createElement('table');
    table.className = 'league-standings-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Team</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>PF</th><th>PA</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    const sortedData = [...data].sort((a, b) => b.points - a.points || (b.pinsFor - b.pinsAgainst) - (a.pinsFor - a.pinsAgainst) || (teamsMap.get(a.id || a.teamId) || '').localeCompare(teamsMap.get(b.id || b.teamId) || ''));

    sortedData.forEach(team => {
        const row = document.createElement('tr');
        const teamId = team.id || team.teamId;
        const teamName = teamsMap.get(teamId) || 'Unknown';
        row.innerHTML = `
            <td>${teamName}</td>
            <td>${team.played || '-'}</td>
            <td>${team.won || '-'}</td>
            <td>${team.drawn || '-'}</td>
            <td>${team.lost || '-'}</td>
            <td>${team.points || '-'}</td>
            <td>${team.pinsFor || '-'}</td>
            <td>${team.pinsAgainst || '-'}</td>
        `;

        if (comparisonData) {
            const oldTeamData = comparisonData.find(t => (t.id || t.teamId) === teamId);
            if (oldTeamData) {
                const highlight = (cell, newValue, oldValue) => {
                    if (newValue > oldValue) cell.classList.add('highlight-increase');
                    else if (newValue < oldValue) cell.classList.add('highlight-decrease');
                };
                highlight(row.cells[1], team.played, oldTeamData.played);
                highlight(row.cells[2], team.won, oldTeamData.won);
                highlight(row.cells[3], team.drawn, oldTeamData.drawn);
                highlight(row.cells[4], team.lost, oldTeamData.lost);
                highlight(row.cells[5], team.points, oldTeamData.points);
                highlight(row.cells[6], team.pinsFor, oldTeamData.pinsFor);
                highlight(row.cells[7], team.pinsAgainst, oldTeamData.pinsAgainst);
            }
        }
        tbody.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(table);
}

async function confirmUpdate() {
    const season = seasonSelect.value;
    const division = divisionSelect.value;
    const leagueRef = doc(db, "league_tables", season);

    try {
        const dataToUpdate = correctedTableData.map(team => {
            const { id, teamName, ...rest } = team;
            return { ...rest, teamId: id };
        });

        const updatePayload = {};
        updatePayload[`${division}.standings`] = dataToUpdate;

        await updateDoc(leagueRef, updatePayload);
        alert('League table updated successfully!');
        correctionContainer.style.display = 'none';
    } catch (error) {
        console.error("Error updating league table:", error);
        alert('An error occurred while updating the league table.');
    }
}

init();
