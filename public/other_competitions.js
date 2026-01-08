
import { db, collection, getDocs, doc, getDoc, query, where, orderBy, limit } from './firebase.config.js';

const competitionTabsContainer = document.getElementById('competition-tabs-container');
const overviewContent = document.getElementById('overview-content');
const competitionContentContainer = document.getElementById('competition-content-container');
const competitionDatesContainer = document.getElementById('competition-dates-container');

const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput.toDate) return dateInput.toDate(); // Handle Firestore Timestamps
    if (dateInput instanceof Date) return dateInput;
    try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;
        return d;
    } catch (e) {
        return null;
    }
};

const fetchAndRenderTabs = async () => {
    const tabList = document.createElement('div');
    tabList.className = 'tabs-main';

    const overviewTab = document.createElement('button');
    overviewTab.className = 'tab-link active';
    overviewTab.textContent = 'Overview';
    overviewTab.dataset.competitionId = 'overview';
    overviewTab.onclick = (e) => {
        e.preventDefault();
        switchTab('overview', 'Overview');
    };
    tabList.appendChild(overviewTab);

    try {
        const competitionsSnapshot = await getDocs(collection(db, "competitions"));
        
        competitionsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const type = data.type || data.Type || null;
            const competitionId = doc.id;
            let competitionName = data.competitionName || data.name || null;

            if (competitionName === "Open Pair's") {
                competitionName = "Open Pairs";
            }

            if (competitionName && typeof type === 'string' && (type.includes('Individual') || type.includes('Pairs'))) {
                const competitionTab = document.createElement('button');
                competitionTab.className = 'tab-link';
                competitionTab.textContent = competitionName;
                competitionTab.dataset.competitionId = competitionId;
                competitionTab.onclick = (e) => {
                    e.preventDefault();
                    switchTab(competitionId, competitionName);
                };
                tabList.appendChild(competitionTab);
            }
        });

    } catch (error) {
        console.error("Error fetching competitions for tabs:", error);
    }

    competitionTabsContainer.innerHTML = '';
    competitionTabsContainer.appendChild(tabList);

    // Check for a tab in the URL and switch to it
    const urlParams = new URLSearchParams(window.location.search);
    const tabId = urlParams.get('tab');

    if (tabId) {
        const tabButton = tabList.querySelector(`[data-competition-id='${tabId}']`);
        if (tabButton) {
            const competitionName = tabButton.textContent;
            switchTab(tabId, competitionName);
        } else {
            // Fallback to overview if tabId is invalid
            switchTab('overview', 'Overview');
        }
    } else {
        // Default to overview
        switchTab('overview', 'Overview');
    }
};

const fetchCompetitionDates = async () => {
    if(!competitionDatesContainer) return;
    competitionDatesContainer.innerHTML = '<h2>Competition Dates</h2>';
    try {
        const seasonQuery = await getDocs(query(collection(db, "seasons"), where("status", "==", "current"), limit(1)));
        if (seasonQuery.empty) {
            competitionDatesContainer.innerHTML += '<p>Current season not set.</p>';
            return;
        }
        const currentSeasonDoc = seasonQuery.docs[0];
        const seasonName = currentSeasonDoc.data().name;
        if (!seasonName) {
            competitionDatesContainer.innerHTML += '<p>Season data is incomplete.</p>';
            return;
        }
        competitionDatesContainer.innerHTML += `<h3>${seasonName}</h3>`;
        const eventsQuery = await getDocs(query(collection(db, "events"), where("season", "==", seasonName), where("registration", "==", true), orderBy("date")));
        renderCompetitionEvents(eventsQuery.docs);
    } catch (error) {
        console.error("Error fetching competition dates:", error);
        competitionDatesContainer.innerHTML += '<p>Error loading dates.</p>';
    }
};

const renderCompetitionEvents = (eventDocs) => {
    if (eventDocs.length === 0) {
        competitionDatesContainer.innerHTML += '<p>No competitions are currently open for registration.</p>';
        return;
    }
    const eventList = document.createElement('ul');
    eventList.className = 'competition-dates-list';
    eventDocs.forEach(doc => {
        const event = doc.data();
        const listItem = document.createElement('li');
        const eventDate = parseDate(event.date);
        const formattedDate = eventDate ? eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Date TBC';
        listItem.innerHTML = `<strong>${event.name}</strong><span>${formattedDate}</span>`;
        eventList.appendChild(listItem);
    });
    competitionDatesContainer.appendChild(eventList);
};

const fetchWinners = async (competitionId, competitionName) => {
    if(!competitionDatesContainer) return;
    competitionDatesContainer.innerHTML = `<h2>Past Winners</h2>`;
    try {
        const docSnap = await getDoc(doc(db, "winners", competitionId));
        if (docSnap.exists()) {
            const history = docSnap.data().history || [];
            renderWinners(history, competitionName);
        } else {
            renderWinners([], competitionName);
        }
    } catch (error) {
        console.error(`Error fetching winners for ${competitionName}:`, error);
        competitionDatesContainer.innerHTML += `<p>Could not load winners.</p>`;
    }
};

