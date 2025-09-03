import { db, collection, getDocs, query, where } from './firebase.config.js';

const committeeGrid = document.querySelector('.committee-grid');

// Define the custom sort order for committee roles
const roleOrder = [
    'President',
    'Vice-President',
    'Fixtures Secretary',
    'Treasurer',
    'Secretary',
    'Ordinary Member'
];

// Helper function to get the highest priority role index for a member
const getHighestPriorityIndex = (committeeRoles) => {
    if (!committeeRoles) return roleOrder.length; // Default to lowest priority
    const roles = committeeRoles.split(',').map(r => r.trim());
    let highestPriority = roleOrder.length;
    roles.forEach(role => {
        const index = roleOrder.indexOf(role);
        if (index > -1 && index < highestPriority) {
            highestPriority = index;
        }
    });
    return highestPriority;
};


if (committeeGrid) {
    const loadCommittee = async () => {
        try {
            // Fetch both players and teams at the same time for efficiency
            const [playersSnapshot, teamsSnapshot] = await Promise.all([
                getDocs(query(collection(db, 'players_public'), where('committee', '>', ''))),
                getDocs(collection(db, 'teams'))
            ]);

            // Create a lookup map for team IDs to team names
            const teamsMap = new Map();
            teamsSnapshot.forEach(doc => {
                teamsMap.set(doc.id, doc.data().name || 'Unknown Team');
            });

            if (playersSnapshot.empty) {
                committeeGrid.innerHTML = '<p>No committee members found.</p>';
                return;
            }

            // Convert player snapshot to a sortable array
            const members = [];
            playersSnapshot.forEach(doc => {
                members.push(doc.data());
            });

            // Sort the array based on the custom role order
            members.sort((a, b) => {
                const priorityA = getHighestPriorityIndex(a.committee);
                const priorityB = getHighestPriorityIndex(b.committee);
                return priorityA - priorityB;
            });

            committeeGrid.innerHTML = ''; // Clear the "loading" message

            // Render the sorted members
            members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'member-card';
                const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
                const teamName = member.teamId ? teamsMap.get(member.teamId) : null;

                card.innerHTML = `
                    <h3>${fullName || 'N/A'}</h3>
                    ${teamName ? `<p class="team-subtitle">${teamName}</p>` : ''}
                    <p class="role">${member.committee || 'Committee Member'}</p>
                    ${member.email ? `<p class="email"><a href="mailto:${member.email}">${member.email}</a></p>` : ''}
                `;
                committeeGrid.appendChild(card);
            });

        } catch (error) {
            console.error("Error loading committee members:", error);
            committeeGrid.innerHTML = '<p>Error loading committee members.</p>';
        }
    };

    loadCommittee();
}
