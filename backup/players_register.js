import { db, collection, getDocs } from './firebase.config.js';

const playersPageContainer = document.getElementById('players-table-container');
if (playersPageContainer) {
    let allPlayers = [];
    const allTeams = new Map();
    let sortState = { column: 'fullName', direction: 'asc' };

    const teamFilter = document.getElementById('team-filter');
    const excludeExpiredFilter = document.getElementById('exclude-expired-filter');
    const expiringSoonFilter = document.getElementById('expiring-soon-filter');

    const parseDate = (dateInput) => {
        if (!dateInput) return null;
    
        // Firestore timestamp
        if (dateInput.seconds) {
            return new Date(dateInput.seconds * 1000);
        }
    
        // dd/mm/yyyy string
        if (typeof dateInput === 'string') {
            const parts = dateInput.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                const year = parseInt(parts[2], 10);
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                     const fullYear = year < 100 ? 2000 + year : year;
                     return new Date(fullYear, month, day);
                }
            }
        }
        
        // Fallback for other string formats (e.g., ISO) or numbers
        const d = new Date(dateInput);
        if (d instanceof Date && !isNaN(d.getTime())) {
            return d;
        }
    
        return null; // Return null if parsing fails
    };

    const formatDate = (dateInput) => {
        const date = parseDate(dateInput);
        if (!date) return 'N/A';

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, ' ');
    };

    const calculateExpiry = (expiryDateStr) => {
        if (!expiryDateStr) return { daysUntilExpiry: Infinity, expiryStatus: 'N/A' };
        
        const expiryDate = parseDate(expiryDateStr);
        if (!expiryDate) return { daysUntilExpiry: Infinity, expiryStatus: 'Invalid Date' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const timeDiff = expiryDate.getTime() - today.getTime();
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const status = days < 0 ? 'Expired' : 'Active';
        
        return { daysUntilExpiry: days, expiryStatus: status };
    };

    const fetchPlayersAndTeams = async () => {
        try {
            const [playersSnapshot, teamsSnapshot] = await Promise.all([
                getDocs(collection(db, "players_public")),
                getDocs(collection(db, "teams"))
            ]);

            teamsSnapshot.forEach(doc => {
                allTeams.set(doc.id, doc.data().name || 'Unknown Team');
            });

            const activeTeamIds = new Set();
            allPlayers = playersSnapshot.docs.map(doc => {
                const data = doc.data();
                activeTeamIds.add(data.teamId);
                const expiryInfo = calculateExpiry(data.registerExpiry);
                return {
                    ...data,
                    id: doc.id,
                    fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                    teamName: allTeams.get(data.teamId) || 'N/A',
                    ...expiryInfo
                };
            });
            
            populateTeamFilter(activeTeamIds);
            renderTable();
        } catch (error) {
            console.error("Error fetching data:", error);
            playersPageContainer.innerHTML = '<p>Error loading player data.</p>';
        }
    };

    const populateTeamFilter = (activeTeamIds) => {
        const teamsWithPlayers = Array.from(allTeams.entries())
            .filter(([id, name]) => activeTeamIds.has(id))
            .sort((a, b) => a[1].localeCompare(b[1]));

        teamsWithPlayers.forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            teamFilter.appendChild(option);
        });
    };

    const renderTable = () => {
        let filteredPlayers = [...allPlayers];

        if (teamFilter.value) {
            filteredPlayers = filteredPlayers.filter(p => p.teamId === teamFilter.value);
        }
        if (excludeExpiredFilter.checked) {
            filteredPlayers = filteredPlayers.filter(p => p.expiryStatus !== 'Expired');
        }
        if (expiringSoonFilter.checked) {
            filteredPlayers = filteredPlayers.filter(p => p.daysUntilExpiry >= 0 && p.daysUntilExpiry <= 30);
        }

        filteredPlayers.sort((a, b) => {
            const valA = a[sortState.column] ?? '';
            const valB = b[sortState.column] ?? '';
            let comparison = 0;
            if (sortState.column === 'daysUntilExpiry') {
                const numA = (valA === Infinity || valA === null) ? Number.MAX_SAFE_INTEGER : valA;
                const numB = (valB === Infinity || valB === null) ? Number.MAX_SAFE_INTEGER : valB;
                comparison = numA - numB;
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            } else {
                comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            }
            return sortState.direction === 'asc' ? comparison : -comparison;
        });

        playersPageContainer.innerHTML = '';
        const table = document.createElement('table');
        table.innerHTML = `
          <thead>
            <tr>
              <th data-sort-key="fullName">Player Name</th>
              <th data-sort-key="teamName">Team</th>
              <th data-sort-key="registerDate">Registration Date</th>
              <th data-sort-key="recentFixture">Recent Fixture</th>
              <th data-sort-key="registerExpiry">Registration Expiry</th>
              <th data-sort-key="daysUntilExpiry">Days to Expiry</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        if (filteredPlayers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No players match the current filters.</td></tr>';
        } else {
            filteredPlayers.forEach(player => {
                const isExpired = player.expiryStatus === 'Expired';
                const rowClass = isExpired ? 'class="expired-player"' : '';
                const daysCell = isExpired ? 'Expired' : (player.daysUntilExpiry === Infinity ? 'N/A' : player.daysUntilExpiry);

                const row = `
                  <tr ${rowClass}>
                    <td>${player.fullName}</td>
                    <td>${player.teamName}</td>
                    <td>${formatDate(player.registerDate)}</td>
                    <td>${formatDate(player.recentFixture)}</td>
                    <td>${formatDate(player.registerExpiry)}</td>
                    <td>${daysCell}</td>
                  </tr>
                `;
                tbody.innerHTML += row;
            });
        }
        
        table.querySelectorAll('th').forEach(th => {
            if (th.dataset.sortKey === sortState.column) {
                th.classList.add(sortState.direction);
            }
            th.addEventListener('click', handleSort);
        });
        
        playersPageContainer.appendChild(table);
    };
  
    const handleSort = (e) => {
        const newColumn = e.target.dataset.sortKey;
        if (!newColumn) return;

        if (sortState.column === newColumn) {
            sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.column = newColumn;
            sortState.direction = 'asc';
        }
        renderTable();
    };

    teamFilter.addEventListener('change', renderTable);
    excludeExpiredFilter.addEventListener('change', renderTable);
    expiringSoonFilter.addEventListener('change', renderTable);

    fetchPlayersAndTeams();
}