const renderWinners = (history, competitionName) => {
    if (history.length === 0) {
        competitionDatesContainer.innerHTML += `<p>No past winners found for ${competitionName}.</p>`;
        return;
    }
    const winnersList = document.createElement('ul');
    winnersList.className = 'winners-list';
    history.sort((a, b) => (b.season || "").localeCompare(a.season || ""));
    history.forEach(entry => {
        if(entry.season && entry.winner){
            const listItem = document.createElement('li');
            let winnerText;
            if (typeof entry.winner === 'object' && entry.winner.player1 && entry.winner.player2) {
                winnerText = `${entry.winner.player1} & ${entry.winner.player2}`;
            }
            else if (typeof entry.winner === 'object' && entry.winner.male && entry.winner.female) {
                winnerText = `${entry.winner.female} & ${entry.winner.male}`;
            } else {
                winnerText = entry.winner;
            }
            listItem.innerHTML = `<span class="season">${entry.season}</span><span class="winner">${winnerText}</span>`;
            winnersList.appendChild(listItem);
        }
    });
    competitionDatesContainer.appendChild(winnersList);
};

const fetchCompetitionDetails = async (competitionName, competitionId) => {
    if (!competitionContentContainer) return;

    competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Loading details...</p>`;

    try {
        // Determine the current season
        const seasonQuery = await getDocs(query(collection(db, "seasons"), where("status", "==", "current"), limit(1)));
        if (seasonQuery.empty) {
            competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Current season not configured.</p>`;
            return;
        }
        const seasonName = seasonQuery.docs[0].data().name;

        // Fetch event details to find the correct registration document ID
        const eventsQuery = await getDocs(query(collection(db, "events"), where("season", "==", seasonName), where("name", "==", competitionName), limit(1)));

        let eventData = null;
        let registrations = [];

        if (!eventsQuery.empty) {
            const eventDoc = eventsQuery.docs[0];
            eventData = eventDoc.data();
            const registrationId = eventDoc.id;

            // Fetch registrations using the event document ID
            const registrationDocRef = doc(db, 'competition-registrations', registrationId);
            const registrationDocSnap = await getDoc(registrationDocRef);

            if (registrationDocSnap.exists() && registrationDocSnap.data().entries) {
                registrations = registrationDocSnap.data().entries;
            }
        }

        renderCompetitionDetails(eventData, competitionName, registrations, competitionId);
    } catch (error) {
        console.error(`Error fetching details for ${competitionName}:`, error);
        competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Could not load competition details.</p>`;
    }
};

const renderCompetitionDetails = (eventData, competitionName, registrations, competitionId) => {
    let contentHTML = `<h2>${competitionName}</h2>`;

    if (eventData) {
        const competitionDate = eventData.date ? parseDate(eventData.date) : null;
        
        // Calculate registration close date as 7 days before the competition date
        let registrationClosedDate = null;
        if (competitionDate) {
            registrationClosedDate = new Date(competitionDate);
            registrationClosedDate.setDate(registrationClosedDate.getDate() - 7);
        }

        const formattedCompetitionDate = competitionDate ? competitionDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';
        const formattedRegistrationDate = registrationClosedDate ? registrationClosedDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';

        contentHTML += `
            <div class="competition-details">
                <p><strong>Competition Date:</strong> ${formattedCompetitionDate}</p>
                <p><strong>Registration Closes:</strong> ${formattedRegistrationDate}</p>
                <p><strong>Tournament Draw:</strong> Not yet available</p>
            </div>
        `;
    } else {
        contentHTML += `<p>Details for this competition have not been scheduled for the current season yet.</p>`;
    }

    competitionContentContainer.innerHTML = contentHTML;

    // Render registrations section
    const registrationSection = document.createElement('div');
    registrationSection.className = 'registrations-section';
    registrationSection.innerHTML = '<h3>Current Entrants</h3>';
    
    if (registrations && registrations.length > 0) {
        const registrationList = document.createElement('ul');
        registrationList.className = 'registration-list';

        const sortedRegistrations = [...registrations].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

        sortedRegistrations.forEach(entry => {
            const listItem = document.createElement('li');

            // Player 1
            let player1HTML;
            const player1Team = entry.player1Team ? ` (${entry.player1Team})` : '';
            if (entry.player1PublicId) {
                player1HTML = `<span class="player-name">${entry.player1Name}</span>${player1Team}`;
            } else {
                player1HTML = `${entry.player1Name}${player1Team}`;
            }

            // Player 2 (check if it exists for pairs competitions)
            if (entry.player2Name) {
                let player2HTML;
                const player2Team = entry.player2Team ? ` (${entry.player2Team})` : '';
                if (entry.player2PublicId) {
                    player2HTML = `<span class="player-name">${entry.player2Name}</span>${player2Team}`;
                } else {
                    player2HTML = `${entry.player2Name}${player2Team}`;
                }
                listItem.innerHTML = `<span>${player1HTML} & ${player2HTML}</span>`;
            } else {
                // Only display Player 1 for singles competitions
                listItem.innerHTML = `<span>${player1HTML}</span>`;
            }

            registrationList.appendChild(listItem);
        });

        registrationSection.appendChild(registrationList);
    } else {
        const noRegistrations = document.createElement('p');
        noRegistrations.textContent = 'No-one has registered for this competition yet.';
        registrationSection.appendChild(noRegistrations);
    }
    competitionContentContainer.appendChild(registrationSection);
};


const switchTab = (competitionId, competitionName) => {
    const allTabs = competitionTabsContainer.querySelectorAll('.tab-link');
    allTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.competitionId === competitionId);
    });

    if (competitionId === "overview") {
        if (overviewContent) overviewContent.style.display = 'block';
        if (competitionContentContainer) competitionContentContainer.style.display = 'none';
        fetchCompetitionDates();
    } else {
        if (overviewContent) overviewContent.style.display = 'none';
        if (competitionContentContainer) competitionContentContainer.style.display = 'block';
        fetchCompetitionDetails(competitionName, competitionId);
        fetchWinners(competitionId, competitionName);
    }
};

// Initial Load
fetchAndRenderTabs();
