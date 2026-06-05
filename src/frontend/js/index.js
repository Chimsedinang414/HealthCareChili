const IP = "http://192.168.1.12";

//độ ẩm không khí
async function getHumidity() {
  try {
    const res = await fetch(`${IP}/get_air_humidity`);
    const value = await res.text();

    document.getElementById("humidity-1").innerText = parseInt(value) + "%";

    // console.log("Humidity:", value);
  } catch (err) {
    console.error("Humidity Error:", err);
  }
}

//nhiệt độ
async function getTemperature() {
  try {
    const res = await fetch(`${IP}/get_temperature`);
    const value = await res.text();

    document.getElementById("temp-1").innerText = parseInt(value) + "°C";

    // console.log("Temperature:", value);
  } catch (err) {
    console.error("Temperature Error:", err);
  }
}

//độ ẩm đất
async function getSoilMoisture() {
  try {
    const res = await fetch(`${IP}/get_soil_moisture`);
    const value = await res.text();

    document.getElementById("moisture-1").innerText = parseInt(value) + "%";

    console.log("Soil Moisture:", value);

    updateChart(value);
  } catch (err) {
    console.error("Soil Moisture Error:", err);
  }
}

//ánh sáng
async function getLight() {
  try {
    const res = await fetch(`${IP}/get_light`);
    const value = await res.text();

    document.getElementById("light-1").innerText = parseInt(value) + "%";

    // console.log("Light:", value);
  } catch (err) {
    console.error("Light Error:", err);
  }
}

//threshhold
async function getThresholds() {
  try {
    const [lowRes, highRes] = await Promise.all([
      fetch(`${IP}/get_Threshold_Low`),
      fetch(`${IP}/get_Threshold_High`)
    ]);
    const low = await lowRes.text();
    const high = await highRes.text();

    console.log("Thresholds:", low, high);
    const threshhold_low = document.getElementById("threshhold-low");
    const threshhold_high = document.getElementById("threshhold-high");
    console.log(threshhold_low.value);
    console.log(threshhold_high.value);

    if (threshhold_low !== document.activeElement && threshhold_low.value != low) document.getElementById("threshhold-low").value = low;
    if (threshhold_high !== document.activeElement && threshhold_high.value != high) document.getElementById("threshhold-high").value = high;
  } catch (err) {
    console.error("Threshold Error:", err);
  }
}

//trạng thái bơm
let pumpState = false;
async function getPumpState() {
  try {
    const res = await fetch(`${IP}/get_Pump_State`);
    const state = await res.text();
    // const state = "off";

    const btn = document.getElementById("water-status");
    const status = document.getElementById("pump-status");

    // console.log("Pump State:", state);

    if (state.trim().toLowerCase() === "on") {
      btn.innerText = "💧 Dừng tưới";
      status.textContent = "Đang bật";
      pumpState = true;
    } else {
      btn.innerText = "💧 Tưới ngay";
      status.textContent = "Đang tắt";
      pumpState = false;
    }
  } catch (err) {
    console.error("Pump State Error:", err);
  }
  getPumpAutoMode();
}

async function getPumpAutoMode() {
  try {
    const res = await fetch(`${IP}/get_Pump_AutoMode`);
    const state = await res.text();
    // const state = "off";

    // console.log("Pump Auto Mode:", state);
    if (state.trim().toLowerCase() === "on") {
      document.getElementById("water-status").setAttribute("style", "background: gray !important;");
      document.getElementById("water-auto-mode").setAttribute("style", "background: linear-gradient(135deg, #3b82f6, #2563eb);");

    } else {
      document.getElementById("water-status").setAttribute("style", "background: linear-gradient(135deg, #3b82f6, #2563eb);");
      document.getElementById("water-auto-mode").setAttribute("style", "background: gray !important;");
    }
  }
  catch (err) {
    console.error("Pump Auto Mode Error:", err);
  }

}

