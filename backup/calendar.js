import { firebaseConfig } from './firebase.config.js';

try {
  firebase.initializeApp(firebaseConfig);
} catch (error) {
  if (!error.message.includes("already exists")) {
    console.error("Error initializing Firebase:", error);
  }
}
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const scheduleContainer = document.getElementById('schedule-container');
    const monthYearDisplay = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    if (!scheduleContainer || !monthYearDisplay || !prevMonthBtn || !nextMonthBtn) {
        console.error("Calendar elements not found.");
        return;
    }

    let currentDate = new Date();

    const fetchFixtures = async (startDate, endDate) => {
        try {
            const snapshot = await db.collection('fixtures')
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .orderBy('date')
                .get();
            
            const fixturesByDate = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const fixtureDate = data.date.toDate().toISOString().split('T')[0];
                if (!fixturesByDate[fixtureDate]) {
                    fixturesByDate[fixtureDate] = [];
                }
                fixturesByDate[fixtureDate].push({ ...data, type: 'fixture' });
            });
            return fixturesByDate;
        } catch (error) {
            console.error("Error fetching fixtures:", error);
            return {};
        }
    };
    
    const fetchEvents = async (startDate, endDate) => {
        try {
            const snapshot = await db.collection('events')
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .orderBy('date')
                .get();
            
            const eventsByDate = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const eventDate = data.date.toDate();
                const dateStr = eventDate.toISOString().split('T')[0];
                if (!eventsByDate[dateStr]) {
                    eventsByDate[dateStr] = [];
                }
                eventsByDate[dateStr].push({
                    type: 'event',
                    name: data.name,
                    time: eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                });
            });
            return eventsByDate;
        } catch (error) {
            console.error("Error fetching events:", error);
            return {};
        }
    };

    const renderSchedule = async () => {
        scheduleContainer.innerHTML = 'Loading...';
        monthYearDisplay.textContent = currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const [fixturesByDate, eventsByDate] = await Promise.all([
            fetchFixtures(firstDayOfMonth, lastDayOfMonth),
            fetchEvents(firstDayOfMonth, lastDayOfMonth)
        ]);

        scheduleContainer.innerHTML = ''; 

        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const currentDay = new Date(year, month, day);
            const dateStr = currentDay.toISOString().split('T')[0];
            const dayOfWeek = currentDay.getDay();

            const dayFixtures = fixturesByDate[dateStr] || [];
            const dayEvents = eventsByDate[dateStr] || [];
            const allItems = [...dayFixtures, ...dayEvents];

            // Helper to parse different time formats for sorting
            const parseTime = (timeStr) => {
                const lowerTime = timeStr.toLowerCase().replace(/\s/g, '');
                let [time, modifier] = lowerTime.split(/(am|pm)/);
                let [hours, minutes] = time.split(':').map(Number);
                if (modifier === 'pm' && hours < 12) hours += 12;
                if (modifier === 'am' && hours === 12) hours = 0;
                return hours * 60 + (minutes || 0);
            };
            
            allItems.sort((a, b) => parseTime(a.time) - parseTime(b.time));

            const dayElement = document.createElement('div');
            dayElement.className = 'schedule-day';

            const dateElement = document.createElement('div');
            dateElement.className = 'schedule-day-date';
            dateElement.innerHTML = `${currentDay.toLocaleDateString('en-US', { weekday: 'short' })}<br>${currentDay.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
            
            const eventsElement = document.createElement('div');
            eventsElement.className = 'schedule-day-events';
            
            if (allItems.length > 0) {
                allItems.forEach(item => {
                    const detailElement = document.createElement('div');
                    detailElement.className = 'schedule-event';
                    if (item.type === 'fixture') {
                        detailElement.innerHTML = `<strong>${item.time}:</strong> ${item.homeTeam} vs ${item.awayTeam} <em>(${item.division})</em>`;
                    } else {
                        detailElement.innerHTML = `<strong>${item.time}:</strong> ${item.name}`;
                    }
                    eventsElement.appendChild(detailElement);
                });
            } else {
                eventsElement.textContent = 'No fixtures or events scheduled.';
            }

            const availabilityElement = document.createElement('div');
            availabilityElement.className = 'schedule-day-availability';

            const isWeekdayWithSlots = dayOfWeek >= 1 && dayOfWeek <= 4;
            if (isWeekdayWithSlots) {
                const allPossibleSlots = ['7:00pm', '8:00pm', '9:00pm'];
                const usedFixtureTimes = dayFixtures.map(f => f.time);
                const availableSlots = allPossibleSlots.filter(slot => !usedFixtureTimes.includes(slot));
                
                if (availableSlots.length > 0) {
                    const availabilityCount = document.createElement('a');
                    availabilityCount.className = 'availability-count';
                    availabilityCount.textContent = `${availableSlots.length} spare slot${availableSlots.length > 1 ? 's' : ''}: ${availableSlots.join(', ')}`;
                    availabilityCount.href = `mailto:contact@sarniaskittles.com?subject=Fixture Slot Enquiry for ${dateStr}`;
                    availabilityElement.appendChild(availabilityCount);
                } else {
                    availabilityElement.innerHTML = '<span class="no-availability">Fully booked</span>';
                }
            } else {
                availabilityElement.innerHTML = '<span class="no-availability">No slots available</span>';
            }
            
            dayElement.appendChild(dateElement);
            dayElement.appendChild(eventsElement);
            dayElement.appendChild(availabilityElement);
            scheduleContainer.appendChild(dayElement);
        }
    };

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderSchedule();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderSchedule();
    });

    renderSchedule();
});
