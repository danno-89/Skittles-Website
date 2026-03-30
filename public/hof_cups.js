import { db, collection, getDocs, doc, getDoc } from './firebase.config.js';

// --- DOM ELEMENTS ---
const hallOfFameContainer = document.getElementById('hall-of-fame-container');
const competitionTabsContainer = document.getElementById('competition-tabs-container');
const statsContent = document.getElementById('stats-content');
const detailedWinnersContainer = document.getElementById('detailed-winners-container');

// --- GLOBAL STATE ---
let allCompetitions = [];
let currentWinners = [];

// --- FUNCTIONS ---

const initializePage = async () => {
    try {
        const competitionsSnapshot = await getDocs(collection(db, 'competitions'));
        if (competitionsSnapshot.empty) {
            hallOfFameContainer.innerHTML = '<p>No competition data found.</p>';
            return;
        }
        allCompetitions = competitionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        populateCompetitionTabs();
    } catch (error) {
        console.error("Error initializing page:", error);
        hallOfFameContainer.innerHTML = "<p>Error loading competition data.</p>";
    }
};

const populateCompetitionTabs = () => {
    competitionTabsContainer.innerHTML = '';
    const cupCompetitions = [
        'champion-of-champions',
        'general-knockout',
        'premier-division-knockout',
        'first-division-knockout',
        'second-division-knockout'
    ];
    const competitionOrder = {
        'champion-of-champions': 1,
        'general-knockout': 2,
        'premier-division-knockout': 3,
        'first-division-knockout': 4,
        'second-division-knockout': 5
    };
    
    const filteredCompetitions = allCompetitions
        .filter(c => cupCompetitions.includes(c.id))
        .sort((a, b) => competitionOrder[a.id] - competitionOrder[b.id]);

    if (filteredCompetitions.length === 0) {
        hallOfFameContainer.innerHTML = '<p>No cup competitions found.</p>';
        statsContent.innerHTML = '';
        detailedWinnersContainer.innerHTML = '';
        return;
    }

    filteredCompetitions.forEach(comp => {
        const tab = document.createElement('button');
        tab.className = 'tab-link';
        tab.dataset.competitionId = comp.id;
        tab.textContent = comp.name;
        tab.addEventListener('click', () => handleCompetitionTabClick(comp.id, comp.name));
        competitionTabsContainer.appendChild(tab);
    });

    if (filteredCompetitions.length > 0) {
        handleCompetitionTabClick(filteredCompetitions[0].id, filteredCompetitions[0].name);
    }
};

const handleCompetitionTabClick = (competitionId, competitionName) => {
    competitionTabsContainer.querySelectorAll('.tab-link').forEach(subTab => {
        subTab.classList.toggle('active', subTab.dataset.competitionId === competitionId);
    });

    loadWinners(competitionId);
};

const loadWinners = async (competitionId) => {
    hallOfFameContainer.innerHTML = '<p>Loading...</p>';
    statsContent.innerHTML = '<p>Loading statistics...</p>';
    detailedWinnersContainer.innerHTML = '';

    if (!competitionId) {
        hallOfFameContainer.innerHTML = '';
        statsContent.innerHTML = '<p>Select a competition to see statistics.</p>';
        return;
    }

    try {
        const winnerDoc = await getDoc(doc(db, 'winners', competitionId));
        
        if (winnerDoc.exists()) {
            const data = winnerDoc.data();
            currentWinners = data.history || [];
            currentWinners.sort((a, b) => String(b.season).localeCompare(String(a.season)));
        } else {
            currentWinners = [];
        }

        const competition = allCompetitions.find(c => c.id === competitionId);
        const competitionName = competition ? competition.name : 'Competition';
        
        if (competitionId === 'champion-of-champions') {
            hallOfFameContainer.innerHTML = '<p>Loading detailed data...</p>';
            currentWinners = await enrichWithParticipants(currentWinners);
            renderAsTableChampion(currentWinners, competitionName);
            const { teamStats, divisionWins } = getChampionStats(currentWinners);
            renderChampionStatistics(teamStats, divisionWins);
            renderDetailedChampionList(teamStats);
        } else {
            renderAsTable(currentWinners, competitionName);
            const teamStats = getTeamStats(currentWinners);
            renderStatistics(teamStats);
            renderDetailedWinnersList(teamStats);
        }

    } catch (error) {
        console.error(`Error loading winners for ${competitionId}:`, error);
        hallOfFameContainer.innerHTML = "<p>Error loading winners data.</p>";
        statsContent.innerHTML = "<p>Error generating statistics.</p>";
    }
};

