import { db } from './firebase.config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const countdownElement = document.getElementById('countdown');
const countdownCard = document.getElementById('countdown-card');

async function getNextEvent() {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('registration', '==', true));
    const querySnapshot = await getDocs(q);
    
    let nextEvent = null;
    let nextEventDate = null;
    const now = new Date();

    querySnapshot.forEach(doc => {
        const event = doc.data();
        let eventDate;

        if (event.date && typeof event.date.toDate === 'function') {
            eventDate = event.date.toDate();
        } else {
            eventDate = new Date(event.date);
        }
        
        if (eventDate > now) {
            if (!nextEventDate || eventDate < nextEventDate) {
                nextEventDate = eventDate;
                nextEvent = event;
            }
        }
    });

    return { nextEvent, nextEventDate };
}

function startCountdown(event, targetDate) {
    if (!targetDate || !event) {
        countdownElement.innerHTML = "<p>No upcoming events with open registration.</p>";
        // Hide the card if there's no event
        if (countdownCard) {
            countdownCard.style.display = 'none';
        }
        return;
    }

    const eventNameElement = document.createElement('h3');
    eventNameElement.textContent = event.name;
    // Check if an event name element already exists to avoid duplicates
    if (countdownCard && !countdownCard.querySelector('h3')) {
        countdownCard.insertBefore(eventNameElement, countdownElement);
    }


    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            clearInterval(interval);
            countdownElement.innerHTML = "<p>The event has started!</p>";
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

document.addEventListener('DOMContentLoaded', async () => {
    // A delay to ensure the DOM is fully ready, especially for included HTML.
    setTimeout(async () => {
        const { nextEvent, nextEventDate } = await getNextEvent();
        startCountdown(nextEvent, nextEventDate);
    }, 100);
});
