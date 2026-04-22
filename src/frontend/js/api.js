// API communication functions
const API_BASE_URL = 'http://localhost:3000/api';

async function fetchSensorData() {
    try {
        const response = await fetch(`${API_BASE_URL}/sensors`);
        const data = await response.json();
        displaySensorData(data);
    } catch (error) {
        console.error('Error fetching sensor data:', error);
    }
}

function displaySensorData(data) {
    const sensorDiv = document.getElementById('sensor-data');
    sensorDiv.innerHTML = '<p>Loading sensor data...</p>';
    // Implement data display logic
}

// Load data on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchSensorData();
});