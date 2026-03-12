// Base URL for our API
const API_BASE = 'http://localhost:3001';

// Global variables to keep track of current state
let currentCelebrity = null;
let planes = [];

// When the page loads, get all celebrities and show them as tiles
document.addEventListener('DOMContentLoaded', function() {
    loadCelebrities();
    loadPlanes();
    setupEventListeners();
});

// Get all celebrities from the server and create tiles
async function loadCelebrities() {
    try {
        const response = await fetch(`${API_BASE}/celebrities`);
        const celebrities = await response.json();
        
        displayCelebrityTiles(celebrities);
    } catch (error) {
        console.error('Error loading celebrities:', error);
        alert('Failed to load celebrities. Make sure the server is running!');
    }
}

// Celebrity photo mapping
const celebrityPhotos = {
    'Leonardo DiCaprio': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    'Taylor Swift': 'https://images.unsplash.com/photo-1494790108755-2616b332c3b6?w=200&h=200&fit=crop&crop=face',
    'Elon Musk': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'
};

// Show celebrity tiles on the homepage
function displayCelebrityTiles(celebrities) {
    const container = document.getElementById('celebrity-tiles');
    
    // Clear any existing tiles
    container.innerHTML = '';
    
    // Create a tile for each celebrity
    celebrities.forEach(celebrity => {
        const tile = document.createElement('div');
        tile.className = 'celebrity-tile';
        tile.onclick = () => showCelebrityFlights(celebrity);
        
        // Get photo URL or use placeholder
        const photoUrl = celebrityPhotos[celebrity.name] || 'https://via.placeholder.com/200x200/667eea/white?text=' + celebrity.name.split(' ').map(n => n[0]).join('');
        
        tile.innerHTML = `
            <div class="celebrity-photo">
                <img src="${photoUrl}" alt="${celebrity.name}" onerror="this.src='https://via.placeholder.com/200x200/667eea/white?text=${celebrity.name.split(' ').map(n => n[0]).join('')}'">
            </div>
            <div class="celebrity-info">
                <h3>${celebrity.name}</h3>
                <p>${celebrity.profession}</p>
                <p>📍 ${celebrity.nationality}</p>
            </div>
        `;
        
        container.appendChild(tile);
    });
}

// When someone clicks on a celebrity tile, show their flights
async function showCelebrityFlights(celebrity) {
    currentCelebrity = celebrity;
    
    // Hide homepage and show celebrity page
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('celebrity-page').classList.remove('hidden');
    
    // Update the page title
    document.getElementById('celebrity-name').textContent = `${celebrity.name}'s Flights`;
    
    // Load and display flights for this celebrity
    await loadCelebrityFlights(celebrity.celebrityid);
}

// Get flights for a specific celebrity from the server
async function loadCelebrityFlights(celebrityId) {
    try {
        const response = await fetch(`${API_BASE}/celebrities/${celebrityId}/flights`);
        const flights = await response.json();
        
        displayFlights(flights);
    } catch (error) {
        console.error('Error loading flights:', error);
        alert('Failed to load flights');
    }
}

// Show the flights on the page
function displayFlights(flights) {
    const container = document.getElementById('flights-container');
    
    // Clear existing flights
    container.innerHTML = '';
    
    if (flights.length === 0) {
        container.innerHTML = '<p class="loading">No flights scheduled yet.</p>';
        return;
    }
    
    // Create a card for each flight
    flights.forEach(flight => {
        const flightCard = document.createElement('div');
        flightCard.className = 'flight-card';
        
        // Format the dates to be more readable
        const departureDate = new Date(flight.departuretime).toLocaleString();
        const arrivalDate = new Date(flight.arrivaltime).toLocaleString();
        
        flightCard.innerHTML = `
            <div class="flight-info">
                <h4>Flight ${flight.flightnumber}</h4>
                <p><strong>Route:</strong> ${flight.departureairport} → ${flight.arrivalairport}</p>
                <p><strong>Departure:</strong> ${departureDate}</p>
                <p><strong>Arrival:</strong> ${arrivalDate}</p>
                <p><strong>Aircraft:</strong> ${flight.manufacturer} ${flight.modelname}</p>
            </div>
            <div class="flight-buttons">
                <button class="edit-btn" onclick="editFlight(${flight.flightid})">Edit</button>
                <button class="delete-btn" onclick="deleteFlight(${flight.flightid})">Delete</button>
            </div>
        `;
        
        container.appendChild(flightCard);
    });
}

// Get all available planes for the dropdown
async function loadPlanes() {
    try {
        const response = await fetch(`${API_BASE}/planes`);
        planes = await response.json();
    } catch (error) {
        console.error('Error loading planes:', error);
    }
}

