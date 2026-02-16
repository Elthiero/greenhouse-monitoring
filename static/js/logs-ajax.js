const LOGS_API = "/api/readings/";
const ZONES_API = "/api/zones/";
const REFRESH_INTERVAL = 5000; // 5 seconds

let allLogs = [];     // Store all fetched logs here
let zonesMap = {};    // Map ID -> Name
let refreshTimer = null;

document.addEventListener("DOMContentLoaded", () => {
    initLogsPage();
});

async function initLogsPage() {
    await loadZones();      // 1. Get Zones for dropdown & mapping
    await fetchLogs();      // 2. Get initial logs

    // 3. Start Auto-Refresh Interval
    refreshTimer = setInterval(fetchLogs, REFRESH_INTERVAL);
}

// --- 1. Load Zones & Setup Dropdown ---
async function loadZones() {
    try {
        const response = await fetch(ZONES_API);
        const zones = await response.json();

        const filterSelect = document.getElementById("logZoneFilter");
        zonesMap = {}; // Reset map

        // Clear existing options except "All Zones"
        filterSelect.innerHTML = '<option value="all">All Zones</option>';

        zones.forEach(zone => {
            // Map ID to Name for the table
            zonesMap[zone.id] = zone.name;

            // Add to dropdown
            const option = document.createElement("option");
            option.value = zone.id;
            option.textContent = zone.name;
            filterSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading zones:", error);
    }
}

// --- 2. Fetch Logs ---
async function fetchLogs() {
    try {
        const response = await fetch(LOGS_API);
        if (!response.ok) throw new Error("Network response was not ok");

        allLogs = await response.json();

        // Update "Last Update" time
        const now = new Date();
        document.getElementById("logsLastUpdate").textContent = now.toLocaleTimeString();

        // Render the table
        renderLogs();

    } catch (error) {
        console.error("Error fetching logs:", error);
        document.getElementById("logsLastUpdate").textContent = "Connection Error";
    }
}

// --- 3. Render Table (With Client-Side Filtering) ---
function renderLogs() {
    const tbody = document.getElementById("logsTableBody");
    const filterValue = document.getElementById("logZoneFilter").value;

    tbody.innerHTML = "";

    // Filter logs based on dropdown selection
    const filteredLogs = allLogs.filter(log => {
        if (filterValue === "all") return true;
        // Ensure type comparison works (API might return int, value is string)
        return log.zone == filterValue;
    });

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No logs found.</td></tr>`;
        return;
    }

    filteredLogs.forEach(log => {
        // Resolve Zone Name
        // Adjust 'log.zone' depending on if your API returns an ID or object
        const zoneId = (typeof log.zone === 'object') ? log.zone.id : log.zone;
        const zoneName = zonesMap[zoneId] || `Zone #${zoneId}`;

        // Format Timestamp
        const dateObj = new Date(log.timestamp || log.created_at); // Handle different field names
        const dateStr = dateObj.toLocaleString('en-GB', {
            timeZone: 'Africa/Kigali',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        // Status Logic (Example: If temp > 30, it's a Warning)
        // You can adjust these thresholds or use a status field from your API if it exists
        const statusBadge = log.is_alert
            ? '<span class="badge bg-danger">Critical</span>'
            : '<span class="badge bg-success">Normal</span>';

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><small>${dateStr}</small></td>
            <td><strong>${zoneName}</strong></td>
            <td>${log.temperature}°C</td>
            <td>${log.humidity}%</td>
            <td>${log.soil_moisture}%</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

// --- 4. Event Listener for Filter ---
// Attached directly in HTML (onchange="filterLogs()"), so we define it globally
window.filterLogs = renderLogs;