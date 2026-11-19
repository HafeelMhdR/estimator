# Estimation & Invoicing Modular Engine

A robust, self-healing frontend document engine designed for professional project estimation and proforma invoicing over shared LAN/VPN environments.

## Features
*   **Modular Database (Self-Refining):** Connects to a LAN folder and auto-generates 5 separate JSON files (`sys_db.json`, `company.json`, `codes.json`, `projectCodes.json`, `clients.json`). If a file corrupts, the system rebuilds it instantly.
*   **Estimation Branching & Revision Control:** Cleanly handles edit overwrites, safely creates branching R1/R2 revisions, and aggressively prevents you from corrupting old document histories.
*   **Smart Auto-Fill & Template Uploading:** Pre-load estimation lines dynamically via Excel templates, and intelligently populate code descriptions without overwriting user-customized text. 
*   **Dashboard Tracker:** Track Quotes Built, Pending Approvals, and Internal Libraries with real-time UI counters.

## Installation & Deployment
This app contains purely serverless HTML/JS/CSS.
1. Download all source files.
2. Drop them onto any local machine or a fast GitHub Pages/Netlify deployment. 
3. Run `index.html`.

## Hybrid-Database Operations
*   **Factory Resetting:** Use the new **Database Manager** on the Dashboard to factory reset your local application and simultaneously wipe the server connection.
*   **Module Uploads:** You can directly import `clients.json` or `codes.json` into their respective tabs without overriding your entire active database.
