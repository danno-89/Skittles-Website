# Skittles Club App Blueprint

## Overview

This document outlines the features and design of the Skittles Club application. The app provides players and administrators with tools to manage league information, track statistics, and view match results.

## Implemented Features

### Player Statistics Page

-   **Averages Section:**
    -   Displays player averages, total pins, and games played.
    -   **Total Pins Column:** Shows the total pins for the season, with the current week's score in parentheses. A "-" indicates no games played in the current week. This resets weekly on Monday morning.
    -   **Average Column:** Shows the player's current season average.
    -   **Movement Column:** Displays the change in a player's average based on the current week's performance. A `+` indicates an increase, and a `-` indicates a decrease. The movement is color-coded for easy visualization (green for positive, red for negative).
-   **High Scores Section:** Lists the highest individual scores achieved in the league.
-   **Spares and Extra Pins Section:** Ranks players by the number of spares and extra pins.
-   **Filtering:** Allows users to filter statistics by division, gender, and team, and set a minimum number of games played.

### Admin Page - Results Input

- **"Name to be confirmed" Player Option:**
    - In the results input scorecard, each player dropdown now contains a "Name to be confirmed" option.
    - Selecting this option reveals a text input field, allowing an administrator to enter the name of a player who may not be officially registered or whose name on the scorecard is a nickname.
    - When results are submitted, this player's name is saved with their scores for the match. This allows for processing match results even when full player details aren't immediately available.
    - The system is designed to handle this temporary data, ensuring that it does not interfere with regular player statistics until the name can be officially matched to a registered player.

### Scoreboard & Social Play Hub

-   **Purpose:** Provides a centralized hub for live scorekeeping for both official club matches and social events.
-   **Location:** All related files are located in the `/public/scoreboard/` directory.

#### Landing Page (`ui.html`)
-   **Layout:** A modern, two-column interface that serves as the entry point for all scoreboard-related activities.
-   **Upcoming Fixtures:** The left column dynamically loads and displays the next three scheduled fixtures from the Firestore database. A button at the bottom links to the main fixtures and results page.
-   **Match Types:** The right column features a selection of match types, including "Standard Match," "Killer," and "Knockout," allowing users to easily start a new game.

#### Live Scoreboard (`input.html` & `display.html`)
-   **Control Page (`input.html`):** A page for creating a new match and updating the scores. It allows the user to set team names and then provides buttons to increment, decrement, and reset scores. It also has an "End Match" button, which deletes the scoreboard data.
-   **Display Page (`display.html`):** A read-only display page that shows the live scores for a specific match. The match is identified by a `matchId` in the URL. This page automatically updates in real-time as the scores change.

#### Design and Styling
-   **Unified Look and Feel:** All pages within the scoreboard hub share a consistent, modern, dark-themed design, defined in a single stylesheet (`style.css`). This ensures a cohesive user experience.

#### Open Access
-   **Firestore Rules:** The scoreboard data is stored in a separate Firestore collection (`scoreboards`) with open read/write rules. This allows non-authenticated users to create and manage scoreboards for social gatherings without needing to log in.

### Standard Game
- **Player Sorting Logic:** In `standard-game.html`, the player sorting logic has been corrected. Previously, players were sorted alphabetically by their first name. The logic has been updated to sort players based on their player number in the Firestore document, ensuring that they appear in the order they were added to the game.


## Current Task: Standard Game Setup Screen

### Plan

1.  **Create `standard-setup.html`:**
    -   A new HTML file in `public/scoreboard/` for the standard game setup screen.

2.  **Create `standard-setup.js`:**
    -   This script will fetch data from the `scoreboard/standardGame` document in Firestore.
    -   It will display the following information for both the home and away teams:
        -   Team name
        -   Number of players
        -   A list of player names.

3.  **Create `standard-setup.css`:**
    -   A stylesheet for the setup screen.

4.  **Update `index.html`:**
    -   Link the "Standard Game (5 Hands)" button to the new `standard-setup.html` page.
