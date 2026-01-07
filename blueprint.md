# Sarnia Skittles Club - Competition Registration Blueprint

## Overview

This document outlines the design and implementation of the competition registration functionality for the Sarnia Skittles Club website. The goal is to provide a seamless and user-friendly experience for players to register for competitions, with a robust system for linking registrations to player profiles.

## Implemented Features

### 1. Multi-Competition Support

*   **Competitions:** The system now supports registration for:
    *   Ladies' Pairs
    *   Men's Pairs
    *   Ladies' Singles
    *   Men's Singles
    *   Mixed Pairs
*   **Default Selection:** The competition dropdown now defaults to a disabled "Select a competition..." option, requiring a user to make an active selection.

### 2. Competition Date and Time Display

*   **Dynamic Display:** When a user selects a competition, the system now dynamically fetches and displays the competition's scheduled date and start time (7:30 PM) in a highlighted box directly below the dropdown.
*   **Name Normalization:** The system now handles variations in competition names (e.g., "Ladies Pairs" vs. "Ladies' Pairs") to ensure the date is always found.

### 3. Advanced, Competition-Based Team and Player Filtering

*   **Optimized Team Filtering:** The team dropdowns are dynamically filtered to show only teams with eligible players for the selected competition, ensuring a fast and relevant user experience.
    *   **Mixed Pairs:** A team is only shown if it has at least one registered male player AND at least one registered female player.
    *   **Ladies' Competitions:** A team is only shown if it has at least one registered female player.
    *   **Men's Competitions:** A team is only shown if it has at least one registered male player.
*   **Strict Player Division Enforcement:**
    *   **Mixed Pairs:** The form dynamically relabels the player sections to "Male Player" and "Female Player". The respective dropdowns are then strictly filtered to show *only* players from the selected team with the corresponding "Men's" or "Ladies'" division.
    *   **Single-Gender Competitions:** The player dropdowns are filtered to show only players of the required gender.

### 4. Dynamic UI for Singles vs. Pairs

*   **Singles Competitions:** When a "Singles" competition is selected, the entire "Player 2" section is automatically hidden from the form.
*   **Pairs Competitions:** When any "Pairs" competition is selected, the "Player 2" section is visible.

### 5. Dynamic Registration Deadline

*   **Deadline Calculation:** The registration closing date is now dynamically calculated as **7 days** before the scheduled competition date. This is displayed on each competition's tab.

### 6. Conditional Contact Information

*   **Logic:** The contact information section is only displayed if all registered players (one for singles, two for pairs) have selected "No Team".

### 7. Optimized Performance

*   **Efficient Data Fetching:** The system uses a highly optimized, two-query approach to fetch all necessary player and team data, ensuring the dynamic dropdowns populate almost instantly, regardless of the number of teams or players in the database.

## Current Plan (Completed)

1.  **Remove Container Styling:** The CSS for the registration form has been adjusted to remove the container, so the content renders directly on the page.
2.  **Fix Date Display Bug:** The JavaScript has been updated to normalize competition names, ensuring the date and time are always displayed correctly.
3.  **Update Blueprint:** This `blueprint.md` file has been updated to reflect the styling changes and bug fix.
