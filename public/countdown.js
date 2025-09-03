import { db } from './firebase.config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const countdownElement = document.getElementById('countdown');
const countdownCard = document.getElementById('countdown-card');

async function getNextEvent() {
    console.log("Fetching events...");
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('registration', '==', true));
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} events with open registration.`);
    
    let nextEvent = null;
    let nextEventDate = null;
    const now = new Date();
    console.log("Current time:", now.toString());


    querySnapshot.forEach(doc => {
        const event = doc.data();
        let eventDate;

        // Check if event.date is a Firestore Timestamp and convert it
        if (event.date && typeof event.date.toDate === 'function') {
            eventDate = event.date.toDate();
        } else {
            // Otherwise, parse it as a standard date string
            eventDate = new Date(event.date);
        }
        
        console.log(`Processing event: ${event.name}, Raw Date: ${event.date}, Parsed Date: ${eventDate.toString()}`);
        console.log(`Is event date in the future? ${eventDate > now}`);

        if (eventDate > now) {
            if (!nextEventDate || eventDate < nextEventDate) {
                nextEventDate = eventDate;
                nextEvent = event;
            }
        }
    });

    if (nextEvent) {
        console.log(`Next upcoming event is ${nextEvent.name} on ${nextEventDate}`);
    } else {
        console.log("No upcoming events found. All events with open registration may be in the past.");
    }

    return { nextEvent, nextEventDate };
}

function startCountdown(event, targetDate) {
    if (!targetDate) {
        countdownElement.innerHTML = "<p>No upcoming events with open registration.</p>";
        return;
    }

    const eventNameElement = document.createElement('h3');
    eventNameElement.textContent = event.name;
    countdownCard.insertBefore(eventNameElement, countdownElement);


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
    const { nextEvent, nextEventDate } = await getNextEvent();
    startCountdown(nextEvent, nextEventDate);
});
