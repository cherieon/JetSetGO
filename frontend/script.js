const API_BASE = "";

// â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentCelebrity = null;
let planes = [];
let currentTab = "tracker";

// â”€â”€â”€ Tracker state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let trackerMap;
let trackerMapInitialised = false;
let trackerRefreshTimer = null;
let activeMarkers = [];

const REGIONS = {
    world:        { center: [25, 8],   zoom: 2.2 },
    northAmerica: { lamin: 14, lamax: 72, lomin: -169, lomax: -52,  center: [39, -98],  zoom: 4 },
    europe:       { lamin: 35, lamax: 71, lomin: -11,  lomax: 31,   center: [50, 10],   zoom: 5 },
    asia:         { lamin: 5,  lamax: 56, lomin: 65,   lomax: 145,  center: [32, 105],  zoom: 4 },
    middleEast:   { lamin: 12, lamax: 42, lomin: 30,   lomax: 65,   center: [26, 45],   zoom: 5 }
};

document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    setupEventListeners();
    loadCelebrities();
    loadPlanes();
    // Start on tracker tab â€” init map and begin feed
    activateTrackerTab();
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  TAB SWITCHING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    document.querySelectorAll(".page").forEach((page) => {
        page.classList.toggle("hidden", page.id !== `page-${tab}`);
    });

    if (tab === "tracker") {
        activateTrackerTab();
    } else if (tab === "aircraft") {
        loadAndRenderPlanes();
        clearInterval(trackerRefreshTimer);
        trackerRefreshTimer = null;
    } else {
        // Pause live refresh while on the celebrity page
        clearInterval(trackerRefreshTimer);
        trackerRefreshTimer = null;
    }
}

function activateTrackerTab() {
    if (!trackerMapInitialised) {
        initializeTrackerMap();
        trackerMapInitialised = true;
    } else {
        // Leaflet needs a size hint when the container becomes visible
        trackerMap.invalidateSize();
    }
    refreshLiveFlights();
    if (!trackerRefreshTimer) {
        trackerRefreshTimer = window.setInterval(refreshLiveFlights, 30000);
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PAGE 1 â€” LIVE TRACKER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function initializeTrackerMap() {
    trackerMap = L.map("tracker-map", {
        zoomControl: false,
        worldCopyJump: true,
        minZoom: 2
    }).setView([25, 8], 2.2);

    L.control.zoom({ position: "bottomright" }).addTo(trackerMap);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(trackerMap);
}

async function refreshLiveFlights() {
    const statusPill = document.getElementById("status-pill");
    const trafficMeta = document.getElementById("traffic-meta");
    const selectedRegion = document.getElementById("region-select").value;
    const region = REGIONS[selectedRegion];

    statusPill.textContent = "Syncing...";
    statusPill.className = "status-pill syncing";

    try {
        const params = new URLSearchParams();
        if (region && region.lamin !== undefined) {
            params.set("lamin", String(region.lamin));
            params.set("lamax", String(region.lamax));
            params.set("lomin", String(region.lomin));
            params.set("lomax", String(region.lomax));
        }

        const url = `${API_BASE}/api/live-flights${params.toString() ? `?${params}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.details || `HTTP ${response.status}`);
        }

        const data = await response.json();
        renderLiveFlights(data.flights || []);

        const stamp = data.fetchedAt ? new Date(data.fetchedAt * 1000) : new Date();
        trafficMeta.textContent = `${data.total || 0} aircraft Â· updated ${stamp.toLocaleTimeString()}`;
        statusPill.textContent = "Live";
        statusPill.className = "status-pill live";

    } catch (err) {
        console.error("Live tracker error:", err);
        const msg = err.message.includes("429")
            ? "Rate limited by OpenSky â€” retrying in 30s"
            : `Feed unavailable (${err.message})`;
        trafficMeta.textContent = msg;
        statusPill.textContent = "Offline";
        statusPill.className = "status-pill offline";
    }
}

