import { db, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from '../firebase.config.js';

// --- Scaling Logic ---
function scaleContent() {
    const scalingContent = document.getElementById('scaling-content');
    if (!scalingContent) return;

    const contentWidth = scalingContent.offsetWidth;
    const contentHeight = scalingContent.offsetHeight;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;

    const scale = Math.min(scaleX, scaleY);

    scalingContent.style.transform = `scale(${scale})`;
}

// --- Firestore and Fixture Logic ---
async function getTeamName(teamId) {
    if (typeof teamId === 'string' && teamId.startsWith('Display')) {
        const displayText = teamId.match(/\[(.*?)\]/);
        return displayText ? displayText[1] : "TBD";
    }
    try {
        const teamDocRef = doc(db, "teams", teamId);
        const teamDocSnap = await getDoc(teamDocRef);
        return teamDocSnap.exists() ? teamDocSnap.data().name : "Unknown Team";
    } catch (error) {
        return "Unknown Team";
    }
}

async function getCompetitionName(competitionId) {
    if (!competitionId) return null;
    const compDocRef = doc(db, "competitions", competitionId);
    const compDocSnap = await getDoc(compDocRef);
    return compDocSnap.exists() ? compDocSnap.data().name : null;
}

async function getNextFixtures() {
    const fixturesCollection = collection(db, "match_results");
    const q = query(fixturesCollection, where("status", "==", "scheduled"), orderBy("scheduledDate"), limit(3));
    const querySnapshot = await getDocs(q);
    const fixtures = [];
    querySnapshot.forEach((doc) => fixtures.push({ id: doc.id, ...doc.data() }));
    return fixtures;
}

async function displayFixtures() {
    const fixtures = await getNextFixtures();
    const container = document.querySelector('.left-buttons');
    if (!container) return;

    container.innerHTML = ''; // Clear existing content

    for (const fixture of fixtures) {
        const homeTeamName = await getTeamName(fixture.homeTeamId);
        const awayTeamName = await getTeamName(fixture.awayTeamId);
        const competitionName = await getCompetitionName(fixture.division);

        const date = new Date(fixture.scheduledDate.seconds * 1000).toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let competitionInfo = [competitionName, fixture.round].filter(Boolean).join(' - ');

        // Create the main card container
        const fixtureCard = document.createElement('div');
        fixtureCard.className = 'fixture-card';

        // Set the inner HTML of the card, with the link inside
        fixtureCard.innerHTML = `
            <a href="game.html?matchId=${fixture.id}" class="card-link">
                <div class="fixture-date">${date}</div>
                ${competitionInfo ? `<div class="fixture-competition">${competitionInfo}</div>` : ''}
                <div class="fixture-teams">
                    <span class="team-name">${homeTeamName}</span>
                    <span class="vs">v</span>
                    <span class="team-name">${awayTeamName}</span>
                </div>
            </a>
        `;
        
        // Append the card to the container
        container.appendChild(fixtureCard);
    }
    // After fixtures are displayed, calculate the initial scale
    scaleContent();
}

// --- Event Listeners ---
window.addEventListener('resize', scaleContent);
document.addEventListener('DOMContentLoaded', displayFixtures);
