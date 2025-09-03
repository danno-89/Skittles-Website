import { db, collection, getDocs, query, where, orderBy } from './firebase.config.js';

document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('calendar-container');
    const seasonFilter = document.getElementById('season-filter');

    if (!calendarContainer || !seasonFilter) {
        console.error("Required calendar elements not found.");
        return;
    }
    
    const parseFirestoreDate = (field) => {
        if (!field) return null;
        if (typeof field.toDate === 'function') return field.toDate();
        const d = new Date(field);
        return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
    };

    const fetchAllSeasonEvents = async (seasonName, startDate, endDate) => {
        const allEvents = [];
        const startUTC = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
        const endUTC = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000);

        const processCollection = async (collectionName) => {
            try {
                const q = query(collection(db, collectionName), where('season', '==', seasonName));
                const snapshot = await getDocs(q);

                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (Array.isArray(data.date) && data.date.length === 2) {
                        const eventStartDate = parseFirestoreDate(data.date[0]);
                        const eventEndDate = parseFirestoreDate(data.date[1]);
                        if (eventStartDate && eventEndDate) {
                            allEvents.push({
                                date: eventStartDate,
                                endDate: eventEndDate,
                                isRange: true,
                                time: 'All Day',
                                type: 'event-general',
                                description: data.name
                            });
                        }
                    } else {
                        const eventDate = parseFirestoreDate(data.date);
                        if (!eventDate) return;
                        let eventTime = 'All Day';
                        if (eventDate.getUTCHours() !== 0 || eventDate.getUTCMinutes() !== 0) {
                            eventTime = eventDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });
                        }
                        allEvents.push({ date: eventDate, time: eventTime, type: 'event-general', description: data.name });
                    }
                });
            } catch (error) {
                console.error(`Error fetching ${collectionName}:`, error);
            }
        };

        await processCollection('events');
        await processCollection('competitions');
        
        try {
            const q = query(
                collection(db, 'match_results'),
                where('scheduledDate', '>=', startUTC.toISOString()),
                where('scheduledDate', '<=', endUTC.toISOString())
            );
            const matchesSnapshot = await getDocs(q);
            matchesSnapshot.forEach(doc => {
                const data = doc.data();
                const eventDate = parseFirestoreDate(data.scheduledDate);
                if (!eventDate) return;
                const time = eventDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/London' });
                if (data.status === 'scheduled') {
                    allEvents.push({ date: eventDate, time, type: 'fixture-occupied', description: `${data.homeTeamName || 'TBC'} vs ${data.awayTeamName || 'TBC'}` });
                } else if (data.status === 'spare') {
                    allEvents.push({ date: eventDate, time, type: 'fixture-spare', description: 'Spare Slot for Postponed Fixtures' });
                }
            });
        } catch (error) {
            console.error("Error fetching match_results:", error);
        }
        
        allEvents.sort((a, b) => a.date - b.date);
        return allEvents;
    };
    
    const renderSchedule = (events) => {
        calendarContainer.innerHTML = '';
        if (events.length === 0) {
            calendarContainer.innerHTML = '<p>No events found for this season.</p>';
            return;
        }

        let i = 0;
        while (i < events.length) {
            const currentEvent = events[i];
            
            const dayElement = document.createElement('div');
            dayElement.className = 'schedule-day';
            const header = document.createElement('div');
            header.className = 'schedule-date-header';
            const list = document.createElement('ul');
            list.className = 'schedule-item-list';

            if (currentEvent.isRange) {
                const startDateStr = currentEvent.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
                const endDateStr = currentEvent.endDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
                header.textContent = `${startDateStr} - ${endDateStr}`;
                
                const item = document.createElement('li');
                item.className = `schedule-item ${currentEvent.type}`;
                item.innerHTML = `<div class="schedule-item-time">${currentEvent.time}</div><div class="schedule-item-description">${currentEvent.description}</div>`;
                list.appendChild(item);
                
                i++;
            } else {
                const dateStr = currentEvent.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                header.textContent = dateStr;
                
                const dayEvents = [];
                let j = i;
                while (j < events.length && events[j].date.toDateString() === currentEvent.date.toDateString()) {
                    dayEvents.push(events[j]);
                    j++;
                }
                
                dayEvents.sort((a, b) => {
                    if (a.time === 'All Day') return -1;
                    if (b.time === 'All Day') return 1;
                    return a.time.localeCompare(b.time);
                });

                dayEvents.forEach(event => {
                    const item = document.createElement('li');
                    item.className = `schedule-item ${event.type}`;
                    item.innerHTML = `<div class="schedule-item-time">${event.time}</div><div class="schedule-item-description">${event.description}</div>`;
                    list.appendChild(item);
                });

                i = j;
            }
            
            dayElement.appendChild(header);
            dayElement.appendChild(list);
            calendarContainer.appendChild(dayElement);
        }
    };

    const handleSeasonChange = async () => {
        calendarContainer.innerHTML = 'Loading...';
        const selectedOption = seasonFilter.options[seasonFilter.selectedIndex];
        if (!selectedOption) return;

        const seasonName = selectedOption.value;
        const seasonStartDateStr = selectedOption.dataset.startDate;
        const seasonEndDateStr = selectedOption.dataset.endDate;

        if (!seasonStartDateStr || !seasonEndDateStr) {
            calendarContainer.innerHTML = '<p>This season has no defined start and end date.</p>';
            return;
        }
        
        const seasonStartDate = new Date(seasonStartDateStr);
        const seasonEndDate = new Date(seasonEndDateStr);

        const events = await fetchAllSeasonEvents(seasonName, seasonStartDate, seasonEndDate);
        renderSchedule(events);
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
                if (season.start && season.end) {
                    option.dataset.startDate = parseFirestoreDate(season.start)?.toISOString();
                    option.dataset.endDate = parseFirestoreDate(season.end)?.toISOString();
                }
                if (season.status === 'current') option.selected = true;
                seasonFilter.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching seasons:", error);
        }
        seasonFilter.addEventListener('change', handleSeasonChange);
        handleSeasonChange();
    };

    initializePage();
});
