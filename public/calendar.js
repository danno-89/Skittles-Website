import { firebaseConfig } from './firebase.config.js';

try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

const calendarGridContainer = document.getElementById('calendar-grid-container');
const currentMonthYearSpan = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

let currentCalendarDate = new Date(); 

// --- Main Calendar Rendering Logic ---
const renderCalendar = async () => {
    calendarGridContainer.innerHTML = `
        <div class="day-name">Sun</div>
        <div class="day-name">Mon</div>
        <div class="day-name">Tue</div>
        <div class="day-name">Wed</div>
        <div class="day-name">Thu</div>
        <div class="day-name">Fri</div>
        <div class="day-name">Sat</div>
    `;

    currentMonthYearSpan.textContent = currentCalendarDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        const blankDay = document.createElement('div');
        blankDay.className = 'calendar-day empty';
        calendarGridContainer.appendChild(blankDay);
    }

    const startOfMonth = new Date(year, month, 1); 
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999); 
    
    try {
        const eventsSnapshot = await db.collection("events")
                                       .where("date", ">=", startOfMonth)
                                       .where("date", "<=", endOfMonth)
                                       .orderBy("date", "asc")
                                       .get();
        
        const eventsByDay = {};
        for(const doc of eventsSnapshot.docs) {
            const event = doc.data();
            if (event.date) {
                let eventDate;
                if (event.date.toDate) {
                    eventDate = event.date.toDate();
                } else {
                    eventDate = new Date(event.date);
                }
                
                if (!isNaN(eventDate.getTime())) {
                    const dateKey = eventDate.toLocaleDateString('en-CA'); 
                    if (!eventsByDay[dateKey]) {
                        eventsByDay[dateKey] = [];
                    }
                    eventsByDay[dateKey].push(event);
                }
            }
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.innerHTML = `<div class="day-number">${day}</div>`;

            const currentDay = new Date(year, month, day);
            const dateKey = currentDay.toLocaleDateString('en-CA');

            if (eventsByDay[dateKey]) {
                const dayEvents = eventsByDay[dateKey];
                dayEvents.sort((a, b) => {
                    const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
                    const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
                    return dateA.getTime() - dateB.getTime();
                });

                for (const event of dayEvents) {
                    let eventTime;
                    if (event.date.toDate) {
                        eventTime = event.date.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    } else {
                        eventTime = new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    }
                    
                    const eventItem = document.createElement('div');
                    eventItem.className = 'calendar-event-item';
                    eventItem.innerHTML = `<span class="event-time">${eventTime}</span><span class="event-title">${event.title || event.name || event.id || 'Unnamed Event'}</span>`;
                    dayCell.appendChild(eventItem);
                }
            }
            calendarGridContainer.appendChild(dayCell);
        }
    } catch (error) {
        console.error("Error fetching events for calendar:", error);
        calendarGridContainer.innerHTML = '<p>Error loading calendar events. Please check console for details.</p>';
    }
};

prevMonthBtn.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
});

renderCalendar();