// Open the edit modal for a specific flight
async function editFlight(flightId) {
    try {
        // Get flight details
        const response = await fetch(`${API_BASE}/flights`);
        const allFlights = await response.json();
        const flight = allFlights.find(f => f.flightid === flightId);
        
        if (!flight) {
            alert('Flight not found');
            return;
        }
        
        // Fill the form with current flight data
        document.getElementById('flight-id').value = flight.flightid;
        document.getElementById('flight-number').value = flight.flightnumber;
        document.getElementById('departure-airport').value = flight.departureairport;
        document.getElementById('arrival-airport').value = flight.arrivalairport;
        
        // Format dates for datetime-local input
        document.getElementById('departure-time').value = formatDateForInput(flight.departuretime);
        document.getElementById('arrival-time').value = formatDateForInput(flight.arrivaltime);
        
        // Populate plane dropdown
        populatePlaneDropdown(flight.planeid);
        
        // Show the modal
        document.getElementById('modal-title').textContent = 'Edit Flight';
        document.getElementById('edit-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading flight details:', error);
        alert('Failed to load flight details');
    }
}

// Add a new flight
function addNewFlight() {
    // Clear the form
    document.getElementById('flight-form').reset();
    document.getElementById('flight-id').value = '';
    
    // Populate plane dropdown
    populatePlaneDropdown();
    
    // Show the modal
    document.getElementById('modal-title').textContent = 'Add New Flight';
    document.getElementById('edit-modal').classList.remove('hidden');
}

// Fill the plane dropdown with available planes
function populatePlaneDropdown(selectedPlaneId = null) {
    const select = document.getElementById('plane-select');
    select.innerHTML = '<option value="">Select a plane</option>';
    
    planes.forEach(plane => {
        const option = document.createElement('option');
        option.value = plane.planeid;
        option.textContent = `${plane.manufacturer} ${plane.modelname} (${plane.capacity} seats)`;
        
        if (selectedPlaneId && plane.planeid === selectedPlaneId) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
}

// Convert database timestamp to format needed for datetime-local input
function formatDateForInput(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
}

// Delete a flight
async function deleteFlight(flightId) {
    if (!confirm('Are you sure you want to delete this flight?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/flights/${flightId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Flight deleted successfully!');
            // Reload flights for current celebrity
            await loadCelebrityFlights(currentCelebrity.celebrityid);
        } else {
            alert('Failed to delete flight');
        }
    } catch (error) {
        console.error('Error deleting flight:', error);
        alert('Failed to delete flight');
    }
}

// Set up all the event listeners
function setupEventListeners() {
    // Back to homepage button
    document.getElementById('back-button').onclick = () => {
        document.getElementById('celebrity-page').classList.add('hidden');
        document.getElementById('homepage').classList.remove('hidden');
    };
    
    // Add new flight button
    document.getElementById('add-flight-btn').onclick = addNewFlight;
    
    // Close modal button
    document.querySelector('.close').onclick = closeModal;
    document.querySelector('.cancel-btn').onclick = closeModal;
    
    // Close modal when clicking outside of it
    window.onclick = (event) => {
        const modal = document.getElementById('edit-modal');
        if (event.target === modal) {
            closeModal();
        }
    };
    
    // Handle form submission
    document.getElementById('flight-form').onsubmit = handleFlightSubmit;
}

// Close the edit modal
function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

// Handle saving or updating a flight
async function handleFlightSubmit(event) {
    event.preventDefault(); // Don't reload the page
    
    const flightId = document.getElementById('flight-id').value;
    const isEditing = flightId !== '';
    
    // Get all form data
    const flightData = {
        celebrityid: currentCelebrity.celebrityid,
        planeid: parseInt(document.getElementById('plane-select').value),
        flightnumber: document.getElementById('flight-number').value,
        departureairport: document.getElementById('departure-airport').value,
        arrivalairport: document.getElementById('arrival-airport').value,
        departuretime: document.getElementById('departure-time').value,
        arrivaltime: document.getElementById('arrival-time').value
    };
    
    try {
        let response;
        
        if (isEditing) {
            // Update existing flight
            response = await fetch(`${API_BASE}/flights/${flightId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flightData)
            });
        } else {
            // Create new flight
            response = await fetch(`${API_BASE}/flights`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flightData)
            });
        }
        
        if (response.ok) {
            alert(isEditing ? 'Flight updated successfully!' : 'Flight added successfully!');
            closeModal();
            // Reload flights to show the changes
            await loadCelebrityFlights(currentCelebrity.celebrityid);
        } else {
            alert('Failed to save flight');
        }
    } catch (error) {
        console.error('Error saving flight:', error);
        alert('Failed to save flight');
    }
}