const enrichWithParticipants = async (winnersArray) => {
    try {
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        const teamsMap = new Map(teamsSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        const leagueDocs = await getDocs(collection(db, 'league_tables'));
        const leagueTablesBySeason = new Map(leagueDocs.docs.map(doc => [doc.id, doc.data()]));

        return winnersArray.map(entry => {
            const allParticipants = [];
            const nonWinningParticipants = [];
            const seasonData = leagueTablesBySeason.get(entry.season);
            
            if (seasonData) {
                const sortedDivisionKeys = Object.keys(seasonData)
                    .filter(key => {
                        if (key === 'season') return false;
                        const division = seasonData[key];
                        return typeof division === 'object' && division !== null && !(division.leagueName || key).toLowerCase().includes('knockout');
                    })
                    .sort((a, b) => {
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
                        return getDivisionRank(a) - getDivisionRank(b) || a.localeCompare(b);
                    });

                for (const divKey of sortedDivisionKeys) {
                    const divData = seasonData[divKey];
                    if (divData && Array.isArray(divData.standings) && divData.standings.length > 0) {
                        const sortedStandings = [...divData.standings].sort((a, b) => {
                            const aPlayed = a.played || 0;
                            const bPlayed = b.played || 0;
                            const aAve = aPlayed > 0 ? (a.pinsFor || 0) / aPlayed : 0;
                            const bAve = bPlayed > 0 ? (b.pinsFor || 0) / bPlayed : 0;
                            if (b.points !== a.points) return (b.points || 0) - (a.points || 0);
                            if (bAve !== aAve) return bAve - aAve;
                            if (b.pinsFor !== a.pinsFor) return (b.pinsFor || 0) - (a.pinsFor || 0);
                            if (b.max_score !== a.max_score) return (b.max_score || 0) - (a.max_score || 0);
                            return 0;
                        });
                        const winnerTeamId = sortedStandings[0].teamId;
                        const teamName = teamsMap.get(winnerTeamId) || winnerTeamId;
                        let divName = divData.leagueName || divKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        allParticipants.push({ name: teamName, division: divName });
                        if (teamName !== entry.winner) {
                            nonWinningParticipants.push({ name: teamName, division: divName });
                        }
                    }
                }
            }
            return { ...entry, allParticipants, nonWinningParticipants };
        });
    } catch (error) {
        console.error("Error enriching participants:", error);
        return winnersArray;
    }
};

const renderAsTable = (winnersArray, competitionName) => {
    hallOfFameContainer.innerHTML = '';
    const heading = document.createElement('h2');
    heading.className = 'competition-heading';
    heading.textContent = competitionName;
    hallOfFameContainer.appendChild(heading);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'styled-table';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Season</th><th>Winner</th><th>Runner-Up</th></tr>';
    
    const tbody = table.createTBody();

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        const winnerText = entry.winner || 'N/A';
        const runnerUpText = entry['runner-up'] || entry.runnerUp || '-';
        
        row.innerHTML = `
            <td><strong>${entry.season}</strong></td>
            <td style="font-weight: bold; color: var(--club-green);">${winnerText}</td>
            <td style="color: var(--medium-grey);">${runnerUpText}</td>
        `;
    });
    
    tableContainer.appendChild(table);
    hallOfFameContainer.appendChild(tableContainer);
};

const renderAsTableChampion = (winnersArray, competitionName) => {
    hallOfFameContainer.innerHTML = '';
    const heading = document.createElement('h2');
    heading.className = 'competition-heading';
    heading.textContent = competitionName;
    hallOfFameContainer.appendChild(heading);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'styled-table';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Season</th><th>Winner</th><th>Participants (Division Winners)</th></tr>';
    
    const tbody = table.createTBody();

    winnersArray.forEach(entry => {
        const row = tbody.insertRow();
        let participantsText = '-';
        if (entry.nonWinningParticipants && entry.nonWinningParticipants.length > 0) {
            participantsText = entry.nonWinningParticipants.map(p => `<strong style="color: var(--charcoal);">${p.name}</strong> <span style="font-size: 0.8em; color: var(--medium-grey);">(${p.division})</span>`).join('<br>');
        }
        
        row.innerHTML = `
            <td><strong>${entry.season}</strong></td>
            <td style="font-weight: bold; color: var(--club-green);">${entry.winner || 'N/A'}</td>
            <td>${participantsText}</td>
        `;
    });
    
    tableContainer.appendChild(table);
    hallOfFameContainer.appendChild(tableContainer);
};

