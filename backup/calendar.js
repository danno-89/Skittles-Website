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

    const fetchMatchResults = async (startDate, endDate) => {
        try {
            const snapshot = await db.collection('match_results')
                .where('scheduledDate', '>=', startDate)
                .where('scheduledDate', '<=', endDate)
                .orderBy('scheduledDate')
                .get();
            
            const matchesByDate = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const matchDate = data.scheduledDate.toDate();
                const dateStr = `${matchDate.getUTCFullYear()}-${String(matchDate.getUTCMonth() + 1).padStart(2, '0')}-${String(matchDate.getUTCDate()).padStart(2, '0')}`;
                if (!matchesByDate[dateStr]) {
                    matchesByDate[dateStr] = [];
                }
                matchesByDate[dateStr].push({ 
                    ...data, 
                    type: 'fixture',
                    time: matchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })
                });
            });
            return matchesByDate;
        } catch (error) {
            console.error("Error fetching match results:", error);
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
                const dateStr = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eventDate.getUTCDate()).padStart(2, '0')}`;
                if (!eventsByDate[dateStr]) {
                    eventsByDate[dateStr] = [];
                }
                eventsByDate[dateStr].push({
                    type: 'event',
                    name: data.name,
                    time: eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' })
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
            year: 'numeric',
            timeZone: 'UTC'
        });

        const year = currentDate.getUTCFullYear();
        const month = currentDate.getUTCMonth();

        const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));

        const [matchesByDate, eventsByDate] = await Promise.all([
            fetchMatchResults(firstDayOfMonth, lastDayOfMonth),
            fetchEvents(firstDayOfMonth, lastDayOfMonth)
        ]);

        scheduleContainer.innerHTML = ''; 

        for (let day = 1; day <= lastDayOfMonth.getUTCDate(); day++) {
            const currentDay = new Date(Date.UTC(year, month, day));
            const dateStr = `${currentDay.getUTCFullYear()}-${String(currentDay.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDay.getUTCDate()).padStart(2, '0')}`;
            
            const dayMatches = matchesByDate[dateStr] || [];
            const dayEvents = eventsByDate[dateStr] || [];
            const allItems = [...dayMatches, ...dayEvents];
            
            const parseTime = (timeStr) => {
                if (!timeStr) return 0;
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
            dateElement.textContent = `${currentDay.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}, ${currentDay.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
            
            const eventsElement = document.createElement('div');
            eventsElement.className = 'schedule-day-events';
            
            if (allItems.length > 0) {
                allItems.forEach(item => {
                    const detailElement = document.createElement('div');
                    detailElement.className = 'schedule-event';
                    if (item.type === 'fixture') {
                        const homeTeamName = item.homeTeamName || (item.homeTeam ? item.homeTeam.name : 'TBC');
                        const awayTeamName = item.awayTeamName || (item.awayTeam ? item.awayTeam.name : 'TBC');
                        const divisionName = item.divisionName || (item.division ? item.division.name : 'N/A');
                        detailElement.innerHTML = `<strong>${item.time}:</strong> ${homeTeamName} vs ${awayTeamName} <em>(${divisionName})</em>`;
                    } else {
                        detailElement.innerHTML = `<strong>${item.time}:</strong> ${item.name}`;
                    }
                    eventsElement.appendChild(detailElement);
                });
            } else {
                eventsElement.textContent = '';
            }

            const availabilityElement = document.createElement('div');
            availabilityElement.className = 'schedule-day-availability';

            if (dayMatches.length > 0) {
                const dayOfWeek = currentDay.getUTCDay();
                const isWeekdayWithSlots = dayOfWeek >= 1 && dayOfWeek <= 4;

                if (isWeekdayWithSlots) {
                    const allPossibleSlots = ['7:00 PM', '8:00 PM', '9:00 PM'];
                    const usedFixtureTimes = dayMatches.map(f => f.time);
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
            }
            
            dayElement.appendChild(dateElement);
            dayElement.appendChild(eventsElement);
            dayElement.appendChild(availabilityElement);
            scheduleContainer.appendChild(dayElement);
        }
    };

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setUTCMonth(currentDate.getUTCMonth() - 1);
        renderSchedule();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
        renderSchedule();
    });

    renderSchedule();
});
