import { db, collection, getDocs, doc, getDoc, updateDoc, query, where } from './firebase.config.js';

let teamsMap = new Map();
let correctedTableData = [];
let initialized = false;

export async function initCorrectionTool() {
    if (initialized) return;

    const seasonSelect = document.getElementById('season-select');
    const divisionSelect = document.getElementById('division-select');
    const generateBtn = document.getElementById('generate-table-btn');
    const correctionContainer = document.getElementById('correction-container');
    const currentTableContainer = document.getElementById('current-table');
    const correctedTableContainer = document.getElementById('corrected-table');
    const confirmBtn = document.getElementById('confirm-update-btn');

    if (!seasonSelect || !divisionSelect || !generateBtn) {
        return;
    }

    await fetchTeams();
    await populateSeasons(seasonSelect, divisionSelect);
    
    seasonSelect.addEventListener('change', () => populateDivisions(seasonSelect.value, divisionSelect));

    generateBtn.addEventListener('click', () => generateCorrectedTable(seasonSelect.value, divisionSelect.value, correctionContainer, currentTableContainer, correctedTableContainer, confirmBtn));
    confirmBtn.addEventListener('click', () => confirmUpdate(seasonSelect.value, divisionSelect.value, correctionContainer));

    initialized = true;
}

async function fetchTeams() {
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    teamsSnapshot.forEach(doc => teamsMap.set(doc.id, doc.data().name));
}

async function populateSeasons(seasonSelect, divisionSelect) {
    const seasonsSnapshot = await getDocs(collection(db, 'league_tables'));
    const seasons = [...new Set(seasonsSnapshot.docs.map(doc => doc.id.split('_')[0]))].sort((a, b) => b.localeCompare(a));
    
    seasonSelect.innerHTML = '<option value="">Select a Season</option>';
    seasons.forEach(seasonId => {
        const option = document.createElement('option');
        option.value = seasonId;
        option.textContent = seasonId.replace('-', ' - ');
        seasonSelect.appendChild(option);
    });

    if (seasons.length > 0) {
        seasonSelect.value = seasons[0];
        await populateDivisions(seasons[0], divisionSelect);
    }
}

async function populateDivisions(season, divisionSelect) {
    divisionSelect.innerHTML = '<option value="">Select a Division</option>';
    if (!season) return;

    const divisions = [];
    const q = query(collection(db, "league_tables"), where("season", "==", season));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        divisions.push({ id: doc.data().divisionId, name: doc.data().divisionName });
    });
    
    divisions.sort((a, b) => a.name.localeCompare(b.name)).forEach(division => {
        const option = document.createElement('option');
        option.value = division.id;
        option.textContent = division.name;
        divisionSelect.appendChild(option);
    });
}

async function generateCorrectedTable(season, division, correctionContainer, currentTableContainer, correctedTableContainer, confirmBtn) {
    if (!season || !division) {
        alert('Please select a season and division.');
        return;
    }

    correctionContainer.style.display = 'block';
    confirmBtn.style.display = 'none';

    const leagueTableId = `${season}_${division}`;
    const currentTable = await fetchCurrentTable(leagueTableId);
    renderTable(currentTable, currentTableContainer, 'Current');

    const completedMatches = await fetchCompletedMatches(season, division);
    
    correctedTableData = recalculateTable(completedMatches, currentTable);
    renderTable(correctedTableData, correctedTableContainer, 'Corrected', currentTable);

    // Deep comparison of sorted data to check for actual changes
    const sortFn = (a, b) => (a.id || a.teamId).localeCompare(b.id || b.teamId);
    const currentSorted = JSON.stringify(currentTable.map(t => ({...t, teamName: undefined})).sort(sortFn));
    const correctedSorted = JSON.stringify(correctedTableData.map(t => ({...t, teamName: undefined})).sort(sortFn));

    if (currentSorted !== correctedSorted) {
        confirmBtn.style.display = 'block';
    }
}

async function fetchCurrentTable(leagueTableId) {
    const leagueRef = doc(db, "league_tables", leagueTableId);
    const leagueSnap = await getDoc(leagueRef);

    if (leagueSnap.exists()) {
        const data = leagueSnap.data();
        return data.teams.map(team => ({
            ...team,
            id: team.id, 
            teamName: teamsMap.get(team.id) || 'Unknown'
        }));
    }
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
    currentTable.forEach(team => {
        newTableMap.set(team.id, { id: team.id, played: 0, won: 0, drawn: 0, lost: 0, points: 0, pinsFor: 0, pinsAgainst: 0 });
    });

    matches.forEach(match => {
        const { homeTeamId, awayTeamId, homeScore, awayScore, bowledFirst } = match;
        const homeTeam = newTableMap.get(homeTeamId);
        const awayTeam = newTableMap.get(awayTeamId);

        if (!homeTeam || !awayTeam) return;

        let homePoints = 0, awayPoints = 0;
        let homeResult = 'lost', awayResult = 'lost';

        if (homeScore > awayScore) {
            homePoints = 2; homeResult = 'won';
        } else if (awayScore > homeScore) {
            awayPoints = 2; awayResult = 'won';
        } else {
            homePoints = 1; awayPoints = 1; homeResult = 'drawn'; awayResult = 'drawn';
        }

        if (bowledFirst === homeTeamId && homeScore < awayScore) homePoints++;
        if (bowledFirst === awayTeamId && awayScore < homeScore) awayPoints++;

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
    table.innerHTML = `<thead><tr><th>Team</th><th>Pld</th><th>W</th><th>D</th><th>L</th><th>Pts</th><th>PF</th><th>PA</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    const sortedData = [...data].sort((a, b) => b.points - a.points || (b.pinsFor - b.pinsAgainst) - (a.pinsFor - a.pinsAgainst) || (teamsMap.get(a.id) || '').localeCompare(teamsMap.get(b.id) || ''));

    sortedData.forEach(team => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${teamsMap.get(team.id) || 'Unknown'}</td><td>${team.played}</td><td>${team.won}</td><td>${team.drawn}</td><td>${team.lost}</td><td>${team.points}</td><td>${team.pinsFor}</td><td>${team.pinsAgainst}</td>`;

        if (comparisonData) {
            const oldTeamData = comparisonData.find(t => t.id === team.id);
            if (oldTeamData) {
                const highlight = (cell, newValue, oldValue) => {
                    if (newValue > oldValue) cell.classList.add('highlight-increase');
                    else if (newValue < oldValue) cell.classList.add('highlight-decrease');
                };
                Object.keys(team).forEach((key, index) => {
                    if (key !== 'id' && key !== 'teamName' && oldTeamData[key] !== undefined) {
                        highlight(row.cells[index], team[key], oldTeamData[key]);
                    }
                });
            }
        }
        tbody.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(table);
}

async function confirmUpdate(season, division, correctionContainer) {
    const leagueTableId = `${season}_${division}`;
    const leagueRef = doc(db, "league_tables", leagueTableId);

    try {
        const dataToUpdate = correctedTableData.map(team => {
            const { teamName, ...rest } = team; // Exclude transient 'teamName' property
            return rest;
        });

        await updateDoc(leagueRef, { teams: dataToUpdate });

        alert('League table updated successfully!');
        correctionContainer.style.display = 'none';
    } catch (error) {
        console.error("Error updating league table:", error);
        alert('An error occurred while updating the league table.');
    }
}
