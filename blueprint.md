# Project Blueprint

## Overview

This document outlines the plan for developing a web application that includes a header with dynamic counters for pins, matches, and postponements. The application will feature a modular front-end structure with separate files for HTML, CSS, and JavaScript.

## Phase 1: Header Implementation (Revised)

The initial implementation caused styling issues with the header. A new approach has been taken to dynamically inject the counters using JavaScript, leaving the original `header.html` untouched.

### `statistics.js`

A new file, `public/statistics.js`, is created to handle the logic for fetching and calculating the statistics from the Firebase Firestore database.

```javascript
import { db, collection, getDocs } from './firebase.config.js';

async function getStatistics() {
    const matchResultsCollection = collection(db, 'match_results');
    const matchResultsSnapshot = await getDocs(matchResultsCollection);

    let pins = 0;
    let matches = 0;
    let postponements = 0;

    matchResultsSnapshot.forEach(doc => {
        const data = doc.data();
        matches++;
        if (data.homeScore && data.awayScore) {
            pins += data.homeScore + data.awayScore;
        }
        if (data.status === 'postponed') {
            postponements++;
        }
    });

    return { pins, matches, postponements };
}

export { getStatistics };
```

### `main.js` Integration

The `public/main.js` file is modified to import the `getStatistics` function and dynamically create and inject the counters into the header after the HTML includes are loaded.

```javascript
// main.js
import { auth } from './firebase.config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { authReady } from './auth-manager.js';
import { getStatistics } from './statistics.js';

// ... (existing code)

async function displayStatistics() {
    const stats = await getStatistics();
    const headerContent = document.querySelector('.header-content');

    if (headerContent) {
        const countersContainer = document.createElement('div');
        countersContainer.className = 'counters-container';
        countersContainer.style.display = 'flex';
        countersContainer.style.gap = '20px';
        countersContainer.style.alignItems = 'center';

        countersContainer.innerHTML = `
            <div class="counter">
                <span>Pins:</span>
                <span class="value">${stats.pins}</span>
            </div>
            <div class="counter">
                <span>Matches:</span>
                <span class="value">${stats.matches}</span>
            </div>
            <div class="counter">
                <span>Postponements:</span>
                <span class="value">${stats.postponements}</span>
            </div>
        `;

        headerContent.appendChild(countersContainer);
    }
}

document.addEventListener('htmlIncludesLoaded', () => {
    setupSignOutListeners();
    setupMenuToggle();
    displayStatistics();
});

// ... (existing code)
```

## Admin Page Enhancements

### Player Document Updates on Result Submission

The `public/admin.js` file has been enhanced to automatically update player documents in the `players_public` collection when match results are submitted.

**Features:**
*   **`recentFixture` Update**: When match results are submitted, the `recentFixture` field for each player who participated in the match will be updated with the `scheduledDate` of the match (as a Firestore Timestamp).
*   **`registerExpiry` Update**: The `registerExpiry` field for participating players will be updated to a date 365 days after the `recentFixture` date (also as a Firestore Timestamp).

### "6th Player" Option in Scorecard Dropdowns

The player selection dropdowns in the results input tab (`admin.html`) have been modified in `public/admin.js`.

**Features:**
*   **Added "6th Player" Option**: An additional option with the value `"sixthPlayer"` and display text "6th Player" has been added to each player selection dropdown in the scorecards. This allows for a generic placeholder when a specific player is not available or known for the 6th spot.

### Prevent Duplicate Player Selections in Scorecard Dropdowns

Further enhancements have been made to the player selection dropdowns in the results input tab (`admin.html`) in `public/admin.js` to prevent duplicate player selections within a single scorecard.

**Features:**
*   **Dynamic Option Filtering**: When a player is selected in one dropdown, the options in all other player dropdowns within the same scorecard are dynamically updated. Players already selected are removed from the available options in other dropdowns.
*   **Maintain Current Selection**: A player's current selection remains in their respective dropdown even if they are selected. This prevents accidental deselection.
*   **Real-time Updates**: Changes to any player selection dropdown trigger an immediate refresh of all other dropdowns on the same scorecard, ensuring the lists of available players are always accurate.

### Amend Player Tab Functionality

A new tab, "Amend Player", has been implemented in `public/admin.html` and `public/admin.js` to allow committee members to view detailed information for any player.

**Features:**
*   **Horizontal Layout**: The "Select Team" and "Select Player" dropdowns are now horizontally aligned for improved user experience, matching the layout of the "Results Input" tab.
*   **Team Selection Dropdown**: A dropdown (`amend-team-select`) is populated with all available teams, *excluding any teams that do not have associated players*. This provides a more focused and relevant list of teams. The teams are sorted alphabetically.
*   **Player Selection Dropdown**: A second dropdown (`amend-player-select`) is dynamically populated with players belonging to the currently selected team. Players are sorted alphabetically by their full name.
*   **"Get Data" Button**: A button (`get-player-data-btn`) is enabled when a player is selected. Clicking this button fetches and displays the chosen player's data.
*   **Display Player Data**: All data from both the `players_public` and `players_private` Firestore documents for the selected player is fetched and displayed in a dedicated section (`player-data-display`).
*   **Data Formatting**: Fetched data, including Firestore `Timestamp` objects and other complex objects, is formatted for human readability.
*   **Authorization**: This functionality is only accessible to authenticated users with `committee` permissions.

### User-Friendly Editable Player Data Interface

The "Amend Player" tab has been enhanced with a more user-friendly, four-column layout for editing player data.

**Features:**
*   **Four-Column Table**: When player data is fetched, it is now displayed in a table with four columns: "Field," "Description," "Current Value," and "New Value." This provides a clear, side-by-side view of the data, its meaning, and the proposed changes.
*   **User-Friendly Descriptions**: A new "Description" column provides clear, human-readable labels for each data field, making the interface more intuitive.
*   **Formatted Dates and Times**: All dates and times are now displayed in a consistent `d mmm yyyy h:mm AM/PM` format for improved readability.
*   **Editable Input Fields**: The "New Value" column contains blank `<input>` fields, allowing for easy data entry.
*   **"Submit Changes" Button**: A "Submit Changes" button is available to save any modifications.
*   **Selective Updates**: Only fields with new values are updated, preserving the original data for all other fields.
*   **Data Type Handling**: The system correctly handles various data types, ensuring data integrity upon submission.
*   **User Feedback and Data Refresh**: The interface provides clear success or error messages and automatically refreshes the data on a successful update.

This provides a robust tool for committee members to inspect and manage player information efficiently.

## Next Steps

1.  **Testing**: Thoroughly test the implementation to ensure the counters are updating correctly and the display is consistent across different browsers. Additionally, verify that the "Amend Player" tab correctly displays player data for both public and private documents, and that teams without players are excluded from the dropdown. Finally, test the new editable data interface to ensure that data can be updated correctly and that the user feedback and data refresh mechanisms are working as expected.
2.  **Deployment**: Deploy the updated application to the production environment.
