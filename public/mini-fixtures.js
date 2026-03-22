import { db, collection, getDocs, query, where } from './firebase.config.js';

const miniResultsContainer = document.getElementById('mini-results-list');
const miniFixturesContainer = document.getElementById('mini-fixtures-list');
const miniPostponedContainer = document.getElementById('mini-postponed-list');

if (miniResultsContainer && miniFixturesContainer) {

    const teamCache = new Map();

    const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const d = new Date(date);
        return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    const getTeamName = (teamIdentifier) => {
        if (typeof teamIdentifier === 'string' && teamIdentifier.startsWith('Display[')) {
            const startIndex = teamIdentifier.indexOf('[') + 1;
            const endIndex = teamIdentifier.indexOf(']');
            return teamIdentifier.substring(startIndex, endIndex);
        }
        return teamCache.get(teamIdentifier) || "Unknown Team";
    };

    const createCell = (text, classList = []) => {
        const cell = document.createElement('td');
        cell.innerHTML = text; /* Use innerHTML so <strong> tags render correctly */
        classList.forEach(c => cell.classList.add(c));
        return cell;
    };

    const createHeaderCell = (text, classList = []) => {
        const cell = document.createElement('th');
        cell.textContent = text;
        classList.forEach(c => cell.classList.add(c));
        return cell;
    };

    const renderTable = (matches, isResults) => {
        const container = document.createElement('div');
        container.classList.add('table-container');
        // Reduce margin-block-start since we are displaying immediately under an h3
        container.style.marginTop = '0';

        if (!matches || matches.length === 0) {
            container.innerHTML = `<p style="padding: 10px; color: #666; font-style: italic;">No matches scheduled in this period.</p>`;
            return container;
        }

        const table = document.createElement('table');
        table.classList.add('styled-table', 'mini-table');

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        if (isResults) {
            headerRow.append(
                createHeaderCell('Date'),
                createHeaderCell('Time', ['centered-cell']),
                createHeaderCell('Home Team'),
                createHeaderCell('Score', ['centered-cell']),
                createHeaderCell('Away Team')
            );
        } else {
            headerRow.append(
                createHeaderCell('Date'),
                createHeaderCell('Time', ['centered-cell']),
                createHeaderCell('Home Team'),
                createHeaderCell('Away Team')
            );
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        let lastRenderedDate = null;
        
        matches.forEach((match) => {
            const row = document.createElement('tr');
            
            const dateObj = match.scheduledDate;
            const dateStr = formatDate(dateObj);
            
            let h = dateObj.getHours() % 12 || 12;
            const m = dateObj.getMinutes().toString().padStart(2, '0');
            const timeStr = `${h}:${m}`;

            const dateCellDisplay = (dateStr === lastRenderedDate) ? '' : dateStr;
            lastRenderedDate = dateStr;

            const homeTeamName = getTeamName(match.homeTeamId);
            const awayTeamName = getTeamName(match.awayTeamId || match.awayTeamis);

            if (isResults) {
                const hasScore = match.homeScore != null && match.awayScore != null;
                const scoreStr = hasScore ? `${match.homeScore} - ${match.awayScore}` : 'P-P';
                
                let homeStrong = homeTeamName;
                let awayStrong = awayTeamName;
                if (hasScore) {
                    if (parseInt(match.homeScore) > parseInt(match.awayScore)) homeStrong = `<strong>${homeTeamName}</strong>`;
                    else if (parseInt(match.awayScore) > parseInt(match.homeScore)) awayStrong = `<strong>${awayTeamName}</strong>`;
                }
                
                row.append(
                    createCell(dateCellDisplay),
                    createCell(timeStr, ['centered-cell']),
                    createCell(homeStrong),
                    createCell(scoreStr, ['centered-cell', 'pts-col']),
                    createCell(awayStrong)
                );
            } else {
                row.append(
                    createCell(dateCellDisplay),
                    createCell(timeStr, ['centered-cell']),
                    createCell(homeTeamName),
                    createCell(awayTeamName)
                );
            }
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    };

    const loadData = async () => {
        miniResultsContainer.innerHTML = '<p>Loading results...</p>';
        miniFixturesContainer.innerHTML = '<p>Loading fixtures...</p>';

        try {
            // Populate team cache
            const teamsSnap = await getDocs(collection(db, "teams"));
            teamsSnap.forEach(doc => teamCache.set(doc.id, doc.data().name));

            // Determine current season exactly as mini-league.js does
            let season = '2025-26'; 
            const seasonsList = await getDocs(collection(db, "league_tables"));
            let seasonsArr = seasonsList.docs.map(d => d.id).sort((a,b) => b.localeCompare(a));
            if (seasonsArr.some(s => s === '2025-26')) season = '2025-26';
            else if (seasonsArr.length > 0) season = seasonsArr[0];

            // Note: Since Firestore requires complex composite indexing for date filtering,
            // we will query broadly by season and filter logic client-side since match pools are tiny (<500).
            const q = query(collection(db, "match_results"), where("season", "==", season));
            const snapshot = await getDocs(q);
            
            let allMatches = snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, scheduledDate: data.scheduledDate?.toDate() };
            }).filter(m => m.scheduledDate != null);

            let currentDivisionFilter = null;

            const renderBlocks = () => {
                let filteredMatches = allMatches;
                if (currentDivisionFilter) {
                    filteredMatches = allMatches.filter(m => m.division === currentDivisionFilter);
                }

                const now = new Date();
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(now.getDate() - 14);
                
                const fourteenDaysAhead = new Date();
                fourteenDaysAhead.setDate(now.getDate() + 14);

                const results = filteredMatches
                    .filter(m => m.scheduledDate >= fourteenDaysAgo && m.scheduledDate < now && (m.status === 'completed' || (m.homeScore != null && m.awayScore != null)))
                    .sort((a, b) => a.scheduledDate - b.scheduledDate); 

                const fixtures = filteredMatches
                    .filter(m => m.scheduledDate >= now && m.scheduledDate <= fourteenDaysAhead && (!m.status || m.status === 'scheduled' || m.status === 'rescheduled'))
                    .sort((a, b) => a.scheduledDate - b.scheduledDate);

                miniResultsContainer.innerHTML = '';
                miniFixturesContainer.innerHTML = '';

                miniResultsContainer.appendChild(renderTable(results, true));
                miniFixturesContainer.appendChild(renderTable(fixtures, false));

                if (miniPostponedContainer) {
                    const postponed = filteredMatches
                        .filter(m => m.status === 'postponed')
                        .sort((a, b) => a.scheduledDate - b.scheduledDate);
                        
                    miniPostponedContainer.innerHTML = '';
                    
                    if (postponed.length === 0) {
                        miniPostponedContainer.innerHTML = '<p style="padding: 10px; color: #666; font-style: italic;">No outstanding postponements.</p>';
                    } else {
                        const listDiv = document.createElement('div');
                        listDiv.style.display = 'flex';
                        listDiv.style.flexDirection = 'column';
                        
                        postponed.forEach(match => {
                            const homeName = getTeamName(match.homeTeamId);
                            const awayName = getTeamName(match.awayTeamId || match.awayTeamis);
                            const postponedByName = getTeamName(match.postponedBy);
                            
                            const msPerDay = 1000 * 60 * 60 * 24;
                            let daysNum = Math.floor((now - match.scheduledDate) / msPerDay);
                            let daysText = 'Postponed';
                            if (daysNum === 0) daysText = 'Today';
                            else if (daysNum === 1) daysText = '1 day';
                            else if (daysNum > 1) daysText = `${daysNum} days`;
                            else daysText = `Early (${Math.abs(daysNum)}d)`;

                            const itemDiv = document.createElement('div');
                            itemDiv.style.display = 'flex';
                            itemDiv.style.justifyContent = 'space-between';
                            itemDiv.style.alignItems = 'center';
                            itemDiv.style.padding = '10px 0';
                            itemDiv.style.borderBottom = '1px solid var(--light-grey)';
                            
                            itemDiv.innerHTML = `
                                <div style="font-size: 0.95rem; line-height: 1.3;">
                                    <strong>${homeName}</strong> v <strong>${awayName}</strong> 
                                    <span style="font-size: 0.8rem; color: var(--medium-grey); margin-left: 6px;">(by ${postponedByName})</span>
                                </div>
                                <div style="color: var(--danger); font-weight: bold; font-size: 0.85rem; white-space: nowrap; margin-left: 15px;">${daysText}</div>
                            `;
                            listDiv.appendChild(itemDiv);
                        });
                        if(listDiv.lastChild) listDiv.lastChild.style.borderBottom = 'none';
                        miniPostponedContainer.appendChild(listDiv);
                    }
                }
            };

            document.addEventListener('divisionChanged', (e) => {
                currentDivisionFilter = e.detail;
                renderBlocks();
            });

            renderBlocks();

        } catch (error) {
            console.error("Error loading mini fixtures/results:", error);
            miniResultsContainer.innerHTML = "<p>Error loading results data.</p>";
            miniFixturesContainer.innerHTML = "<p>Error loading fixtures data.</p>";
        }
    };

    loadData();
}
