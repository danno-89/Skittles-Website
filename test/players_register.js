import { firebaseConfig } from './firebase.config.js';

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

    const formatDate = (dateInput) => {
        if (!dateInput) return 'N/A';

        let date;
        // Check if the input is a Firestore timestamp object
        if (dateInput.seconds) {
            date = new Date(dateInput.seconds * 1000);
        }
        // Check if the input is a string or number that can be parsed
        else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            date = new Date(dateInput);
        }
        // If it's already a Date object, use it directly
        else if (dateInput instanceof Date) {
            date = dateInput;
        }
        // If the format is not recognized, return 'Invalid Date'
        else {
            return 'Invalid Date';
        }

        if (isNaN(date.getTime())) return 'Invalid Date';

        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: '2-digit'
        }).replace(/ /g, ' ');
    };

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

        const timeDiff = expiryDate.getTime() - today.getTime();
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const status = days < 0 ? 'Expired' : 'Active';
        
        return { daysUntilExpiry: days, expiryStatus: status };
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
