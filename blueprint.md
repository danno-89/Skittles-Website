
# Skittles Club Hub Blueprint

## Overview

The Skittles Club Hub is a web application designed to manage and display information for a local skittles league. It provides a central platform for players, committee members, and fans to access league tables, fixtures, results, player statistics, and other relevant information. The application is built using modern web technologies, including HTML, CSS, JavaScript, and Firebase for the backend.

## Features

### User Authentication

*   **Sign-in/Sign-up:** Users can create an account and sign in using their email and password.
*   **Authentication:** Firebase Authentication is used to manage user accounts and secure access to the application.
*   **Role-Based Access:** The application can be extended to support different user roles (e.g., players, captains, committee members) with varying levels of access and permissions.

### Main Dashboard

*   **League Tables:** Displays the current league standings, including teams, points, and positions.
*   **Fixtures and Results:** Shows upcoming matches and the results of past games.
*   **Player Statistics:** Provides a comprehensive list of player statistics, such as top scorers, highest scores, and averages.
*   **Hall of Fame:** Highlights notable achievements and records within the league.

### Data Management

*   **Data Input:** Authorized users can input and update match results, player scores, and other data.
*   **Real-time Updates:** The application uses Firebase Firestore to store and sync data in real-time, ensuring that all information is up-to-date.
*   **Data Validation:** Input validation is implemented to maintain data integrity and prevent errors.

### Player Registration

*   **Registration Form:** A dedicated page for new players to register for the league.
*   **Data Collection:** The form collects essential player information, including personal details, contact information, and team selection.
*   **Data Storage:** The registration data is stored in the `players_public` and `players_private` collections in Firestore.
*   **Registration Expiry:** The player's registration expiry date is automatically set to 365 days from their registration date.

### Additional Pages

*   **Rules and Regulations:** A dedicated page for the official rules and regulations of the league.
*   **Committee Information:** Provides a list of committee members and their roles.
*   **Contact Information:** Includes contact details for inquiries and support.

## Design and Styling

### Visual Identity

*   **Logo:** The Skittles Club Hub logo is prominently displayed in the header.
*   **Color Palette:** A consistent color scheme is used throughout the application to create a cohesive and professional look. The primary colors are green, white, and black, with accents of gold and silver.
*   **Typography:** A clear and readable font is used for all text, with different sizes and weights to create a visual hierarchy.

### Layout and Components

*   **Responsive Design:** The application is designed to be responsive and work seamlessly on various devices, including desktops, tablets, and mobile phones.
*   **Navigation Bar:** A user-friendly navigation bar provides easy access to all pages and features.
*   **Cards:** Information is presented in a card-based layout, which is easy to scan and visually appealing.
*   **Buttons and Forms:** Interactive elements, such as buttons and forms, are designed to be intuitive and easy to use.

### User Experience

*   **Intuitive Navigation:** The application's structure is logical and easy to navigate, allowing users to find the information they need quickly.
*   **Clear and Concise Content:** Information is presented in a clear and concise manner, with headings, lists, and other formatting to improve readability.
*   **Feedback and Notifications:** The application provides feedback to users when they perform actions, such as submitting data or signing in.

## Current Plan

### Add Registration Expiry

The current task is to add a registration expiry date to new player registrations.

#### Steps

1.  **Update JavaScript:** Modify `public/player-registration.js` to calculate the expiry date (365 days from registration) and add it to the player's data.
2.  **Update Blueprint:** Update this `blueprint.md` file to document the new feature.
