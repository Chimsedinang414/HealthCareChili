const IP = "http://10.10.58.87";

async function getSensorData() {
  try {
    const [humidityRes, tempRes, soilRes] = await Promise.all([
      fetch(`${IP}/get_air_humidity`),
      fetch( `${IP}/get_temperature`),
      fetch(`${IP}/get_soil_moisture`)
    ]);
    
    const humidity = await humidityRes.text();
    const temperature = await tempRes.text();
    const soil = await soilRes.text();
    
    console.log("load data", humidity, temperature, soil);

    updateUI({ humidity, temperature, soil });
    updateChart(soil);
    
    setTimeout(getSensorData, 1000);
    
    return {
      humidity: parseInt(humidity),
      temperature: parseInt(temperature),
      soil: parseInt(soil)
    };
    
  } catch (err) {
    return null;
  }
}
getSensorData();

// CHART
const chart = new Chart(document.getElementById("chart"), {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: "Độ ẩm đất (%)",
      data: [],
      borderWidth: 3,
      tension: 0.4
    }]
  }
});

// ===== UPDATE UI =====
function updateUI(data) {
  if (!data) return;

  // độ ẩm đất
  updateMoisture(1, data.soil);

  // nhiệt độ
  document.getElementById("temp-1").innerText =
    data.temperature + "°C";

  // ánh sáng (tạm dùng humidity giả lập)
  document.getElementById("light-1").innerText =
    data.humidity + "%";
}

// ===== UPDATE CHART =====
function updateChart(value) {
  const time = new Date().toLocaleTimeString();

  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(value);

  // giới hạn 10 điểm
  if (chart.data.labels.length > 10) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}

// MOISTURE
function updateMoisture(id, value) {
  let text = document.getElementById(`moisture-text-${id}`);

  let status = "Tốt";
  let color = "green";

  if (value < 30) {
    status = "Khô";
    color = "red";
  } else if (value < 60) {
    status = "Cần tưới";
    color = "orange";
  }

  text.innerText = value + "% - " + status;
  text.style.color = color;
}

function waterNow(id) {
  let text = document.getElementById(`moisture-text-${id}`);
  let num = parseInt(text.innerText);

  let newValue = Math.min(num + 30, 100);

  updateMoisture(id, newValue);
}