import { db } from './firebase.config.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const countdownElement = document.getElementById('countdown');
const countdownCard = document.getElementById('countdown-card');
let activeCountdownInterval = null;

// --- Helper Functions for Formatting ---
const formatDate = (date) => {
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

async function getNextCompetition(competitionType) {
    if (!competitionType) return { nextCompetition: null, nextCompetitionDate: null };

    const eventsRef = collection(db, 'events');
    const querySnapshot = await getDocs(eventsRef);
    
    let nextCompetition = null;
    let nextCompetitionDate = null;
    const now = new Date();
    
    querySnapshot.forEach(doc => {
        if (doc.id.includes(competitionType.toLowerCase()) && doc.id.includes('individual')) {
            const competition = doc.data();
            let competitionDate;

            if (competition.date && typeof competition.date.toDate === 'function') {
                competitionDate = competition.date.toDate();
            } else if (competition.date) {
                competitionDate = new Date(competition.date);
            }

            if (competitionDate && competitionDate > now) {
                if (!nextCompetitionDate || competitionDate < nextCompetitionDate) {
                    nextCompetitionDate = competitionDate;
                    nextCompetition = competition;
                }
            }
        }
    });

    return { nextCompetition, nextCompetitionDate };
}

function startCountdown(competition, targetDate) {
    if (activeCountdownInterval) {
        clearInterval(activeCountdownInterval);
    }
    
    const existingHeader = countdownCard.querySelector('h3');
    if (existingHeader) existingHeader.remove();
    
    const existingDateTime = countdownCard.querySelector('.competition-date-time');
    if (existingDateTime) existingDateTime.remove();

    if (!targetDate || !competition) {
        if(countdownElement) {
            countdownElement.innerHTML = `<p>No upcoming competition scheduled.</p>`;
        }
        return;
    }

    const eventNameElement = document.createElement('h3');
    eventNameElement.textContent = competition.name;
    countdownCard.insertBefore(eventNameElement, countdownElement);

    const dateTimeElement = document.createElement('p');
    dateTimeElement.className = 'competition-date-time';
    dateTimeElement.textContent = `${formatDate(targetDate)} at ${formatTime(targetDate)}`;
    countdownCard.insertBefore(dateTimeElement, countdownElement);

    activeCountdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            clearInterval(activeCountdownInterval);
            countdownElement.innerHTML = "<p>The competition has started!</p>";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.innerHTML = `
            <div>${days}<span>Days</span></div>
            <div>${hours}<span>Hours</span></div>
            <div>${minutes}<span>Minutes</span></div>
            <div>${seconds}<span>Seconds</span></div>
        `;
    }, 1000);
}

export async function updateCountdown(competitionType) {
    const { nextCompetition, nextCompetitionDate } = await getNextCompetition(competitionType);
    startCountdown(nextCompetition, nextCompetitionDate);
}
