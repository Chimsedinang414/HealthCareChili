const IP = "http://172.20.10.4";
// const IP = "http://192.168.1.10";// ip sensor

async function getSensorData() {
  try {
    const [humidityRes, tempRes, soilRes] = await Promise.all([
      fetch(`${IP}/get_air_humidity`),
      fetch(`${IP}/get_temperature`),
      fetch(`${IP}/get_soil_moisture`),
      fetch(`${IP}/get_light`),
      fetch(`${IP}/get_Threshold_Low_Default`),
      fetch(`${IP}/get_Threshold_High_Default`),
      fetch(`${IP}/get_Pump_State`)
    ]);

    const humidity = await humidityRes.text();
    const temperature = await tempRes.text();
    const soil = await soilRes.text();
    const light = await lightRes.text();
    const thresholdLow = await thresholdLowRes.text();
    const thresholdHigh = await thresholdHighRes.text();
    const pumpState = await pumpStateRes.text();

  
    data = {
      humidity: parseInt(humidity),
      temperature: parseInt(temperature),
      soil: parseInt(soil),
      light: parseInt(light),
      thresholdLow: parseInt(thresholdLow),
      thresholdHigh: parseInt(thresholdHigh),
      pumpState: pumpState
    };
    console.log("load data", data);

    updateUI(data);
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
  // updateMoisture(1, data.soil);
  document.getElementById("soil-1").innerText =
    data.soil + "%";

  // nhiệt độ
  document.getElementById("temp-1").innerText =
    data.temperature + "°C";

  // ánh sáng (tạm dùng humidity giả lập)
  document.getElementById("light-1").innerText =
    data.humidity + "%";

  document.getElementById("threshold-low").innerText =
    "Ngưỡng thấp: " + data.thresholdLow + "%";
  document.getElementById("threshold-high").innerText =
    "Ngưỡng cao: " + data.thresholdHigh + "%";

  document.getElementById("pump-state").innerText =
    "Bơm: " + data.pumpState;

  if(data.pumpState.trim().toLowerCase() === "on") {
    document.getElementById("pump-state").style.color = "green";
  } else {
    document.getElementById("pump-state").style.color = "red";
  }
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
function threshHoldLowChange() {
  let value = document.getElementById("threshold-low-input").value;
  console.log("New threshold low", value);

   fetch(`${IP}/set_Threshold_Low_Default`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "value=" + encodeURIComponent(value)
  })
    .then(res => res.json())
    .then(data => {
      alert("Server response: " + JSON.stringify(data));
      console.log(data);
    })
    .catch(err => console.error("Error:", err));
}

function threshHoldHighChange() {
  let value = document.getElementById("threshhold-high").value;
  console.log("New threshold high:", value);

  fetch(`${IP}/set_Threshold_High_Default`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "value=" + encodeURIComponent(value)
  })
    .then(res => res.json())
    .then(data => {
      alert("Server response: " + JSON.stringify(data));
      console.log(data);
    })
    .catch(err => console.error("Error:", err));
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

function waterNow() {
  let currentState = document.getElementById("pump-state").innerText.trim().toLowerCase();

  //nếu on -> off
  if (currentState === "on") {
    controlPump("off");
    document.getElementById("water-status").innerText = "💧 Tưới ngay";
  } else {
    controlPump("on");
    document.getElementById("water-status").innerText = "💧 Dừng tưới";
  }
}

function controlPump(state) {
  fetch(`${IP}/control_pump`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "state=" + encodeURIComponent(state)
  })
    .then(res => res.json())
    .then(data => {
      console.log(data);
    })
    .catch(err => console.error("Error:", err));

  console.log("Pump state changed to:", state);
}


async function viewCamera(mode) {
  const camFeed = document.getElementById('cam-feed');
  const camStatus = document.getElementById('cam-status');

  // ĐỊA CHỈ IP TĨNH CỦA ESP32-CAM TRONG MẠNG LOCAL 
  const esp32CamIp = "http://192.168.1.19";
  // const esp32CamIp = "http://10.10.58.207";

  window.currentCameraMode = mode;

  if (mode === 'image') {
    camStatus.style.display = 'block';
    camStatus.innerText = 'Đang gửi lệnh chụp ảnh tới ESP32-CAM...';
    camFeed.style.display = 'none';
    camFeed.src = '';

    // Dừng stream nếu có và gửi lệnh chụp
    if (typeof stopStream === 'function') await stopStream();
    if (typeof sendCaptureCommand === 'function') await sendCaptureCommand();
  }
  else if (mode === 'stream') {
    camStatus.style.display = 'block';
    camStatus.innerText = 'Đang khởi động Stream (Vui lòng đợi 3-5 giây)...';
    camFeed.style.display = 'none';
    camFeed.src = '';

    // Gọi API báo cho backend bật stream
    if (typeof startStream === 'function') await startStream();

    // Đợi 5 giây để ESP32-CAM kịp nhận lệnh và khởi động WebServer
    setTimeout(() => {
      if (window.currentCameraMode !== 'stream') return;
      camStatus.style.display = 'none';
      camFeed.style.display = 'block';
      camFeed.src = `${esp32CamIp}:81/stream`;
    }, 5000);
  }
  else if (mode === 'stop') {
    if (typeof stopStream === 'function') await stopStream();
    camFeed.style.display = 'none';
    camFeed.src = "";
    camStatus.style.display = 'block';
    camStatus.innerText = 'Đã tắt Camera. Hệ thống chuyển về chế độ chờ.';
  }
}