function renderLiveFlights(flights) {
    activeMarkers.forEach((m) => m.remove());
    activeMarkers = [];

    const listContainer = document.getElementById("live-flight-list");
    listContainer.innerHTML = "";

    // Show the 150 fastest aircraft
    const visible = [...flights]
        .sort((a, b) => (b.velocity || 0) - (a.velocity || 0))
        .slice(0, 150);

    if (visible.length === 0) {
        listContainer.innerHTML = `<p class="loading">No aircraft found in this region right now.</p>`;
        return;
    }

    visible.forEach((flight) => {
        const heading = Number.isFinite(flight.trueTrack) ? flight.trueTrack : 0;
        const marker = L.marker([flight.latitude, flight.longitude], {
            icon: createPlaneIcon(heading)
        }).addTo(trackerMap);

        marker.bindPopup(`
            <div class="map-popup">
                <strong>${flight.callsign}</strong>
                <table>
                    <tr><td>Country</td><td>${flight.originCountry}</td></tr>
                    <tr><td>Altitude</td><td>${formatAltitude(flight.baroAltitude)}</td></tr>
                    <tr><td>Speed</td><td>${formatSpeed(flight.velocity)}</td></tr>
                    <tr><td>Heading</td><td>${Number.isFinite(flight.trueTrack) ? `${Math.round(flight.trueTrack)}°` : "N/A"}</td></tr>
                    <tr><td>ICAO24</td><td>${flight.icao24}</td></tr>
                    <tr><td>On ground</td><td>${flight.onGround ? "Yes" : "No"}</td></tr>
                </table>
            </div>
        `);

        activeMarkers.push(marker);

        const row = document.createElement("button");
        row.className = "live-flight-row";
        row.type = "button";
        row.innerHTML = `
            <span class="callsign">${flight.callsign}</span>
            <span class="route-meta">${flight.originCountry}</span>
            <span class="flight-stats">
                <span>${formatAltitude(flight.baroAltitude)}</span>
                <span class="speed">${formatSpeed(flight.velocity)}</span>
            </span>
        `;
        row.addEventListener("click", () => {
            trackerMap.flyTo([flight.latitude, flight.longitude], Math.max(trackerMap.getZoom(), 7), { duration: 0.6 });
            marker.openPopup();
        });

        listContainer.appendChild(row);
    });
}

