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

## Next Steps

1.  **Testing**: Thoroughly test the implementation to ensure the counters are updating correctly and the display is consistent across different browsers.
2.  **Deployment**: Deploy the updated application to the production environment.