const getChampionStats = (winnersArray) => {
    const stats = new Map();
    const divisionWins = new Map();
    
    winnersArray.forEach(entry => {
        if (entry.allParticipants) {
            entry.allParticipants.forEach(p => {
                if (!stats.has(p.name)) {
                    stats.set(p.name, { wins: 0, appearances: 0 });
                }
                stats.get(p.name).appearances += 1;
            });
        }
        
        if (entry.winner && typeof entry.winner === 'string') {
            if (!stats.has(entry.winner)) {
                stats.set(entry.winner, { wins: 0, appearances: 0 });
            }
            stats.get(entry.winner).wins += 1;
            
            if (entry.allParticipants) {
                const winningPart = entry.allParticipants.find(p => p.name === entry.winner);
                if (winningPart) {
                    const div = winningPart.division;
                    divisionWins.set(div, (divisionWins.get(div) || 0) + 1);
                }
            }
        }
    });

    for (const [team, data] of stats.entries()) {
        if (data.appearances < data.wins) {
            data.appearances = data.wins;
        }
    }
    
    return { teamStats: stats, divisionWins };
};

const renderChampionStatistics = (stats, divisionWins) => {
    if (stats.size === 0) {
        statsContent.innerHTML = '<p>No data to calculate stats for.</p>';
        return;
    }
    const sortedByWins = [...stats.entries()].sort((a, b) => b[1].wins - a[1].wins);
    const maxWins = sortedByWins.length > 0 ? sortedByWins[0][1].wins : 0;
    const mostSuccessful = sortedByWins.filter(w => w[1].wins === maxWins && maxWins > 0);

    const sortedByApps = [...stats.entries()].sort((a, b) => b[1].appearances - a[1].appearances);
    const maxApps = sortedByApps.length > 0 ? sortedByApps[0][1].appearances : 0;
    const mostAppearances = sortedByApps.filter(w => w[1].appearances === maxApps && maxApps > 0);

    const unlucky = [...stats.entries()].filter(w => w[1].wins === 0).sort((a, b) => b[1].appearances - a[1].appearances);
    const maxUnluckyApps = unlucky.length > 0 ? unlucky[0][1].appearances : 0;
    const mostUnlucky = unlucky.filter(w => w[1].appearances === maxUnluckyApps && maxUnluckyApps > 0);

    let divisionWinsHtml = '';
    if (divisionWins && divisionWins.size > 0) {
        const sortedDivisions = [...divisionWins.entries()].sort((a, b) => b[1] - a[1]);
        const listItems = sortedDivisions.map(([div, count]) => `<li style="margin-bottom: 4px;"><strong>${div}</strong>: ${count} ${count === 1 ? 'Win' : 'Wins'}</li>`).join('');
        
        divisionWinsHtml = `
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <h3 style="margin: 0 0 10px 0; font-size: 1rem; color: var(--club-green);">Winning Divisions Breakdown</h3>
                <ul style="padding-left: 20px; margin: 0; color: var(--charcoal); font-size: 0.95rem; line-height: 1.4;">
                    ${listItems}
                </ul>
            </div>
        `;
    }

    const formatList = (list, count, suffix = '') => {
        if (list.length === 0 || count === 0) return '-';
        const namesText = list.map(p => p[0]).join(', ');
        return `${count}${suffix} <span style="font-weight: normal; color: var(--charcoal);">- ${namesText}</span>`;
    };

    statsContent.innerHTML = `
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Total Unique Participants:</strong><span style="align-self: flex-start;">${stats.size}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Wins:</strong><span style="align-self: flex-start;">${formatList(mostSuccessful, maxWins)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Appearances:</strong><span style="align-self: flex-start;">${formatList(mostAppearances, maxApps)}</span></div>
        ${mostUnlucky.length > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Apps Without Win:</strong><span style="align-self: flex-start;">${formatList(mostUnlucky, maxUnluckyApps)}</span></div>` : ''}
        ${divisionWinsHtml}
    `;
};

const renderDetailedChampionList = (stats) => {
    detailedWinnersContainer.innerHTML = '';
    if (stats.size === 0) return;

    const heading = document.createElement('h2');
    heading.textContent = 'Finals Record';
    detailedWinnersContainer.appendChild(heading);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    const table = document.createElement('table');
    table.className = 'styled-table';
    table.style.fontSize = '0.9rem';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Team</th><th style="text-align: center;">🏆</th><th style="text-align: center;">Apps</th><th style="text-align: center;">Win%</th></tr>';
    
    const tbody = table.createTBody();

    const sortedTeams = [...stats.entries()].sort((a, b) => {
        if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
        if (b[1].appearances !== a[1].appearances) return b[1].appearances - a[1].appearances;
        return a[0].localeCompare(b[0]);
    });

    sortedTeams.forEach(([team, data]) => {
        const row = tbody.insertRow();
        const winPercentage = data.appearances > 0 ? ((data.wins / data.appearances) * 100).toFixed(1) + '%' : '-';
        row.innerHTML = `
            <td><strong>${team}</strong></td>
            <td style="text-align: center; color: var(--club-green); font-weight: bold;">${data.wins || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${data.appearances}</td>
            <td style="text-align: center; color: var(--medium-grey);">${winPercentage}</td>
        `;
    });

    tableContainer.appendChild(table);
    detailedWinnersContainer.appendChild(tableContainer);
};

const renderStatistics = (teamStats) => {
    if (teamStats.size === 0) {
        statsContent.innerHTML = '<p>No winners to calculate stats for.</p>';
        return;
    }
    
    const teams = [...teamStats.entries()];
    
    const maxWins = Math.max(...teams.map(p => p[1].wins));
    const mostWinsTeams = teams.filter(p => p[1].wins === maxWins && maxWins > 0);
    
    const maxRunnerUps = Math.max(...teams.map(p => p[1].runnerUps));
    const mostRunnerUpsTeams = teams.filter(p => p[1].runnerUps === maxRunnerUps && maxRunnerUps > 0);

    const maxFinals = Math.max(...teams.map(p => p[1].total));
    const mostFinalsTeams = teams.filter(p => p[1].total === maxFinals && maxFinals > 0);

    const maxGap = Math.max(...teams.map(p => p[1].maxGap));
    const maxGapTeams = teams.filter(p => p[1].maxGap === maxGap && maxGap > 0);

    const maxWinGap = Math.max(...teams.map(p => p[1].maxWinGap));
    const maxWinGapTeams = teams.filter(p => p[1].maxWinGap === maxWinGap && maxWinGap > 0);

    const maxStreak = Math.max(...teams.map(p => p[1].maxStreak));
    const maxStreakTeams = teams.filter(p => p[1].maxStreak === maxStreak && maxStreak > 1);

    const perfectTeams = teams.filter(p => p[1].perfectRecord);

    const formatTeamList = (list, count, suffix = '') => {
        if (list.length === 0 || count === 0) return '-';
        const namesText = list.map(p => p[0]).join(', ');
        return `${count}${suffix} <span style="font-weight: normal; color: var(--charcoal);">- ${namesText}</span>`;
    };

    const totalUniqueWinners = teams.filter(p => p[1].wins > 0).length;

    statsContent.innerHTML = `
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Total Unique Winners:</strong><span style="align-self: flex-start;">${totalUniqueWinners}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Wins:</strong><span style="align-self: flex-start;">${formatTeamList(mostWinsTeams, maxWins)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Runner-Up Finishes:</strong><span style="align-self: flex-start;">${formatTeamList(mostRunnerUpsTeams, maxRunnerUps)}</span></div>
        <div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Most Finals Appearances:</strong><span style="align-self: flex-start;">${formatTeamList(mostFinalsTeams, maxFinals)}</span></div>
        ${maxStreak > 1 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Longest Finals Streak:</strong><span style="align-self: flex-start;">${formatTeamList(maxStreakTeams, maxStreak, ' consecutive seasons')}</span></div>` : ''}
        ${maxGap > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Longest Wait Between Finals:</strong><span style="align-self: flex-start;">${formatTeamList(maxGapTeams, maxGap, ' seasons')}</span></div>` : ''}
        ${maxWinGap > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Longest Wait Between Wins:</strong><span style="align-self: flex-start;">${formatTeamList(maxWinGapTeams, maxWinGap, ' seasons')}</span></div>` : ''}
        ${perfectTeams.length > 0 ? `<div class="stat-item" style="flex-direction: column; align-items: flex-start;"><strong style="padding-bottom: 4px;">Undefeated in Finals (2+ apps):</strong><span style="align-self: flex-start; font-size: 0.9em;">${formatTeamList(perfectTeams, '100% Win Rate')}</span></div>` : ''}
    `;
};

const renderDetailedWinnersList = (teamStats) => {
    detailedWinnersContainer.innerHTML = '';
    if (teamStats.size === 0) return;

    const heading = document.createElement('h2');
    heading.textContent = 'Finals Record';
    detailedWinnersContainer.appendChild(heading);

    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    const table = document.createElement('table');
    table.className = 'styled-table';
    table.style.fontSize = '0.9rem';
    
    const thead = table.createTHead();
    thead.innerHTML = '<tr><th>Team</th><th style="text-align: center;">🏆</th><th style="text-align: center;">🥈</th><th style="text-align: center;">Total</th></tr>';
    
    const tbody = table.createTBody();

    const sortedTeams = [...teamStats.entries()].sort((a, b) => {
        if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
        if (b[1].runnerUps !== a[1].runnerUps) return b[1].runnerUps - a[1].runnerUps;
        return a[0].localeCompare(b[0]);
    });

    sortedTeams.forEach(([name, stats]) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><strong>${name}</strong></td>
            <td style="text-align: center; color: var(--club-green); font-weight: bold;">${stats.wins || '-'}</td>
            <td style="text-align: center; color: var(--medium-grey);">${stats.runnerUps || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${stats.total}</td>
        `;
    });

    tableContainer.appendChild(table);
    detailedWinnersContainer.appendChild(tableContainer);
};

function getTeamStats(winnersArray) {
    const stats = new Map();
    
    winnersArray.forEach(entry => {
        const winner = entry.winner;
        const runnerUp = entry['runner-up'] || entry.runnerUp;
        const startYearMatch = (entry.season || '').match(/^(\d{4})/);
        const year = startYearMatch ? parseInt(startYearMatch[1], 10) : null;

        const initTeam = (name) => {
            if (!stats.has(name)) {
                stats.set(name, { wins: 0, runnerUps: 0, total: 0, appearances: [], winSeasons: [] });
            }
        };

        if (winner && typeof winner === 'string') {
            initTeam(winner);
            stats.get(winner).wins += 1;
            stats.get(winner).total += 1;
            if (year) {
                stats.get(winner).appearances.push(year);
                stats.get(winner).winSeasons.push(year);
            }
        }

        if (runnerUp && typeof runnerUp === 'string') {
             initTeam(runnerUp);
             stats.get(runnerUp).runnerUps += 1;
             stats.get(runnerUp).total += 1;
             if (year) stats.get(runnerUp).appearances.push(year);
        }
    });

    stats.forEach((data, name) => {
        data.appearances.sort((a, b) => a - b);
        data.winSeasons.sort((a, b) => a - b);
        
        let maxGap = 0;
        let currentStreak = 1;
        let maxStreak = 1;
        let maxWinGap = 0;

        for (let i = 1; i < data.appearances.length; i++) {
            const gap = data.appearances[i] - data.appearances[i-1];
            if (gap > maxGap) {
                maxGap = gap;
            }
            if (gap === 1) { 
                currentStreak++;
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            } else {
                currentStreak = 1;
            }
        }

        for (let i = 1; i < data.winSeasons.length; i++) {
            const gap = data.winSeasons[i] - data.winSeasons[i-1];
            if (gap > maxWinGap) {
                maxWinGap = gap;
            }
        }
        
        data.maxGap = maxGap;
        data.maxWinGap = maxWinGap;
        data.maxStreak = data.appearances.length > 0 ? maxStreak : 0;
        data.perfectRecord = (data.total > 1 && data.wins === data.total);
    });

    return stats;
}

// --- SCRIPT EXECUTION ---
document.addEventListener('DOMContentLoaded', initializePage);