function createPlaneIcon(heading) {
    return L.divIcon({
        className: "plane-icon-wrap",
        html: `<div class="plane-icon" style="transform:rotate(${heading}deg)">&#9992;</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
}

function formatAltitude(meters) {
    if (!Number.isFinite(meters) || meters <= 0) return "N/A";
    return `${Math.round(meters * 3.28084).toLocaleString()} ft`;
}

function formatSpeed(mps) {
    if (!Number.isFinite(mps)) return "N/A";
    return `${Math.round(mps * 1.94384)} kt`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  PAGE 2 â€” CELEBRITY FLIGHT MANAGER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

async function loadCelebrities() {
    try {
        const response = await fetch(`${API_BASE}/celebrities`);
        const celebrities = await response.json();
        displayCelebrityTiles(celebrities);
    } catch (err) {
        console.error("Error loading celebrities:", err);
    }
}

function displayCelebrityTiles(celebrities) {
    const container = document.getElementById("celebrity-tiles");
    container.innerHTML = "";

    celebrities.forEach((celeb) => {
        const tile = document.createElement("div");
        tile.className = "celebrity-tile";
        tile.innerHTML = `
            <div class="celeb-tile-main" style="display:flex;align-items:center;gap:12px;flex:1;cursor:pointer;">
                <div class="celeb-avatar">${celeb.name.charAt(0)}</div>
                <div class="celebrity-info">
                    <h3>${celeb.name}</h3>
                    <p>${celeb.profession}</p>
                    <p>${celeb.nationality}</p>
                </div>
                <span class="view-flights-arrow">&#8594;</span>
            </div>
            <div class="tile-actions">
                <button class="btn-icon btn-edit" title="Edit">&#9998;</button>
                <button class="btn-icon btn-delete" title="Delete">&#128465;</button>
            </div>
        `;
        tile.querySelector(".celeb-tile-main").onclick = () => showCelebrityFlights(celeb);
        tile.querySelector(".btn-edit").onclick = (e) => { e.stopPropagation(); openEditCelebrity(celeb); };
        tile.querySelector(".btn-delete").onclick = (e) => { e.stopPropagation(); deleteCelebrity(celeb.celebrityid, celeb.name); };
        container.appendChild(tile);
    });
}

async function showCelebrityFlights(celeb) {
    currentCelebrity = celeb;
    document.getElementById("homepage").classList.add("hidden");
    document.getElementById("celebrity-page").classList.remove("hidden");
    document.getElementById("celebrity-name").textContent = `${celeb.name}'s Flights`;
    await loadCelebrityFlights(celeb.celebrityid);
}

async function loadCelebrityFlights(celebrityId) {
    try {
        const response = await fetch(`${API_BASE}/celebrities/${celebrityId}/flights`);
        const flights = await response.json();
        displayFlights(flights);
    } catch (err) {
        console.error("Error loading flights:", err);
    }
}

function displayFlights(flights) {
    const container = document.getElementById("flights-container");
    container.innerHTML = "";

    if (flights.length === 0) {
        container.innerHTML = `<p class="loading">No flights scheduled yet. Add one below!</p>`;
        return;
    }

    flights.forEach((flight) => {
        const card = document.createElement("div");
        card.className = "flight-card";

        const dep = new Date(flight.departuretime).toLocaleString();
        const arr = new Date(flight.arrivaltime).toLocaleString();

        card.innerHTML = `
            <div class="flight-card-main">
                <div class="flight-route">
                    <span class="airport-code">${flight.departureairport}</span>
                    <span class="route-arrow">--&#9992;--</span>
                    <span class="airport-code">${flight.arrivalairport}</span>
                </div>
                <div class="flight-meta">
                    <span class="flight-number">${flight.flightnumber}</span>
                    <span>${flight.manufacturer} ${flight.modelname}</span>
                </div>
                <div class="flight-times">
                    <span>Dep: ${dep}</span>
                    <span>Arr: ${arr}</span>
                </div>
            </div>
            <div class="flight-buttons">
                <button class="edit-btn" onclick="editFlight(${flight.flightid})">Edit</button>
                <button class="delete-btn" onclick="deleteFlight(${flight.flightid})">Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadPlanes() {
    try {
        const response = await fetch(`${API_BASE}/planes`);
        planes = await response.json();
    } catch (err) {
        console.error("Error loading planes:", err);
    }
}

async function editFlight(flightId) {
    try {
        const response = await fetch(`${API_BASE}/flights`);
        const allFlights = await response.json();
        const flight = allFlights.find((f) => f.flightid === flightId);
        if (!flight) { alert("Flight not found"); return; }

        document.getElementById("flight-id").value = flight.flightid;
        document.getElementById("flight-number").value = flight.flightnumber;
        document.getElementById("departure-airport").value = flight.departureairport;
        document.getElementById("arrival-airport").value = flight.arrivalairport;
        document.getElementById("departure-time").value = formatDateForInput(flight.departuretime);
        document.getElementById("arrival-time").value = formatDateForInput(flight.arrivaltime);

        populatePlaneDropdown(flight.planeid);
        document.getElementById("modal-title").textContent = "Edit Flight";
        document.getElementById("edit-modal").classList.remove("hidden");
    } catch (err) {
        console.error("Error:", err);
        alert("Failed to load flight details");
    }
}

function addNewFlight() {
    document.getElementById("flight-form").reset();
    document.getElementById("flight-id").value = "";
    populatePlaneDropdown();
    document.getElementById("modal-title").textContent = "Add New Flight";
    document.getElementById("edit-modal").classList.remove("hidden");
}

function populatePlaneDropdown(selectedPlaneId = null) {
    const select = document.getElementById("plane-select");
    select.innerHTML = `<option value="">Select an aircraft</option>`;
    planes.forEach((plane) => {
        const opt = document.createElement("option");
        opt.value = plane.planeid;
        opt.textContent = `${plane.manufacturer} ${plane.modelname} (${plane.capacity} seats)`;
        if (selectedPlaneId && plane.planeid === selectedPlaneId) opt.selected = true;
        select.appendChild(opt);
    });
}

function formatDateForInput(ts) {
    return new Date(ts).toISOString().slice(0, 16);
}

async function deleteFlight(flightId) {
    if (!confirm("Delete this flight?")) return;
    try {
        const res = await fetch(`${API_BASE}/flights/${flightId}`, { method: "DELETE" });
        if (res.ok) {
            await loadCelebrityFlights(currentCelebrity.celebrityid);
        } else {
            alert("Failed to delete flight");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to delete flight");
    }
}

// ═══════════════════════════════════════════════════════════
//  CELEBRITY CArD
// ═══════════════════════════════════════════════════════════

function openAddCelebrity() {
    document.getElementById("celeb-form").reset();
    document.getElementById("celeb-id").value = "";
    document.getElementById("celeb-modal-title").textContent = "Add Celebrity";
    document.getElementById("celeb-modal").classList.remove("hidden");
}

function openEditCelebrity(celeb) {
    document.getElementById("celeb-id").value = celeb.celebrityid;
    document.getElementById("celeb-name").value = celeb.name;
    document.getElementById("celeb-profession").value = celeb.profession;
    document.getElementById("celeb-nationality").value = celeb.nationality;
    document.getElementById("celeb-modal-title").textContent = "Edit Celebrity";
    document.getElementById("celeb-modal").classList.remove("hidden");
}

async function deleteCelebrity(celebId, celebName) {
    if (!confirm(`Delete ${celebName} and all their flights?`)) return;
    try {
        const res = await fetch(`${API_BASE}/celebrities/${celebId}`, { method: "DELETE" });
        if (res.ok) {
            await loadCelebrities();
        } else {
            alert("Failed to delete celebrity");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to delete celebrity");
    }
}

async function handleCelebSubmit(event) {
    event.preventDefault();
    const celebId = document.getElementById("celeb-id").value;
    const isEditing = celebId !== "";
    const body = {
        name: document.getElementById("celeb-name").value,
        profession: document.getElementById("celeb-profession").value,
        nationality: document.getElementById("celeb-nationality").value
    };
    try {
        const res = await fetch(`${API_BASE}/celebrities${isEditing ? `/${celebId}` : ""}`, {
            method: isEditing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            closeModal("celeb-modal");
            await loadCelebrities();
        } else {
            alert("Failed to save celebrity");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to save celebrity");
    }
}

// ═══════════════════════════════════════════════════════════
//  PLANE MODEL CARD
// ═══════════════════════════════════════════════════════════

async function loadAndRenderPlanes() {
    try {
        const res = await fetch(`${API_BASE}/planes`);
        planes = await res.json();
        renderPlaneList(planes);
    } catch (err) {
        console.error("Error loading planes:", err);
    }
}

function renderPlaneList(planeData) {
    const container = document.getElementById("plane-list");
    container.innerHTML = "";
    if (planeData.length === 0) {
        container.innerHTML = `<p class="loading">No aircraft models yet. Add one above.</p>`;
        return;
    }
    planeData.forEach((plane) => {
        const card = document.createElement("div");
        card.className = "plane-card";
        card.innerHTML = `
            <div class="plane-card-info">
                <span class="plane-name">${plane.manufacturer} ${plane.modelname}</span>
                <span class="plane-meta">${plane.manufacturingyear} &middot; ${plane.capacity} seats &middot; ${plane.maxrangekm?.toLocaleString() ?? "?"} km range</span>
            </div>
            <div class="flight-buttons">
                <button class="edit-btn" onclick="openEditPlane(${plane.planeid})">Edit</button>
                <button class="delete-btn" onclick="deletePlane(${plane.planeid}, '${plane.manufacturer} ${plane.modelname}')">Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAddPlane() {
    document.getElementById("plane-form").reset();
    document.getElementById("plane-id").value = "";
    document.getElementById("plane-modal-title").textContent = "Add Aircraft";
    document.getElementById("plane-modal").classList.remove("hidden");
}

function openEditPlane(planeId) {
    const plane = planes.find((p) => p.planeid === planeId);
    if (!plane) return;
    document.getElementById("plane-id").value = plane.planeid;
    document.getElementById("plane-manufacturer").value = plane.manufacturer;
    document.getElementById("plane-modelname").value = plane.modelname;
    document.getElementById("plane-year").value = plane.manufacturingyear;
    document.getElementById("plane-capacity").value = plane.capacity;
    document.getElementById("plane-range").value = plane.maxrangekm;
    document.getElementById("plane-modal-title").textContent = "Edit Aircraft";
    document.getElementById("plane-modal").classList.remove("hidden");
}

async function deletePlane(planeId, planeName) {
    if (!confirm(`Delete ${planeName}?`)) return;
    try {
        const res = await fetch(`${API_BASE}/planes/${planeId}`, { method: "DELETE" });
        if (res.ok) {
            await loadAndRenderPlanes();
            await loadPlanes(); // refresh dropdown
        } else {
            const body = await res.json().catch(() => ({}));
            alert(body.error || "Failed to delete plane");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to delete plane");
    }
}

async function handlePlaneSubmit(event) {
    event.preventDefault();
    const planeId = document.getElementById("plane-id").value;
    const isEditing = planeId !== "";
    const body = {
        manufacturer: document.getElementById("plane-manufacturer").value,
        modelname: document.getElementById("plane-modelname").value,
        manufacturingyear: Number(document.getElementById("plane-year").value),
        capacity: Number(document.getElementById("plane-capacity").value),
        maxrangekm: Number(document.getElementById("plane-range").value)
    };
    try {
        const res = await fetch(`${API_BASE}/planes${isEditing ? `/${planeId}` : ""}`, {
            method: isEditing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            closeModal("plane-modal");
            await loadAndRenderPlanes();
            await loadPlanes(); // refresh dropdown cache
        } else {
            alert("Failed to save aircraft");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to save aircraft");
    }
}

// ═══════════════════════════════════════════════════════════
//  SHARED EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

function setupEventListeners() {
    // Tracker controls
    document.getElementById("refresh-live-btn").addEventListener("click", refreshLiveFlights);
    document.getElementById("region-select").addEventListener("change", () => {
        const region = REGIONS[document.getElementById("region-select").value];
        if (region) trackerMap.flyTo(region.center, region.zoom, { duration: 0.7 });
        refreshLiveFlights();
    });

    // Celebrity page
    document.getElementById("back-button").onclick = () => {
        document.getElementById("celebrity-page").classList.add("hidden");
        document.getElementById("homepage").classList.remove("hidden");
    };
    document.getElementById("add-flight-btn").onclick = addNewFlight;
    document.getElementById("add-celeb-btn").onclick = openAddCelebrity;

    // Aircraft page
    document.getElementById("add-plane-btn").onclick = openAddPlane;

    // Flight modal
    document.getElementById("flight-form").onsubmit = handleFlightSubmit;

    // Celebrity modal
    document.getElementById("celeb-form").onsubmit = handleCelebSubmit;

    // Plane modal
    document.getElementById("plane-form").onsubmit = handlePlaneSubmit;

    // Close buttons (data-modal attribute tells which modal to close)
    document.querySelectorAll(".close, .cancel-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.modal;
            if (target) closeModal(target);
        });
    });

    // Click outside any modal to close it
    window.addEventListener("click", (e) => {
        ["edit-modal", "celeb-modal", "plane-modal"].forEach((id) => {
            if (e.target === document.getElementById(id)) closeModal(id);
        });
    });
}

function closeModal(modalId = "edit-modal") {
    document.getElementById(modalId).classList.add("hidden");
}

async function handleFlightSubmit(event) {
    event.preventDefault();

    const flightId = document.getElementById("flight-id").value;
    const isEditing = flightId !== "";

    const flightData = {
        celebrityid: currentCelebrity.celebrityid,
        planeid: Number.parseInt(document.getElementById("plane-select").value, 10),
        flightnumber: document.getElementById("flight-number").value,
        departureairport: document.getElementById("departure-airport").value,
        arrivalairport: document.getElementById("arrival-airport").value,
        departuretime: document.getElementById("departure-time").value,
        arrivaltime: document.getElementById("arrival-time").value
    };

    try {
        const res = await fetch(`${API_BASE}/flights${isEditing ? `/${flightId}` : ""}`, {
            method: isEditing ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(flightData)
        });

        if (res.ok) {
            closeModal("edit-modal");
            await loadCelebrityFlights(currentCelebrity.celebrityid);
        } else {
            alert("Failed to save flight");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to save flight");
    }
}
