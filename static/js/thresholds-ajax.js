const THRESHOLDS_API = "/api/thresholds/"; // Adjust if your URL is different
const ZONES_API = "/api/zones/"; 

let thresholdsData = [];
let zonesMap = {}; // Object to map ID -> Name (e.g., {1: "Zone A"})

document.addEventListener("DOMContentLoaded", () => {
    loadData();
});

// --- CSRF Token Helper ---
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie("csrftoken");

// --- 1. Load Data (Zones first, then Thresholds) ---
async function loadData() {
    try {
        // 1. Fetch Zones to get names
        const zoneRes = await fetch(ZONES_API);
        const zones = await zoneRes.json();
        
        // Create a quick lookup map: { 1: "Zone A", 2: "Greenhouse" }
        zonesMap = {};
        zones.forEach(z => {
            zonesMap[z.id] = z.name;
        });

        // 2. Fetch Thresholds
        const threshRes = await fetch(THRESHOLDS_API);
        thresholdsData = await threshRes.json();

        renderTable(thresholdsData);

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// --- 2. Render Table ---
function renderTable(data) {
    const tbody = document.getElementById("thresholdsTableBody");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No thresholds found.</td></tr>`;
        return;
    }

    data.forEach(item => {
        // Look up zone name using the map. If not found, fall back to "Zone #ID"
        const zoneName = zonesMap[item.zone] || `Zone #${item.zone}`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${zoneName}</strong></td>
            <td>${item.target_temp_min} - ${item.target_temp_max}°C</td>
            <td>${item.target_humidity_min} - ${item.target_humidity_max}%</td>
            <td>${item.min_moisture} - ${item.max_moisture}%</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openEditModal(${item.id})">
                    <i class="fas fa-edit"></i> Edit Limits
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- 3. Modal Logic ---
function openEditModal(id) {
    const modalEl = document.getElementById("thresholdModal");
    const modal = new bootstrap.Modal(modalEl);
    
    const item = thresholdsData.find(t => t.id === id);
    if (!item) return;

    // Populate Hidden ID
    document.getElementById("thresholdId").value = item.id;
    
    // Show Read-Only Zone Name
    const zoneName = zonesMap[item.zone] || `Zone #${item.zone}`;
    document.getElementById("displayZoneName").innerText = zoneName;
    
    // Populate Fields (Using YOUR API field names)
    document.getElementById("tempMin").value = item.target_temp_min;
    document.getElementById("tempMax").value = item.target_temp_max;
    
    document.getElementById("humidityMin").value = item.target_humidity_min;
    document.getElementById("humidityMax").value = item.target_humidity_max;
    
    document.getElementById("soilMin").value = item.min_moisture;
    document.getElementById("soilMax").value = item.max_moisture;

    modal.show();
}

// --- 4. Save Logic (PUT) ---
function saveThreshold() {
    const id = document.getElementById("thresholdId").value;
    
    // Map inputs back to YOUR API field names
    const payload = {
        // We do not send "zone" or "id" in the body for a simple patch/update usually, 
        // but if your serializer requires them, add them back.
        // Usually for PUT, just the fields to update is enough.
        
        target_temp_min: parseFloat(document.getElementById("tempMin").value),
        target_temp_max: parseFloat(document.getElementById("tempMax").value),
        target_humidity_min: parseFloat(document.getElementById("humidityMin").value),
        target_humidity_max: parseFloat(document.getElementById("humidityMax").value),
        min_moisture: parseFloat(document.getElementById("soilMin").value),
        max_moisture: parseFloat(document.getElementById("soilMax").value),
    };

    // Validation
    if (payload.target_temp_min >= payload.target_temp_max || 
        payload.target_humidity_min >= payload.target_humidity_max || 
        payload.min_moisture >= payload.max_moisture) {
        alert("Minimum values must be lower than maximum values.");
        return;
    }

    // Determine the original item to get the Zone ID if the API strictly requires it
    const originalItem = thresholdsData.find(t => t.id == id);
    if(originalItem) {
        payload.zone = originalItem.zone; // Include zone ID just in case
    }

    fetch(`${THRESHOLDS_API}${id}/`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
    })
    .then(() => {
        // Close Modal
        const modalEl = document.getElementById("thresholdModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        // Reload Data
        loadData();
    })
    .catch(err => {
        console.error("Update error:", err);
        alert("Error updating thresholds.");
    });
}