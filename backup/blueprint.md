# SSC Web App Blueprint

This document outlines the development plan for the SSC (Saturday Social Cricket) web application.

## **High-Level Objective**

To create a comprehensive and user-friendly web application for the Saturday Social Cricket league. The application will provide functionalities for players, captains, and administrators to manage league-related activities, including viewing fixtures, results, league tables, player statistics, and managing user accounts.

## **Current Implementation**

### **Core Features:**

*   **Firebase Integration:** The application is connected to Firebase for authentication, Firestore database, and storage.
*   **Modular Design:** Shared UI components like the header, footer, and navigation are loaded dynamically into pages.
*   **User Authentication:** A robust login/registration system (`login.html`) supports email/password and Google sign-in.
*   **Player Profile Page:** A dedicated `profile.html` for authenticated users.
*   **Dynamic Header:** The header now dynamically shows the user's email and a sign-out link when logged in.

## **Development Plan: Account Linking Flow**

### **Objective**

To create a secure and user-friendly process for newly signed-up users to link their authentication account with their existing player record in the `players_private` Firestore collection. This prevents unauthorized access and ensures that each user is connected to the correct data.

### **Implementation Steps**

1.  **Create `public/link.html` & `public/link-page.css`:**
    *   Design a new page with a form that prompts the user to enter their first name, last name, and one piece of identifying information (DOB, post code, mobile, or home number).
    *   Style the page to be consistent with the rest of the application.

2.  **Create `public/link.js`:**
    *   Implement the client-side logic for the linking page.
    *   On form submission, it will query the `players_private` collection based on the user-provided details.
    *   If a unique match is found, it will update the corresponding player document by writing the user's Firebase `authId` into a new `authId` field.
    *   Provide clear error messages if no match is found, if multiple matches are found, or if another error occurs.
    *   Upon successful linking, redirect the user to their `profile.html`.

3.  **Create `public/auth-check.js`:**
    *   Develop a central authentication script that will be included on all protected pages.
    *   This script listens for changes in the user's authentication state.
    *   When a user is logged in, it queries the `players_private` collection to see if a document with their `authId` exists.
    *   If no linked document is found, it automatically redirects the user to `link.html`.
    *   If a linked document is found and the user is on the `link.html` page, it redirects them to their `profile.html`.

4.  **Update `public/login.js`:**
    *   Modify the login and registration success handlers to redirect users to the homepage (`index.html`). The `auth-check.js` script will then take over and route them appropriately.

5.  **Update Core Pages (`index.html`, etc.):**
    *   Add the `auth-check.js` script to all relevant pages to ensure the linking check is performed for every authenticated user session.

### **Current Status**

This plan has been implemented. The account linking flow is now a core part of the authentication process, ensuring a secure connection between user accounts and their player data.
