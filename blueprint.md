# SSC Fixtures & Results Blueprint

## Project Overview

This project is a web application for managing and displaying snooker league information, including fixtures, results, league tables, and player statistics. It is built using HTML, CSS, and JavaScript, with Firebase as the backend for data storage and authentication.

## Implemented Features & Design

### Core Features

*   **Fixtures & Results:** Displays a list of all matches, filterable by season, team, and competition. Results are updated in real-time.
*   **League Tables:** Shows the current standings for each division, with points, wins, losses, and other relevant statistics.
*   **Player Statistics:** Provides detailed statistics for each player, including win/loss record, high breaks, and other performance metrics.
*   **User Authentication:** Allows users to register and log in to access protected features, such as submitting results or managing their profile.
*   **Data Input:** Provides an interface for authorized users to input match results and other data.

### Design

*   **Modern & Responsive:** The application is designed to be visually appealing and easy to use on both desktop and mobile devices.
*   **Intuitive Navigation:** A clear and consistent navigation menu allows users to easily find the information they are looking for.
*   **Interactive Elements:** The use of interactive elements, such as filters and sortable tables, enhances the user experience.

## Current Change: Date Format Update

### Plan

1.  **Update `fixtures_results.js`:** Modify the `fetchAllFixtures` function to handle Firestore timestamps for the `scheduledDate` field. This will involve converting the timestamps to JavaScript `Date` objects.
2.  **Update Display Logic:** Modify the `displayMatchResults` function to use the `Date` objects directly, ensuring that the dates and times are displayed correctly.
3.  **Test:** Verify that the fixtures and results are displayed correctly and that the filtering and sorting functionality still works as expected.
