# Fixtures & Results Page

## Overview

This page provides a comprehensive view of all fixtures, results, and postponements for the Sarnia Skittles League. It is designed to be a central hub for players to track their matches throughout the season. The page is built with a focus on dynamic data, powerful filtering, and a clear, responsive layout.

## Features

*   **Tabbed Interface:** The content is organized into three distinct tabs for easy navigation:
    *   **Fixtures:** Shows all upcoming matches, including those that have been `scheduled` or `rescheduled`.
    *   **Results:** Displays all `completed` matches.
    *   **Postponed:** Lists all matches marked as `postponed`.
*   **Dynamic Data Loading:** All match data is fetched in real-time from the `match_results` collection in Firestore.
*   **Season Selector:** A dropdown menu allows users to easily switch between different seasons and view historical data.
*   **Advanced Filtering:** A modal window provides options to filter the view by a specific team or competition.
*   **Collapsible Weekly View:** Matches are grouped by the week they are scheduled in. These weekly groups are presented in `<details>` elements that can be collapsed and expanded by the user.
*   **Spare Slot Generation:** The "Fixtures" tab intelligently identifies and displays available time slots on match nights, making it easy to see where postponed games can be rescheduled.
*   **Conditional Spare Slot Display:** The spare slots are now hidden whenever a filter for a team or competition is active, as they are only relevant in the unfiltered view.

## Design & Layout

The layout of the weekly fixture list has been carefully refined to provide a clean and intuitive user experience.

*   **Initial State:** By default, all weekly fixture lists load in an expanded (`open`) state, giving users a full overview at a glance.
*   **Results Tab Sorting:** The "Results" tab now displays the weekly fixture groups in reverse chronological order, showing the most recent results first. The matches within each week remain in their original chronological order.
*   **Expanded View:** An expanded fixture list (`<details open>`) is styled with `display: block` and `width: fit-content`. This combination forces the element onto its own line and, crucially, makes the container shrink to perfectly fit the width of the results table within it.
*   **Collapsed View:** When a user collapses a section, the header (`<summary>`) is styled with `display: inline-block` and given a fixed width of `325px`. This allows the collapsed headers to arrange themselves in a neat, grid-like pattern, stacking and wrapping horizontally.
*   **Icon Component Correction:** The filter button icon, which was previously not displaying, has been fixed by correcting the `icon-component` tag in the HTML from `icon="select.svg"` to `name="select"`. This ensures the SVG icon is loaded correctly.
*   **Conditional Columns:** To improve clarity and relevance, several table columns are rendered conditionally based on the active tab:
    *   The **Score** column is hidden on the "Fixtures" and "Postponed" tabs.
    *   The **Status** column is hidden on the "Postponed" tab. Its header is removed on the "Results" tab to create a cleaner look. On the "Fixtures" tab, it has been moved to the last column.
    *   A **Postponed by** column is shown exclusively on the "Postponed" tab, displaying the name of the team that postponed the match.
*   **Conditional Status Display:**
    *   On the **Fixtures tab**, the "Status" column is intentionally left blank for normally `scheduled` matches to reduce clutter but shows the status for `rescheduled` matches.
*   **Highlighting Rescheduled Fixtures:** To further differentiate them, `rescheduled` fixtures are highlighted with a light yellow background color on the "Fixtures" tab.
*   **Cup Week Identification:** Weeks that consist exclusively of cup matches (i.e., not "Premier Division" or "First Division" games) are marked as "cup weeks." This calculation explicitly ignores any `rescheduled` or `spare` matches to ensure accuracy. The header for these weeks is styled with a distinct yellow background.
*   **Column Sizing:** The results table uses fixed-width columns to ensure a stable, readable, and well-aligned layout. The `.home-team-col` and `.away-team-col` have been widened to prevent inconsistent container sizes caused by long team names. All status-related columns (`.status-cell` and `.postponed-by-col`) have a uniform width of `150px`.
    *   Date: `110px`, Time: `90px`, Home Team: `180px`, Away Team: `180px`, Score: `80px`, Competition: `200px`, Round: `150px`, Status/Postponed by: `150px`.
*   **Spare Row Formatting:** The "Spare slot for Postponed Fixtures" rows now correctly span all columns in the table, including the final "Status" column, for a visually consistent appearance.

## File Structure

*   **`public/fixtures_results.html`:** The main HTML file containing the page structure.
*   **`public/fixtures_results.js`:** The core JavaScript file responsible for all client-side logic, including data fetching, rendering, and user interactions.
*   **`public/fixtures-results-page.css`:** The dedicated stylesheet for this page.
