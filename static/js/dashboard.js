const API = {
    zonesList: "/api/zones/",
    zoneData: (id) => `/chart-data/zone/${id}/`,
    topMoisture: "/chart-data/top-moisture/",
    dailyAlerts: "/chart-data/daily-alerts/"
};

let chartInstances = {};
let zoneFetchController = null; // CONTROL VARIABLE: Holds the "Stop" button for requests

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

async function initDashboard() {
    await initZoneDropdown();
    initCharts();
    
    // Start Loops
    refreshFastData(); 
    refreshSlowData();

    // LISTEN FOR CHANGES
    document.getElementById("zoneSelect").addEventListener("change", (e) => {
        // 1. Force Abort any background timer requests immediately
        if (zoneFetchController) {
            zoneFetchController.abort();
        }
        // 2. Fetch new data immediately
        fetchZoneHistory(e.target.value);
    });
}

// --- LOOP 1: FAST DATA (Temp/Humidity) ---
async function refreshFastData() {
    const currentZoneId = document.getElementById("zoneSelect").value;
    if (currentZoneId) {
        // We pass 'false' to say "This is a background update, keep animations"
        await fetchZoneHistory(currentZoneId, false);
    }
    
    // Update timestamp
    const timeDisplay = document.getElementById("lastUpdateTime");
    if(timeDisplay) timeDisplay.textContent = new Date().toLocaleTimeString();

    // Schedule next run
    setTimeout(refreshFastData, 5000); 
}

// --- LOOP 2: SLOW DATA (Alerts/Top Soil) ---
async function refreshSlowData() {
    await Promise.all([
        fetchTopMoisture(),
        fetchDailyAlerts()
    ]);
    setTimeout(refreshSlowData, 60000); 
}

// --- CORE FUNCTION: FETCH ZONE HISTORY ---
async function fetchZoneHistory(zoneId, isManualChange = true) {
    // 1. If this is a manual change (user clicked), cancel any existing background requests
    if (isManualChange && zoneFetchController) {
        zoneFetchController.abort();
    }

    // 2. Create a new "Stop Button" (Controller) for this specific request
    zoneFetchController = new AbortController();
    const signal = zoneFetchController.signal;

    try {
        const response = await fetch(API.zoneData(zoneId), { signal });
        
        if (!response.ok) throw new Error("Zone data fetch failed");
        
        const data = await response.json(); 

        // 3. Update Charts
        // If user manually changed zone, use 'none' to SNAP instantly (no animation delay)
        // If it's a background timer, use 'active' or default to look smooth
        const updateMode = isManualChange ? 'none' : 'active';

        if (chartInstances.temp) {
            chartInstances.temp.data.labels = data.labels;
            chartInstances.temp.data.datasets[0].data = data.temperature;
            chartInstances.temp.update(updateMode); 
        }

        if (chartInstances.hum) {
            chartInstances.hum.data.labels = data.labels;
            chartInstances.hum.data.datasets[0].data = data.humidity;
            chartInstances.hum.update(updateMode);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            // This is good! It means we successfully killed an old request
            console.log("Previous request cancelled to prioritize new selection.");
        } else {
            console.error(error);
        }
    }
}

// ... (Keep fetchTopMoisture, fetchDailyAlerts, initCharts, initZoneDropdown exactly as they were) ...
// B. Top 10 Soil Moisture (Global)
async function fetchTopMoisture() {
    try {
        const response = await fetch(API.topMoisture);
        const data = await response.json();
        // Expected format: { labels: ["Zone A", "Zone B"], data: [80, 45] }

        chartInstances.soil.data.labels = data.labels;
        chartInstances.soil.data.datasets[0].data = data.data;
        chartInstances.soil.update();

    } catch (error) {
        console.error("Moisture fetch error:", error);
    }
}

// C. Daily Alerts (Global)
async function fetchDailyAlerts() {
    try {
        const response = await fetch(API.dailyAlerts);
        const data = await response.json();
        // Expected format: { labels: ["Mon", "Tue"], data: [5, 2] }

        chartInstances.alerts.data.labels = data.labels;
        chartInstances.alerts.data.datasets[0].data = data.data;
        chartInstances.alerts.update();

    } catch (error) {
        console.error("Alerts fetch error:", error);
    }
}

// --- 4. Chart Initialization ---
function initCharts() {
    const ctxTemp = document.getElementById('temperatureChart').getContext('2d');
    const ctxHum = document.getElementById('humidityChart').getContext('2d');
    const ctxSoil = document.getElementById('soilMoistureChart').getContext('2d');
    const ctxAlert = document.getElementById('alertsChart').getContext('2d');

    // 1. Temperature (Line)
    chartInstances.temp = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#dc3545', // Red
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // 2. Humidity (Line)
    chartInstances.hum = new Chart(ctxHum, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humidity (%)',
                data: [],
                borderColor: '#0dcaf0', // Blue
                backgroundColor: 'rgba(13, 202, 240, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
    });

    // 3. Soil Moisture (Bar - Horizontal looks better for names)
    chartInstances.soil = new Chart(ctxSoil, {
        type: 'bar', // or 'bar' with indexAxis: 'y' for horizontal
        data: {
            labels: [],
            datasets: [{
                label: 'Moisture (%)',
                data: [],
                backgroundColor: '#198754', // Green
                borderRadius: 4
            }]
        },
        options: { 
            indexAxis: 'y', // Makes it a horizontal bar chart
            responsive: true, 
            maintainAspectRatio: false,
            scales: { x: { max: 100 } }
        }
    });

    // 4. Alerts (Bar - Changed from Doughnut to visualize Days)
    chartInstances.alerts = new Chart(ctxAlert, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Alerts',
                data: [],
                backgroundColor: '#ffc107', // Warning Yellow
                borderRadius: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}
// --- 1. Dropdown Logic ---
async function initZoneDropdown() {
    try {
        const response = await fetch(API.zonesList);
        const zones = await response.json();
        
        const select = document.getElementById("zoneSelect");
        select.innerHTML = ""; // Clear "All Zones" as the new view requires an ID

        if (zones.length > 0) {
            zones.forEach(zone => {
                const option = document.createElement("option");
                option.value = zone.id;
                option.textContent = zone.name;
                select.appendChild(option);
            });
            // Select the first zone by default so charts aren't empty
            select.value = zones[0].id;
        } else {
            select.innerHTML = '<option disabled>No Zones Found</option>';
        }
    } catch (error) {
        console.error("Failed to load zones list:", error);
    }
}