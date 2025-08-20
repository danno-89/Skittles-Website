import { db } from './firebase.config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('calendar-container');
    const monthTabsContainer = document.getElementById('month-tabs-container');
    const seasonFilter = document.getElementById('season-filter');

    if (!calendarContainer || !monthTabsContainer || !seasonFilter) {
        console.error("Calendar elements not found.");
        return;
    }

    let selectedMonthIndex = new Date().getMonth();

    const fetchCalendarData = async (startDate, endDate) => {
        const calendarData = {};
        const startString = startDate.toISOString();
        const endString = endDate.toISOString();

        const ensureDateEntry = (dateStr) => {
            if (!calendarData[dateStr]) {
                calendarData[dateStr] = { events: [], fixtures: {} };
            }
        };

        try {
            const q = query(collection(db, 'match_results'), where('scheduledDate', '>=', startString), where('scheduledDate', '<=', endString));
            const matchesSnapshot = await getDocs(q);
            
            matchesSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.status !== 'scheduled') return;

                const fixtureDate = new Date(data.scheduledDate);
                const dateStr = `${fixtureDate.getUTCFullYear()}-${String(fixtureDate.getUTCMonth() + 1).padStart(2, '0')}-${String(fixtureDate.getUTCDate()).padStart(2, '0')}`;
                ensureDateEntry(dateStr);
                
                const time = fixtureDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });
                const homeTeam = data.homeTeamName || 'TBC';
                const awayTeam = data.awayTeamName || 'TBC';
                calendarData[dateStr].fixtures[time] = `${homeTeam} vs ${awayTeam}`;
            });
        } catch (error) {
            console.error("Error fetching match_results:", error);
        }

        try {
            const q = query(collection(db, 'events'), where('date', '>=', new Date(startString)), where('date', '<=', new Date(endString)));
            const eventsSnapshot = await getDocs(q);

            eventsSnapshot.forEach(doc => {
                const data = doc.data();
                const eventDate = data.date.toDate();
                const dateStr = `${eventDate.getUTCFullYear()}-${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}-${String(eventDate.getUTCDate()).padStart(2, '0')}`;
                ensureDateEntry(dateStr);
                calendarData[dateStr].events.push({ type: 'general', description: data.name });
            });
        } catch (error) {
            console.error("Error fetching events:", error);
        }
        
        return calendarData;
    };

    const renderMonthTabs = () => {
        monthTabsContainer.innerHTML = '';
        monthTabsContainer.className = 'tabs-main';
        const seasonMonths = [
            { name: "Jul", index: 6 }, { name: "Aug", index: 7 }, { name: "Sep", index: 8 },
            { name: "Oct", index: 9 }, { name: "Nov", index: 10 }, { name: "Dec", index: 11 },
            { name: "Jan", index: 0 }, { name: "Feb", index: 1 }, { name: "Mar", index: 2 },
            { name: "Apr", index: 3 }, { name: "May", index: 4 }, { name: "Jun", index: 5 }
        ];
        seasonMonths.forEach(month => {
            const tab = document.createElement('button');
            tab.className = 'tab-link';
            tab.textContent = month.name;
            tab.dataset.month = month.index;
            if (month.index === selectedMonthIndex) tab.classList.add('active');
            tab.addEventListener('click', () => {
                selectedMonthIndex = month.index;
                renderCalendar();
            });
            monthTabsContainer.appendChild(tab);
        });
    };

    const renderCalendar = async () => {
        renderMonthTabs();
        calendarContainer.innerHTML = 'Loading...';
        const season = seasonFilter.value;
        if (!season) return;

        const startYear = parseInt(season.split('-')[0]);
        const year = (selectedMonthIndex >= 6) ? startYear : startYear + 1;
        const firstDayOfMonth = new Date(Date.UTC(year, selectedMonthIndex, 1));
        const lastDayOfMonth = new Date(Date.UTC(year, selectedMonthIndex + 1, 0));
        
        const calendarData = await fetchCalendarData(
             new Date(Date.UTC(year, selectedMonthIndex, 1 - (firstDayOfMonth.getUTCDay() + 6) % 7)),
             new Date(Date.UTC(year, selectedMonthIndex, lastDayOfMonth.getUTCDate() + (7 - lastDayOfMonth.getUTCDay()) % 7))
        );

        calendarContainer.innerHTML = ''; 
        const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        weekdays.forEach(day => {
            const headerCell = document.createElement('div');
            headerCell.className = 'calendar-header';
            headerCell.textContent = day;
            calendarContainer.appendChild(headerCell);
        });

        const startDate = new Date(firstDayOfMonth);
        const dayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7;
        startDate.setUTCDate(startDate.getUTCDate() - dayOfWeek);

        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setUTCDate(day.getUTCDate() + i);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            if (day.getUTCMonth() !== selectedMonthIndex) dayElement.classList.add('other-month');
            
            const today = new Date();
            if (day.getUTCFullYear() === today.getFullYear() && day.getUTCMonth() === today.getMonth() && day.getUTCDate() === today.getDate()) {
                dayElement.classList.add('today');
            }

            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day.getUTCDate();
            dayHeader.appendChild(dayNumber);
            dayElement.appendChild(dayHeader);

            const dateStr = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`;
            const dataForDay = calendarData[dateStr];

            const eventsList = document.createElement('div');
            eventsList.className = 'events-list';
            if (dataForDay?.events.length > 0) {
                dataForDay.events.forEach(event => {
                    const eventElement = document.createElement('div');
                    eventElement.className = `event-item event-general`;
                    eventElement.textContent = event.description;
                    eventsList.appendChild(eventElement);
                });
            }
            dayElement.appendChild(eventsList);

            const fixtureSlotsContainer = document.createElement('div');
            fixtureSlotsContainer.className = 'fixture-slots';
            const allPossibleSlots = ['7:00 PM', '8:00 PM', '9:00 PM'];
            const dayFixtures = dataForDay ? dataForDay.fixtures : {};

            allPossibleSlots.forEach(slotTime => {
                const slotElement = document.createElement('div');
                slotElement.className = 'fixture-slot';
                slotElement.textContent = slotTime.replace(':00 PM', 'pm');
                
                if (dayFixtures[slotTime]) {
                    slotElement.classList.add('fixture-occupied');
                    slotElement.title = dayFixtures[slotTime];
                } else {
                    slotElement.classList.add('fixture-free');
                }
                fixtureSlotsContainer.appendChild(slotElement);
            });

            const dayOfWeekIndex = day.getUTCDay();
            if (day.getUTCMonth() === selectedMonthIndex && dayOfWeekIndex >= 1 && dayOfWeekIndex <= 4) { // Mon to Thu
                dayElement.appendChild(fixtureSlotsContainer);
            }

            calendarContainer.appendChild(dayElement);
        }
    };

    const initializePage = async () => {
        try {
            const q = query(collection(db, 'seasons'), orderBy('name', 'desc'));
            const seasonsSnapshot = await getDocs(q);
            seasonsSnapshot.forEach(doc => {
                const season = doc.data();
                const option = document.createElement('option');
                option.value = season.name;
                option.textContent = season.name;
                if (season.status === 'current') option.selected = true;
                seasonFilter.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching seasons:", error);
        }
        seasonFilter.addEventListener('change', renderCalendar);
        renderCalendar();
    };

    initializePage();
});
