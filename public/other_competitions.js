import { db, collection, getDocs, doc, getDoc, query, orderBy, where } from './firebase.config.js';

let allTeamsData = {};

async function fetchTeams() {
    if (Object.keys(allTeamsData).length > 0) return;
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    teamsSnapshot.forEach(doc => {
        allTeamsData[doc.id] = doc.data();
    });
}

function getTeamName(teamId) {
    return allTeamsData[teamId]?.name || 'Unknown Team';
}

function formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return 'TBC';
    return timestamp.toDate().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatTime(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    return timestamp.toDate().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function renderCompetitionFixtures(fixtures, competitionName) {
    let html = `<h2>${competitionName}</h2>`;

    if (fixtures.length === 0) {
        html += '<p>No fixtures found for this competition.</p>';
        return html;
    }

    const fixturesByRound = fixtures.reduce((acc, fixture) => {
        const round = fixture.round || 'Fixtures';
        if (!acc[round]) {
            acc[round] = [];
        }
        acc[round].push(fixture);
        return acc;
    }, {});

    for (const round in fixturesByRound) {
        html += `<h3>${round}</h3>`;
        html += '<div class="table-container"><table class="results-table">';
        html += `<thead><tr><th>Date</th><th>Time</th><th>Home Team</th><th>Away Team</th><th>Score</th></tr></thead><tbody>`;

        fixturesByRound[round].forEach(fixture => {
            const homeScore = fixture.homeScore !== undefined ? fixture.homeScore : '-';
            const awayScore = fixture.awayScore !== undefined ? fixture.awayScore : '-';
            html += `
                <tr>
                    <td>${formatDate(fixture.scheduledDate)}</td>
                    <td>${formatTime(fixture.scheduledDate)}</td>
                    <td class="team-name">${getTeamName(fixture.homeTeamId)}</td>
                    <td class="team-name">${getTeamName(fixture.awayTeamId)}</td>
                    <td class="score-col">${homeScore} - ${awayScore}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
    }
    return html;
}

function switchTab(competitionId) {
    document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.competition-content').forEach(content => content.style.display = 'none');

    const activeTab = document.querySelector(`[data-competition="${competitionId}"]`);
    const activeContent = document.getElementById(competitionId);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.style.display = 'block';
}


async function loadCompetitions() {
    await fetchTeams();
    const competitionsContainer = document.getElementById('competitions-container');
    const tabsContainer = document.getElementById('competition-tabs-container');
    if (!competitionsContainer || !tabsContainer) return;

    competitionsContainer.innerHTML = '<p>Loading competitions...</p>';
    
    const competitionsQuery = query(
        collection(db, "competitions"), 
        where("type", "==", "knockout"),
        orderBy("order", "asc")
    );
    const competitionsSnapshot = await getDocs(competitionsQuery);

    if (competitionsSnapshot.empty) {
        competitionsContainer.innerHTML = '<p>No knockout competitions found.</p>';
        return;
    }
    
    competitionsContainer.innerHTML = '';
    tabsContainer.innerHTML = '';
    let isFirstTab = true;

    for (const docSnap of competitionsSnapshot.docs) {
        const competition = { id: docSnap.id, ...docSnap.data() };
        
        const tab = document.createElement('a');
        tab.className = 'tab-link';
        tab.dataset.competition = competition.id;
        tab.textContent = competition.name;
        tab.onclick = () => switchTab(competition.id);
        tabsContainer.appendChild(tab);
        
        const contentDiv = document.createElement('div');
        contentDiv.id = competition.id;
        contentDiv.className = 'competition-content';
        
        if (isFirstTab) {
            tab.classList.add('active');
            contentDiv.style.display = 'block';
            isFirstTab = false;
        } else {
            contentDiv.style.display = 'none';
        }
        
        const fixturesQuery = query(collection(db, "match_results"), where("division", "==", competition.id));
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixtures = fixturesSnapshot.docs..map(doc => doc.data());
        
        contentDiv.innerHTML = renderCompetitionFixtures(fixtures, competition.name);
        competitionsContainer.appendChild(contentDiv);
    }
}


document.addEventListener('DOMContentLoaded', loadCompetitions);
