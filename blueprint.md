# SSC Cup Page

## Overview

This document outlines the plan for creating a new "SSC Cup" page on the Sarnia Skittles Club website. The page will display group standings and fixtures for the SSC Cup competition, reusing existing styles and components for a consistent user experience.

## Features

*   **Season Selector:** Users can select a season to view the corresponding SSC Cup data.
*   **Group Tabs:** The page will have tabs for each of the four groups in the competition.
*   **Group Standings:** Each tab will display a table with the standings for the teams in that group. The table will show Position, Team, Played, Won, Lost, and Points.
*   **Fixtures/Results:** Below the standings table, a section will display the fixtures and results for that group, organized by date.

## File Structure

The following files will be created:

*   `public/ssc_cup.html`: The main HTML file for the SSC Cup page.
*   `public/ssc-cup-page.css`: A new CSS file for styles specific to the SSC Cup page. It will import the styles from `league-tables-page.css` to maintain consistency.
*   `public/ssc_cup.js`: A new JavaScript file to handle the logic for fetching and displaying the SSC Cup data from Firestore.

## Implementation Steps

1.  **Create `public/ssc_cup.html`:**
    *   Copy the structure from `public/league_tables.html`.
    *   Change the title to "Sarnia Skittles Club - SSC Cup".
    *   Update the CSS link to `ssc-cup-page.css`.
    *   Change the JavaScript include to `ssc_cup.js`.
    *   Update the main content area to have containers for group tabs (`group-tabs-container`) and group content (`group-container`).

2.  **Create `public/ssc-cup-page.css`:**
    *   Import the styles from `public/league-tables-page.css`.
    *   Add styles for the fixtures and results section.

3.  **Create `public/ssc_cup.js`:**
    *   Adapt the JavaScript from `public/league_tables.js`.
    *   Fetch data from the `ssc_cup` collection in Firestore.
    *   Populate the season selector.
    *   Dynamically create tabs for each group.
    *   For each group, render a standings table and a fixtures/results section.
    *   Implement tab switching functionality.

## Data Structure (Firestore)

The data for the SSC Cup will be stored in a collection named `ssc_cup`. Each document in this collection will represent a season (e.g., "2023-2024").

Each season document will contain fields for each group (e.g., "Group_A", "Group_B", etc.). Each group field will be an object with the following structure:

```json
{
  "standings": [
    { "teamName": "Team A", "played": 2, "won": 2, "lost": 0, "points": 4 },
    { "teamName": "Team B", "played": 2, "won": 1, "lost": 1, "points": 2 },
    { "teamName": "Team C", "played": 2, "won": 0, "lost": 2, "points": 0 }
  ],
  "fixtures": [
    { "date": "2023-10-20", "homeTeam": "Team A", "awayTeam": "Team B", "homeScore": 5, "awayScore": 3 },
    { "date": "2023-10-27", "homeTeam": "Team C", "awayTeam": "Team A", "homeScore": 2, "awayScore": 6 }
  ]
}
```
