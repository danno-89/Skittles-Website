# Project Blueprint

## Overview
This project is a web application designed to display football league tables, player information, and other related content. It utilizes Firebase Firestore for data storage and a framework-less approach for the frontend (HTML, CSS, JavaScript) to ensure modern web standards and performance.

## Detailed Outline

### Initial Setup
- Basic HTML structure (`index.html`, `league_tables.html`, etc.)
- Linked CSS (`style.css`) for styling.
- Linked JavaScript (`main.js`) for dynamic content and Firebase integration.
- Firebase SDKs included via CDN in HTML files.
- Firebase initialized with `firebaseConfig` from `firebase.config.js`.

### League Tables Page (`public/league_tables.html`)
- Displays league standings for 'premier_division' and 'first_division' fetched from the 'league_tables' collection in Firestore.
- Each division is rendered in its own table with a clear heading.

### Players Register Page (`public/players_register.html`)
- Displays a list of registered players from the `players_public` collection in Firestore.
- The player data is presented in a table format with columns for Player Name, Team, Position, and Goals.

### Current Features and Design
- **Firebase Integration**: The application successfully connects to Firebase Firestore to fetch dynamic data for both league tables and the players register.
- **Dynamic Data Display**: Both the `league_tables.html` and `players_register.html` pages dynamically render data from Firestore.
- **Modular JavaScript**: The `main.js` file now contains logic for both pages, but the code is structured to only execute when the relevant container element is present on the page.
- **Hall of Fame Filtering**: The `hall_of_fame.html` page will feature tabs to filter the displayed hall of fame entries by competition type and a dropdown menu to further filter by specific competition within the selected type.

- **Navigation**: The `index.html` page includes a navigation link to the new "Players Register" page.
- **Firestore Security**: The `public/firestore.rules` file has been updated and deployed to allow read access to the `players_public` collection, enabling the Players Register page to function correctly.

## Current Plan

### Objective
Create a new "Players Register" page, add a link to it from the home page, and populate it with data from the `players_public` collection in Firestore.

### Steps Taken
1.  **Created `players_register.html`**: A new HTML file was created in the `public` directory to serve as the Players Register page.
2.  **Updated `index.html`**: A navigation link to the new `players_register.html` page was added to the home page.
3.  **Updated `main.js`**: The `main.js` file was modified to include logic that:
    - Checks for the existence of a `players-table-container` element.
    - If found, fetches all documents from the `players_public` collection in Firestore.
    - Renders the fetched player data into a table on the page.
4.  **Updated `public/firestore.rules`**: The Firestore security rules were amended to allow read access to the `players_public` collection.
5.  **Deployed Firestore Rules**: The updated security rules were deployed to Firebase to make the `players_public` collection readable by the web app.
6.  **Blueprint Update**: Documenting these changes in `blueprint.md` for clear project history and context.
