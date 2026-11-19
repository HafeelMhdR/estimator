# Corporate Estimation & Invoicing Modular Engine

A robust, self-healing frontend document engine designed for professional project estimation and proforma invoicing over shared LAN/VPN environments.

## Core Features
1. **Modular Database Architecture (Self-Refining)** 
   Connects seamlessly to a shared LAN folder and automatically generates 5 separate JSON files (`sys_db.json`, `company.json`, `codes.json`, `projectCodes.json`, `clients.json`). If the master file (`sys_db.json`) is ever corrupted due to an unstable VPN connection, the system silently auto-heals by instantly pulling the required isolated component JSON files.

2. **Branching Document Revisions**
   The History tab acts as a strict version-control engine. When loading an estimation:
   *   **Edit Mode:** Confirms and explicitly overwrites the currently selected document to correct typos. 
   *   **Revise Mode:** Forces the creation of a brand new forward document iteration (e.g. `R1`, `R2`) without destroying past historical data. The system actively blocks you from unintentionally saving over older revisions.

3. **Smart Data Population & Auto-Fill**
   *   **Estimation Templates:** Download a blank Microsoft Excel Template directly from the Builder tab, populate it rapidly in Excel, and instantly upload it back to dynamically render massive Estimations in seconds.
   *   **Contextual Description Caching:** The Item Code dropdown will smartly push pre-defined descriptions into your items, *unless* it detects you have manually edited the text (which it will respect and leave untouched).

4. **Live Dashboard & Tracking**
   Track Quotes Built, Approved Submissions, and Pending Proposals dynamically from the front page.

## Deployment Instructions
This architecture contains purely static, serverless components. No node installations or PHP servers are required.
1. Download all source files (`index.html`, `js/`, `css/`).
2. Deploy onto any local machine or execute via Github Pages / Netlify hosting.
3. Open `index.html` on a modern Chromium browser.

## Database Management & Recovery
Navigate to the **Dashboard** and open the **Database Manager**.
*   **Factory Reset:** If connected to a LAN folder, executing a Factory Reset will completely and securely wipe both the local browser cache and the remote Master Network Files, giving you a fresh, clean slate.
*   **Module Uploads:** Instead of overriding an entire database, you can selectively upload individual `codes.json` or `clients.json` files directly from their respective tabs under Data Libraries.
