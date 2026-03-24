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
        cell.innerHTML = text;
        classList.forEach(c => cell.classList.add(c));
        return cell;
    };

    const createHeaderCell = (text, classList = []) => {
        const cell = document.createElement('th');
        cell.textContent = text;
        classList.forEach(c => cell.classList.add(c));
        return cell;
    };

    const renderTable = (divisionKey, divisionData, teamsMap, allMatches) => {
        const wrapper = document.createElement('div');
        
        const container = document.createElement('div');
        container.classList.add('table-container');

        if (!divisionData || !Array.isArray(divisionData.standings)) {
            wrapper.appendChild(container);
            return wrapper;
        }

        const isPremierDivision = divisionKey.toLowerCase().includes('premier');

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

        const standingsWithMeta = divisionData.standings
            .map(team => {
                const teamName = teamsMap.get(team.teamId) || 'N/A';
                const played = team.played ?? 0;
                const won = team.won ?? 0;
                const drawn = team.drawn ?? 0;
                const lost = team.lost ?? 0;
                const points = team.points ?? 0;
                const pinsFor = team.pinsFor ?? 0;
                const pinsAgainst = team.pinsAgainst ?? 0;
                const max_score = team.max_score ?? 0;

                const remainingMatches = allMatches.filter(m => 
                    (m.homeTeamId === team.teamId || m.awayTeamId === team.teamId) && 
                    m.homeScore == null && m.status !== 'spare' && m.division === divisionKey
                ).length;
                
                const maxPossiblePoints = points + (remainingMatches * 2);

                return {
                    ...team, teamName, played, won, drawn, lost, points, pinsFor, pinsAgainst, max_score, remainingMatches, maxPossiblePoints
                };
            })
            .sort((a, b) => {
                const aAve = a.played > 0 ? a.pinsFor / a.played : 0;
                const bAve = b.played > 0 ? b.pinsFor / b.played : 0;
                if (b.points !== a.points) return b.points - a.points;
                if (bAve !== aAve) return bAve - aAve;
                if (b.pinsFor !== a.pinsFor) return b.pinsFor - a.pinsFor;
                if (b.max_score !== a.max_score) return b.max_score - a.max_score;
                return a.teamName.localeCompare(b.teamName);
            });

        let championTeamId = null;
        if (standingsWithMeta.length > 1) {
            const firstPlace = standingsWithMeta[0];
            const maxPointsOthers = Math.max(...standingsWithMeta.slice(1).map(t => t.maxPossiblePoints));
            if (firstPlace.points > maxPointsOthers) {
                championTeamId = firstPlace.teamId;
            }
        }

        let relegatedTeamId = null;
        if (isPremierDivision && standingsWithMeta.length > 1) {
            const lastPlace = standingsWithMeta[standingsWithMeta.length - 1];
            const secondLastPlace = standingsWithMeta[standingsWithMeta.length - 2];
            if (lastPlace.maxPossiblePoints < secondLastPlace.points) {
                relegatedTeamId = lastPlace.teamId;
            }
        }

        const tbody = document.createElement('tbody');
        standingsWithMeta
            .forEach((team, index) => {
                const row = document.createElement('tr');
                const winPercentage = team.played > 0 ? `${((team.won / team.played) * 100).toFixed(1)}%` : '-';
                const avgScore = team.played > 0 ? (team.pinsFor / team.played).toFixed(1) : '-';

                const teamLink = `<a href="public-team-profile.html?teamId=${team.teamId}&returnUrl=${encodeURIComponent(window.location.href)}" class="team-profile-link" style="text-decoration: none; color: inherit; font-weight: inherit;">${team.teamName}</a>`;
                let displayName = teamLink;
                if (team.teamId === championTeamId) {
                    displayName = `<span style="font-weight: bold;">${teamLink} <span title="League Champions!" style="color: #d4af37; margin-left: 5px;">🏆</span></span>`;
                } else if (team.teamId === relegatedTeamId) {
                    displayName = `<span style="color: var(--danger);">${teamLink} <span title="Relegated" style="margin-left: 5px;">🔽</span></span>`;
                }

                row.append(
                    createCell(index + 1, ['pos-col', 'number-col']),
                    createCell(displayName, ['team-name-col']),
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
        wrapper.appendChild(container);

        if (standingsWithMeta.length > 1) {
            const first = standingsWithMeta[0];
            const second = standingsWithMeta[1];
            
            const narrativeContainer = document.createElement('div');
            narrativeContainer.style.marginTop = 'var(--spacing-md)';
            narrativeContainer.style.padding = 'var(--spacing-sm) var(--spacing-md)';
            narrativeContainer.style.backgroundColor = 'var(--off-white)';
            narrativeContainer.style.borderLeft = '4px solid var(--club-yellow)';
            narrativeContainer.style.borderRadius = 'var(--border-radius)';
            narrativeContainer.style.fontSize = '0.95rem';
            narrativeContainer.style.color = 'var(--darker-green)';
            
            let narrative = '';
            
            if (championTeamId) {
                narrative = `🏆 <strong>${first.teamName}</strong> are the Champions! They have mathematically secured the division title.`;
            } else if (first.points === second.points) {
                narrative = `It's incredibly close at the top! <strong>${first.teamName}</strong> and <strong>${second.teamName}</strong> are currently tied on ${first.points} points.`;
            } else if (first.remainingMatches === 0) {
                narrative = `<strong>${first.teamName}</strong> have finished their scheduled matches and lead the division, but must wait to see if trailing teams drop points.`;
            } else {
                const maxPointsOthers = Math.max(...standingsWithMeta.slice(1).map(t => t.maxPossiblePoints));
                const pointsNeededToWin = Math.max(1, (maxPointsOthers + 1) - first.points);
                
                if (pointsNeededToWin <= (first.remainingMatches * 2)) {
                    const pointsAvailable = first.remainingMatches * 2;
                    const pctRequired = ((pointsNeededToWin / pointsAvailable) * 100).toFixed(1);

                    narrative = `<strong>${first.teamName}</strong> currently lead the division. They require <strong>${pointsNeededToWin}</strong> more point${pointsNeededToWin === 1 ? '' : 's'} (<strong>${pctRequired}%</strong>) from their remaining <strong>${first.remainingMatches}</strong> match${first.remainingMatches === 1 ? '' : 'es'} (${pointsAvailable} points available) to mathematically secure the title.`;
                } else {
                    narrative = `<strong>${first.teamName}</strong> currently lead the division, but with plenty of points still in play, the title race is wide open!`;
                }
            }
            
            narrativeContainer.innerHTML = narrative;
            wrapper.appendChild(narrativeContainer);
        }

        const completedMatches = allMatches.filter(m => 
            m.division === divisionKey && 
            m.homeScore != null && m.awayScore != null &&
            m.status === 'completed'
        ).sort((a, b) => a.scheduledDate - b.scheduledDate);

        let currentMax = 0;
        const scoreProgression = [];

        completedMatches.forEach(match => {
            if (match.homeScore > currentMax) {
                currentMax = match.homeScore;
                scoreProgression.push({ teamId: match.homeTeamId, score: match.homeScore, date: match.scheduledDate });
            }
            if (match.awayScore > currentMax) {
                currentMax = match.awayScore;
                scoreProgression.push({ teamId: match.awayTeamId, score: match.awayScore, date: match.scheduledDate });
            }
        });

        if (scoreProgression.length > 0) {
            const progressionDiv = document.createElement('div');
            progressionDiv.style.marginTop = 'var(--spacing-md)';
            progressionDiv.style.padding = 'var(--spacing-md)';
            progressionDiv.style.backgroundColor = 'var(--off-white)';
            progressionDiv.style.borderLeft = '4px solid var(--club-green)';
            progressionDiv.style.borderRadius = 'var(--border-radius)';
            progressionDiv.style.fontSize = '0.95rem';
            progressionDiv.style.color = 'var(--charcoal)';
            
            let listHTML = scoreProgression.map((p, i, arr) => {
                let actionText = 'broke the record with';
                if (i === 0) actionText = 'set the initial benchmark with';
                if (i === arr.length - 1) actionText = 'currently holds the record with';
                if (arr.length === 1) actionText = 'currently holds the record with';

                return `
                <li style="margin-bottom: 4px;">
                    <strong>${teamsMap.get(p.teamId) || 'Unknown'}</strong> ${actionText} <strong>${p.score}</strong> 
                    <span style="color: var(--medium-grey); font-size: 0.85em;">(${p.date ? p.date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}) : 'Unknown Date'})</span>
                </li>
                `;
            }).join('');
            
            progressionDiv.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: var(--club-green); font-size: 1rem;">Highest Score Progression</h4>
                <ul style="margin: 0; padding-left: 20px; text-align: left;">
                    ${listHTML}
                </ul>
            `;
            wrapper.appendChild(progressionDiv);
        }

        return wrapper;
    };

    const switchTab = (divisionKey) => {
        divisionTabsContainer.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
        leagueTableContainer.querySelectorAll('.division-table').forEach(table => table.style.display = 'none');

        const activeTab = divisionTabsContainer.querySelector(`[data-division="${divisionKey}"]`);
        const activeTable = leagueTableContainer.querySelector(`[data-division-content="${divisionKey}"]`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeTable) activeTable.style.display = 'block';

        document.dispatchEvent(new CustomEvent('divisionChanged', { detail: divisionKey }));
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

                const matchesSnap = await fetchCollection('match_results');
                const allMatches = matchesSnap
                    .filter(m => m.season === seasonId)
                    .map(m => ({ 
                        ...m, 
                        awayTeamId: m.awayTeamId || m.awayTeamis,
                        scheduledDate: m.scheduledDate && typeof m.scheduledDate.toDate === 'function' ? m.scheduledDate.toDate() : (m.scheduledDate ? new Date(m.scheduledDate) : new Date())
                    }));

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
                    const tableContainer = renderTable(divisionKey, divisionData, teamsMap, allMatches);
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

                if (sortedDivisionKeys.length > 0) {
                    document.dispatchEvent(new CustomEvent('divisionChanged', { detail: sortedDivisionKeys[0] }));
                }
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
