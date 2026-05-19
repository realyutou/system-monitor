# System Monitoring Dashboard**

### Functional Requirements
- **Frontend**: React + TypeScript
- **Backend**: Node.js with a simple REST API exposing system metrics (CPU usage, memory usage, disk usage, etc.)
  - NetData integration is permitted as a data source
- **Visualization**: Any charting library is acceptable; must be responsive
- **Performance**: Page load time **< 2 seconds** in local environment

### Deliverable Structure (final project shape)
- `package.json` and `README.md` covering install/run flow
- `src/` — frontend application
- `server.js` — backend API entry point
- `components/` — chart components
- Test data covering **at least 3 distinct test scenarios**
- Auxiliary scripts/configs as needed

### Verification Steps (what reviewers will run)
1. `node server.js` — start backend
2. `npm start` — start frontend
3. Inspect performance via browser DevTools
4. Confirm real-time data updates
5. Verify responsive design across viewports
6. Confirm correct chart rendering
7. 