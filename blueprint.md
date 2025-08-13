# Project Blueprint

## Overview

This project is a modern, framework-less web application for the Sarnia Skittles Club. It provides up-to-date information about fixtures, results, league tables, and club news. The site uses a consistent and responsive layout across all pages and is deployed via Firebase Hosting.

## Style Guide

### Typography

*   **Font:** 'Outfit' (from Google Fonts) is the primary font for its clean and modern look.

### Color Palette

*   **Primary Colours:**
    *   Club Green: `#006400`
    *   Club Yellow: `#F9DD16`
    *   Pure White: `#FFFFFF`
*   **Neutral Colours:**
    *   Off White: `#F8F9FA` (used for page backgrounds)
    *   Light Grey: `#E9ECEF` (used for borders and table headers)
    *   Charcoal: `#212529` (used for main text)

## Project Structure

*   `public/`: Contains all live website files.
    *   `index.html`: Main landing page.
    *   `style.css`: Single stylesheet for the entire application.
    *   `main.js`: Global script for shared functionality (like HTML includes).
    *   `firebase.config.js`: Firebase configuration module.
    *   `fixtures_results.html`: Page to display match fixtures and results.
    *   `fixtures_results.js`: Script to fetch and render data for the fixtures page.
    *   *(Other HTML pages like `calendar.html`, `rules.html`, etc.)*
*   `firebase.json`: Configuration for Firebase services (Hosting).
*   `public/firestore.rules`: Security rules for the Firestore database.
*   `blueprint.md`: This documentation file.

---

## Current Task: Fix Firestore Permissions

### Objective
The `fixtures_results.html` page was getting a "Missing or insufficient permissions" error because the Firestore rules did not allow public read access to the `match_results` collection.

### Implementation Steps

1.  **Update `public/firestore.rules`:**
    *   Added a new `match` block to the Firestore rules to allow public read access to the `match_results` collection.

    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // ... other rules
        match /match_results/{matchId} {
          allow read: if true;
        }
      }
    }
    ```

### Current Status
The Firestore rules have been updated, and the permissions error is resolved. The fixtures and results page should now load data correctly.
