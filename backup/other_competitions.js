import { firebaseConfig } from './firebase.config.js';

try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

const competitionTabsContainer = document.getElementById('competition-tabs-container');
const overviewContent = document.getElementById('overview-content');
const competitionContentContainer = document.getElementById('competition-content-container');
const competitionDatesContainer = document.getElementById('competition-dates-container');

const parseDate = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput.toDate) return dateInput.toDate(); 
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
    tabList.className = 'tabs main-tabs';

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
        const competitionsSnapshot = await db.collection("competitions").get();
        
        competitionsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const type = data.type || data.Type || null;
            const competitionId = doc.id;
            const competitionName = data.competitionName || data.name || null;

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

    switchTab('overview', 'Overview');
};

const fetchCompetitionDates = async () => {
    competitionDatesContainer.innerHTML = '<h2>Competition Dates</h2>';
    try {
        const seasonQuery = await db.collection("seasons").where("status", "==", "current").limit(1).get();
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
        const eventsQuery = await db.collection("events").where("season", "==", seasonName).where("registration", "==", true).orderBy("date").get();
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
    competitionDatesContainer.innerHTML = `<h2>Past Winners</h2>`;
    try {
        const doc = await db.collection("winners").doc(competitionId).get();
        if (doc.exists) {
            const history = doc.data().history || [];
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
            listItem.innerHTML = `<span class="season">${entry.season}</span><span class="winner">${entry.winner}</span>`;
            winnersList.appendChild(listItem);
        }
    });
    competitionDatesContainer.appendChild(winnersList);
};

const fetchCompetitionDetails = async (competitionName) => {
    competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Loading details...</p>`;
    try {
        const seasonQuery = await db.collection("seasons").where("status", "==", "current").limit(1).get();
        if (seasonQuery.empty) {
            competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Could not determine the current season.</p>`;
            return;
        }
        const seasonName = seasonQuery.docs[0].data().name;

        const eventsQuery = await db.collection("events")
            .where("season", "==", seasonName)
            .where("name", "==", competitionName)
            .limit(1)
            .get();

        if (eventsQuery.empty) {
            competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Details for this competition have not been scheduled for the current season yet.</p>`;
            return;
        }
        
        const eventData = eventsQuery.docs[0].data();
        renderCompetitionDetails(eventData, competitionName);
    } catch (error) {
        console.error(`Error fetching details for ${competitionName}:`, error);
        competitionContentContainer.innerHTML = `<h2>${competitionName}</h2><p>Could not load competition details.</p>`;
    }
};

const renderCompetitionDetails = (eventData, competitionName) => {
    const competitionDate = eventData.date ? parseDate(eventData.date) : null;
    const registrationClosedDate = eventData.registrationClosed ? parseDate(eventData.registrationClosed) : null;

    const formattedCompetitionDate = competitionDate
        ? competitionDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'To be confirmed';

    const formattedRegistrationDate = registrationClosedDate
        ? registrationClosedDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'To be confirmed';

    const contentHTML = `
        <h2>${competitionName}</h2>
        <div class="competition-details">
            <p><strong>Competition Date:</strong> ${formattedCompetitionDate}</p>
            <p><strong>Registration Closes:</strong> ${formattedRegistrationDate}</p>
            <p><strong>Tournament Draw:</strong> Not yet available</p>
        </div>
    `;
    competitionContentContainer.innerHTML = contentHTML;
};

const switchTab = (competitionId, competitionName) => {
    const allTabs = competitionTabsContainer.querySelectorAll('.tab-link');
    allTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.competitionId === competitionId);
    });

    if (competitionId === "overview") {
        overviewContent.style.display = 'block';
        competitionContentContainer.style.display = 'none';
        fetchCompetitionDates();
    } else {
        overviewContent.style.display = 'none';
        competitionContentContainer.style.display = 'block';
        fetchCompetitionDetails(competitionName);
        fetchWinners(competitionId, competitionName);
    }
};

// Initial Load
fetchAndRenderTabs();
