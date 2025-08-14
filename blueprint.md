# Blueprint

## Overview

This document outlines the structure, features, and implementation details of the Snooker Club Website. The website is a comprehensive platform for managing and viewing snooker league information, including fixtures, results, league tables, and player statistics. It also includes user authentication and profile management features.

## Project Structure

The project is a web application built using HTML, CSS, and JavaScript, with Firebase for backend services.

-   **`public/`**: The root directory for all static assets and web pages.
    -   **`index.html`**: The main landing page.
    -   **`*.html`**: Various pages for different features (e.g., `login.html`, `profile.html`, `fixtures_results.html`).
    -   **`*.css`**: Stylesheets for different pages.
    -   **`*.js`**: JavaScript files for application logic.
    -   **`firebase.config.js`**: Firebase configuration.
-   **`functions/`**: Cloud Functions for Firebase.
-   **`firestore.rules`**: Security rules for Firestore.
-   **`database.rules.json`**: Security rules for the Realtime Database.
-   **`storage.rules`**: Security rules for Cloud Storage.

## Implemented Features

### User Authentication

-   **Login/Register:** Users can register and log in using email/password or their Google account.
-   **Profile Management:** Logged-in users can view and update their profile information.
-   **Account Linking:** Users can link their authenticated account with their player data in the system.
-   **Session Management:** The application maintains user sessions and protected routes.

### Main Application Features

-   **League Tables:** View the current league standings.
-   **Fixtures & Results:** See upcoming matches and the results of past matches.
--   **Player Statistics:** View detailed statistics for each player.
-   **Committee Information:** A page dedicated to the club's committee members.
-   **Hall of Fame:** A page showcasing past champions and notable players.
-   **Rules & Regulations:** A page outlining the rules of the league.

## Design and Styling

-   **Layout:** The website uses a consistent header and footer across all pages. The main content is displayed in a central container.
-   **Styling:** The styling is defined in separate CSS files for each page, with a main `style.css` for common styles.
-   **Responsiveness:** The layout is designed to be responsive and work on different screen sizes.

## Current Task: Fix Login Page Errors

The user is reporting three errors on the login page. The investigation will focus on the following:

1.  **Review Firebase Configuration:** Check `public/firebase.config.js` for any issues, especially with `authDomain`.
2.  **Analyze Login Logic:** Examine `public/login.js` to understand how both email/password and Google Sign-In are handled.
3.  **Implement Robust Error Handling:** Add a dedicated error message container in `public/login.html` and update `public/login.js` to display clear error messages from Firebase Authentication. This will address issues like `auth/invalid-password` and other potential login failures.
4.  **Fix Google Sign-In Redirect:** Ensure the Google Sign-In flow correctly handles the redirect and captures the authentication result. This likely involves fixing the `authDomain` and ensuring `getRedirectResult` is properly called.
5.  **Clean up unused files:** Delete `public/blueprint.md`.

This plan aims to resolve all login-related issues and improve the user experience by providing clear feedback.
