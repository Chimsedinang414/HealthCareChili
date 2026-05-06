const IP = "http://10.10.58.198";
// const IP = "http://192.168.1.10";// ip sensor

async function getSensorData() {
  try {
    const [humidityRes, tempRes, soilRes] = await Promise.all([
      fetch(`${IP}/get_air_humidity`),
      fetch(`${IP}/get_temperature`),
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

async function viewCamera(mode) {
  const camFeed = document.getElementById('cam-feed');
  const camStatus = document.getElementById('cam-status');

  // ĐỊA CHỈ IP TĨNH CỦA ESP32-CAM TRONG MẠNG LOCAL (Lấy từ Serial Monitor)
  // const esp32CamIp = "http://192.168.1.17";
  const esp32CamIp = "http://10.10.58.207";

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