const API_URL = "/api/zones/";
let zonesData = []; // Store zones globally to avoid re-fetching for details
let currentDetailId = null; // Track which zone is currently being viewed

// 1. Initialization
document.addEventListener("DOMContentLoaded", () => {
    loadZones();
});

// 2. Helper: Get CSRF Token
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

// 3. READ: Fetch and Render
function loadZones() {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            zonesData = data; // Update global state
            renderTable(zonesData);
        })
        .catch(error => console.error("Error loading zones:", error));
}

function renderTable(zones) {
    const tbody = document.getElementById("zonesTableBody");
    tbody.innerHTML = "";

    if (zones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No zones found.</td></tr>`;
        return;
    }

    zones.forEach(zone => {
        const createdDate = new Date(zone.created_at).toLocaleDateString();
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${zone.name}</strong></td>
            <td>${zone.location}</td>
            <td class="text-muted">${zone.description || '<em class="small">Not provided</em>'}</td>
            <td>${new Date(createdDate).toLocaleString('en-US', {timeZone: 'Africa/Kigali',month: 'long',day: 'numeric',year: 'numeric'})}</td>
                       
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openZoneDetail(${zone.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openZoneModal('edit', ${zone.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteZone(${zone.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 4. CREATE & UPDATE: Open Modal
function openZoneModal(mode, zoneId = null) {
    const modalElement = document.getElementById("zoneModal");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("zoneForm");
    const title = document.getElementById("zoneModalTitle");
    const idInput = document.getElementById("zoneId");

    // Reset validation styles and form
    form.reset();

    if (mode === "add") {
        title.innerHTML = '<i class="fas fa-plus"></i> Add New Zone';
        idInput.value = ""; // Clear ID for new entry
    } else {
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Zone';
        const zone = zonesData.find(z => z.id === zoneId);
        if (zone) {
            idInput.value = zone.id;
            document.getElementById("zoneName").value = zone.name;
            document.getElementById("zoneLocation").value = zone.location;
            document.getElementById("zoneDescription").value = zone.description || "";
        }
    }
    modal.show();
}

// 5. CREATE & UPDATE: Save Logic
function saveZone() {
    const id = document.getElementById("zoneId").value;
    const name = document.getElementById("zoneName").value;
    const location = document.getElementById("zoneLocation").value;
    const description = document.getElementById("zoneDescription").value;

    if (!name || !location) {
        alert("Please fill in all required fields.");
        return;
    }

    const payload = { name, location, description };

    // Determine Method and URL
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}${id}/` : API_URL;

    fetch(url, {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) throw new Error("Failed to save");
            return response.json();
        })
        .then(() => {
            // Hide Modal
            const modalEl = document.getElementById("zoneModal");
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();

            // Refresh Table
            loadZones();

            // Show success message (Optional: use a toast)
            // alert("Saved successfully!"); 
        })
        .catch(error => console.error("Error saving:", error));
}

// 6. DELETE Logic
function deleteZone(id) {
    if (!confirm("Are you sure you want to delete this zone?")) return;

    fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": csrftoken
        }
    })
        .then(response => {
            if (response.ok) {
                loadZones();
            } else {
                alert("Failed to delete zone.");
            }
        })
        .catch(error => console.error("Error deleting:", error));
}

// 7. READ: Details Modal
function openZoneDetail(id) {
    currentDetailId = id;
    const zone = zonesData.find(z => z.id === id);
    if (!zone) return;

    document.getElementById("detailName").innerText = zone.name;
    document.getElementById("detailLocation").innerText = zone.location;
    document.getElementById("detailDescription").innerText = zone.description || "No description provided.";

    // Setup the "Edit" button inside the Detail modal
    const editBtn = document.getElementById("btnEditFromDetail");
    editBtn.onclick = function () {
        // Close detail modal first
        const detailModal = bootstrap.Modal.getInstance(document.getElementById("zoneDetail"));
        detailModal.hide();
        // Open edit modal
        openZoneModal('edit', id);
    };

    const modal = new bootstrap.Modal(document.getElementById("zoneDetail"));
    modal.show();
}