//trạng thái đèn
let lightState = false;
async function getLightState() {
  try {
    const res = await fetch(`${IP}/get_lightState`);
    const state = await res.text();
    // const state = "off";

    // console.log("Light State:", state);

    const status =
      document.getElementById("light-status");

    const btn =
      document.getElementById("light-btn");

    if (state.trim().toLowerCase() === "on") {
      status.textContent = "Đang bật";
      status.className = "status-on";

      btn.textContent = "Tắt đèn";

      lightState = true;
    } else {
      status.textContent = "Đang tắt";
      status.className = "status-off";

      btn.textContent = "Bật đèn";
      lightState = false;
    }
  } catch (err) {
    console.error("Light State Error:", err);
  }

  getLightAutoMode();
}

async function getLightAutoMode() {
  try {
    const res = await fetch(`${IP}/get_lightAutoMode`);
    const state = await res.text();
    // const state = "on";

    // console.log("Light Auto Mode:", state);
    if (state.trim().toLowerCase() === "on") {
      document.getElementById("light-btn").setAttribute("style", "background: gray !important;");
      document.getElementById("light-auto-mode").style.backgroundColor = "";

    } else {
      document.getElementById("light-btn").style.backgroundColor = "";
      document.getElementById("light-auto-mode").setAttribute("style", "background: gray !important;");
    }
  }
  catch (err) {
    console.error("Light Auto Mode Error:", err);
  }
}

async function loadAllSensors() {
  await getHumidity();
  await getTemperature();
  await getSoilMoisture();
  await getLight();
  await getPumpState();
  await getLightState();
}

loadAllSensors();
getThresholds();

setInterval(loadAllSensors, 2000);
setInterval(getThresholds, 2000);
// // CHART
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


// ===== UPDATE CHART =====
let lastTime = new Date() - 30000;
function updateChart(value) {
  const time = new Date();
  console.log(time - lastTime);
  if (time - lastTime < 20000) return;//30s
  lastTime = time;

  chart.data.labels.push(time.toLocaleTimeString());
  chart.data.datasets[0].data.push(value);

  // giới hạn 50  điểm
  if (chart.data.labels.length > 60) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}

//ThreshHold change
function threshHoldLowChange() {
  let value = document.getElementById("threshhold-low").value;
  console.log("New threshold low:", value);

  fetch(`${IP}/set_Threshold_Low`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "value=" + encodeURIComponent(value)
  })
    .then(res => res.json())
    .then(data => {
      console.log("Server response: " + JSON.stringify(data));
    })
    .catch(err => console.error("Error:", err));
}


function threshHoldHighChange() {
  let value = document.getElementById("threshhold-high").value;
  console.log("New threshold high:", value);

  fetch(`${IP}/set_Threshold_High`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "value=" + encodeURIComponent(value)
  })
    .then(res => res.json())
    .then(data => {
      console.log("Server response: " + JSON.stringify(data));
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
  let currentState = pumpState ? "on" : "off";

  //nếu on -> off
  if (currentState === "on") {
    controlPump("off");
    // document.getElementById("water-status").innerText = "💧 Tưới ngay";
  } else {
    controlPump("on");
    // document.getElementById("water-status").innerText = "💧 Dừng tưới";
  }
  getPumpState();
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

function turnOnPumpAutoMode() {
  fetch(`${IP}/pump_auto_mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
  })
    .then(res => res.json())
    .then(data => {
      console.log(data);
      getPumpState();
    })
    .catch(err => console.error("Error:", err));
}

//đèn

async function controlLight() {
  state = lightState ? "off" : "on";
  console.log("Light state changed to:", state);
  try {

    await fetch(`${IP}/control_light`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "state=" + encodeURIComponent(state)
    }).then(res => res.json())
      .then(data => {
        console.log(data);
        getLightState();
      })
      .catch(err => console.error("Error:", err));

  } catch (err) {
    console.error(err);
  }
  getLightState();
}

async function turnOnLightAutoMode() {
  try {
    await fetch(`${IP}/light_auto_mode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
    });
  } catch (err) {
    console.error(err);
  }
}


