import { firebaseConfig } from './firebase.config.js'; // Corrected path

try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

const playersPageContainer = document.getElementById('players-table-container');
if (playersPageContainer) {
    let allPlayers = [];
    const allTeams = new Map();
    let sortState = { column: 'fullName', direction: 'asc' };

    const teamFilter = document.getElementById('team-filter');
    const excludeExpiredFilter = document.getElementById('exclude-expired-filter');
    const expiringSoonFilter = document.getElementById('expiring-soon-filter');

    const fetchPlayersAndTeams = async () => {
        try {
            const [playersSnapshot, teamsSnapshot] = await Promise.all([
                db.collection("players_public").get(),
                db.collection("teams").get()
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

    const calculateExpiry = (expiryDateStr) => {
        if (!expiryDateStr) return { daysUntilExpiry: Infinity, expiryStatus: 'N/A' };
        const expiryDate = new Date(expiryDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(expiryDate.getTime())) return { daysUntilExpiry: Infinity, expiryStatus: 'Invalid Date' };

        if (expiryDate < today) {
            return { daysUntilExpiry: -1, expiryStatus: 'Expired' };
        }
        
        const timeDiff = expiryDate.getTime() - today.getTime();
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return { daysUntilExpiry: days, expiryStatus: 'Active' };
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
            if (typeof valA === 'number' && typeof valB === 'number') {
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
              <th data-sort-key="role">Role</th>
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
            tbody.innerHTML = '<tr><td colspan="7">No players match the current filters.</td></tr>';
        } else {
            filteredPlayers.forEach(player => {
                const row = `
                  <tr>
                    <td>${player.fullName}</td>
                    <td>${player.role || 'N/A'}</td>
                    <td>${player.teamName}</td>
                    <td>${player.registerDate || 'N/A'}</td>
                    <td>${player.recentFixture || 'N/A'}</td>
                    <td>${player.registerExpiry || 'N/A'}</td>
                    <td>${player.expiryStatus === 'Expired' ? 'Expired' : (player.daysUntilExpiry === Infinity ? 'N/A' : player.daysUntilExpiry)}</td>
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