// async function viewCamera(mode) {
//   const camFeed = document.getElementById('cam-feed');
//   const camStatus = document.getElementById('cam-status');

//   // ĐỊA CHỈ IP TĨNH CỦA ESP32-CAM TRONG MẠNG LOCAL 
//   const esp32CamIp = "http://192.168.5.208";
//   // const esp32CamIp = "http://10.10.58.207";

//   window.currentCameraMode = mode;

//   if (mode === 'image') {
//     camStatus.style.display = 'block';
//     camStatus.innerText = 'Đang gửi lệnh chụp ảnh tới ESP32-CAM...';
//     camFeed.style.display = 'none';
//     camFeed.src = '';

//     // Dừng stream nếu có và gửi lệnh chụp
//     if (typeof stopStream === 'function') await stopStream();
//     if (typeof sendCaptureCommand === 'function') await sendCaptureCommand();
//   }
//   else if (mode === 'stream') {
//     camStatus.style.display = 'block';
//     camStatus.innerText = 'Đang khởi động Stream (Vui lòng đợi 3-5 giây)...';
//     camFeed.style.display = 'none';
//     camFeed.src = '';

//     // Gọi API báo cho backend bật stream
//     if (typeof startStream === 'function') await startStream();

//     // Đợi 5 giây để ESP32-CAM kịp nhận lệnh và khởi động WebServer
//     setTimeout(() => {
//       if (window.currentCameraMode !== 'stream') return;
//       camStatus.style.display = 'none';
//       camFeed.style.display = 'block';
//       camFeed.src = `${esp32CamIp}:81/stream`;
//     }, 5000);
//   }
//   else if (mode === 'stop') {
//     if (typeof stopStream === 'function') await stopStream();
//     camFeed.style.display = 'none';
//     camFeed.src = "";
//     camStatus.style.display = 'block';
//     camStatus.innerText = 'Đã tắt Camera. Hệ thống chuyển về chế độ chờ.';
//   }
// }


// const chart = new Chart(
//   document.getElementById("chart"),
//   {
//     type: "line",
//     data: {
//       labels: [],
//       datasets: [
//         {
//           label: "Độ ẩm đất (%)",
//           data: [],
//           borderWidth: 3,
//           tension: 0.4
//         }
//       ]
//     }
//   }
// );

// function updateChart(value) {

//   const time =
//     new Date().toLocaleTimeString();

//   chart.data.labels.push(time);
//   chart.data.datasets[0].data.push(value);

//   if (chart.data.labels.length > 10) {
//     chart.data.labels.shift();
//     chart.data.datasets[0].data.shift();
//   }

//   chart.update();
// }

// ================= CAMERA =================

async function viewCamera(mode) {

  const camFeed =
    document.getElementById("cam-feed");

  const camStatus =
    document.getElementById("cam-status");

  const esp32CamIp =
    "http://192.168.1.19";

  window.currentCameraMode = mode;

  if (mode === "image") {

    camStatus.style.display = "block";
    camStatus.innerText =
      "Đang gửi lệnh chụp ảnh...";

    camFeed.style.display = "none";
    camFeed.src = "";

    if (typeof stopStream === "function")
      await stopStream();

    if (typeof sendCaptureCommand === "function")
      await sendCaptureCommand();

  }
  else if (mode === "stream") {

    camStatus.style.display = "block";
    camStatus.innerText =
      "Đang khởi động Stream...";

    camFeed.style.display = "none";
    camFeed.src = "";

    if (typeof startStream === "function")
      await startStream();

    setTimeout(() => {

      if (
        window.currentCameraMode !==
        "stream"
      ) return;

      camStatus.style.display = "none";
      camFeed.style.display = "block";

      camFeed.src =
        `${esp32CamIp}:81/stream`;

    }, 5000);
  }
  else if (mode === "stop") {

    if (typeof stopStream === "function")
      await stopStream();

    camFeed.style.display = "none";
    camFeed.src = "";

    camStatus.style.display = "block";
    camStatus.innerText =
      "Đã tắt Camera";
  }
}