const IP = "http://10.10.58.127";

//độ ẩm không khí
async function getHumidity() {
  try {
    const res = await fetch(`${IP}/get_air_humidity`);
    const value = await res.text();

    document.getElementById("humidity-1").innerText = parseInt(value) + "%";

    console.log("Humidity:", value);
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

    console.log("Temperature:", value);
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

    console.log("Light:", value);
  } catch (err) {
    console.error("Light Error:", err);
  }
}

//threshhold
async function getThresholds() {
  try {
    const [lowRes, highRes] = await Promise.all([
      fetch(`${IP}/get_Threshold_Low_Default`),
      fetch(`${IP}/get_Threshold_High_Default`)
    ]);
    const low = await lowRes.text();
    const high = await highRes.text();

    document.getElementById("threshhold-low").value = low;
    document.getElementById("threshhold-high").value = high;
  } catch (err) {
    console.error("Threshold Error:", err);
  }
}

//trạng thái bơm
async function getPumpState() {
  try {
    const res = await fetch(`${IP}/get_Pump_State`);
    const state = await res.text();

    document.getElementById("pump-state").innerText = state;

    console.log("Pump State:", state);

    if (state.trim().toLowerCase() === "on") {
      document.getElementById("water-status").innerText = "💧 Dừng tưới";
    } else {
      document.getElementById("water-status").innerText = "💧 Tưới ngay";
    }
  } catch (err) {
    console.error("Pump State Error:", err);
  }
}

function loadAllSensors() {
  getHumidity();
  getTemperature();
  getSoilMoisture();
  getLight();
  getPumpState();
}

loadAllSensors();
getThresholds();

setInterval(loadAllSensors, 1000);
setInterval(getThresholds, 10000);

// // const IP = "http://192.168.10.10";
// const IP = "http://172.20.10.4";
// // const IP = "https://2514f12b-b0b5-4d1c-840e-41ae0567ff6e.mock.pstmn.io";

// async function getSensorData() {
//   try {
//     const [humidityRes, tempRes, soilRes, lightRes, thresholdLowRes, thresholdHighRes, pumpStateRes] = await Promise.all([
//       fetch(`${IP}/get_air_humidity`),
//       fetch(`${IP}/get_temperature`),
//       fetch(`${IP}/get_soil_moisture`),
//       fetch(`${IP}/get_light`),
//       fetch(`${IP}/get_Threshold_Low_Default`),
//       fetch(`${IP}/get_Threshold_High_Default`),
//       fetch(`${IP}/get_Pump_State`)
//     ]);

//     const humidity = await humidityRes.text();
//     const temperature = await tempRes.text();
//     const soil = await soilRes.text();
//     const light = await lightRes.text();
//     const thresholdLow = await thresholdLowRes.text();
//     const thresholdHigh = await thresholdHighRes.text();
//     const pumpState = await pumpStateRes.text();

  
//     data = {
//       humidity: parseInt(humidity),
//       temperature: parseInt(temperature),
//       soil: parseInt(soil),
//       light: parseInt(light),
//       thresholdLow: parseInt(thresholdLow),
//       thresholdHigh: parseInt(thresholdHigh),
//       pumpState: pumpState
//     };
//     console.log("load data", data);

//     updateUI(data);
//     updateChart(soil);

//     setTimeout(getSensorData, 1000);

//     return {
//       humidity: parseInt(humidity),
//       temperature: parseInt(temperature),
//       soil: parseInt(soil)
//     };

//   } catch (err) {
//     return null;
//   }
// }
// getSensorData();

// // ===== UPDATE UI =====
// function updateUI(data) {

//   if (!data) return;
//   // console.log(data);

//   // độ ẩm đất
//   // updateMoisture(1, data.soil);
//   document.getElementById("moisture-1").innerText =
//     data.soil + "%";

//   // nhiệt độ
//   document.getElementById("temp-1").innerText =
//     data.temperature + "°C";

//   // độ khói
//   document.getElementById("humidity-1").innerText =
//     data.humidity + "%";

//   // ánh sáng (tạm dùng humidity giả lập)
//   document.getElementById("light-1").innerText =
//     data.light + "%";

//   // ThreshHold
//   document.getElementById("threshhold-low").value =
//     data.threshold_low;
//   document.getElementById("threshhold-high").value =
//     data.threshold_high;
//   // PUMP
//   document.getElementById("pump-state").innerText =
//     data.pump_state;

//   if (data.pump_state.trim().toLowerCase() === "on") {
//     document.getElementById("water-status").innerText = "💧 Dừng tưới";
//   } else {
//     document.getElementById("water-status").innerText = "💧 Tưới ngay";
//   }

// }

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

//ThreshHold change
function threshHoldLowChange() {
  let value = document.getElementById("threshhold-low").value;
  console.log("New threshold low:", value);

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
    // document.getElementById("water-status").innerText = "💧 Tưới ngay";
  } else {
    controlPump("on");
    // document.getElementById("water-status").innerText = "💧 Dừng tưới";
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

// function controlPump(state) {

//   fetch(`${IP}/control_pump?state=${state}`)
//     .then(res => res.text())
//     .then(data => {

//       console.log("Pump:", data);

//       // cập nhật trạng thái lên UI
//       document.getElementById("pump-state").innerText =
//         state.toUpperCase();

//     })
//     .catch(err => console.error("Pump Error:", err));
// }
//   updateMoisture(id, newValue);
// }
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

// //THRESHOLD

// function threshHoldLowChange() {

//   const value =
//     document.getElementById("threshhold-low").value;

//   fetch(`${IP}/set_Threshold_Low_Default`, {
//     method: "POST",
//     headers: {
//       "Content-Type":
//         "application/x-www-form-urlencoded"
//     },
//     body:
//       "value=" + encodeURIComponent(value)
//   })
//     .then(res => res.json())
//     .then(data => {
//       console.log(data);
//     })
//     .catch(err => console.error(err));
// }

// function threshHoldHighChange() {

//   const value =
//     document.getElementById("threshhold-high").value;

//   fetch(`${IP}/set_Threshold_High_Default`, {
//     method: "POST",
//     headers: {
//       "Content-Type":
//         "application/x-www-form-urlencoded"
//     },
//     body:
//       "value=" + encodeURIComponent(value)
//   })
//     .then(res => res.json())
//     .then(data => {
//       console.log(data);
//     })
//     .catch(err => console.error(err));
// }

//PUMP
// function waterNow() {

//   const currentState =
//     document.getElementById("pump-state")
//       .innerText
//       .trim()
//       .toLowerCase();

//   if (currentState === "on") {
//     controlPump("off");
//   } else {
//     controlPump("on");
//   }
// }

// function controlPump(state) {

//   fetch(`${IP}/control_pump`, {
//     method: "POST",
//     headers: {
//       "Content-Type":
//         "application/x-www-form-urlencoded"
//     },
//     body:
//       "state=" + encodeURIComponent(state)
//   })
//     .then(res => res.json())
//     .then(data => {

//       console.log(data);

//       document.getElementById("pump-state")
//         .innerText = state.toUpperCase();

//       if (state === "on") {
//         document.getElementById("water-status")
//           .innerText = "💧 Dừng tưới";
//       } else {
//         document.getElementById("water-status")
//           .innerText = "💧 Tưới ngay";
//       }

//     })
//     .catch(err => console.error(err));
// }

// // ================= CAMERA =================

// async function viewCamera(mode) {

//   const camFeed =
//     document.getElementById("cam-feed");

//   const camStatus =
//     document.getElementById("cam-status");

//   const esp32CamIp =
//     "http://192.168.1.19";

//   window.currentCameraMode = mode;

//   if (mode === "image") {

//     camStatus.style.display = "block";
//     camStatus.innerText =
//       "Đang gửi lệnh chụp ảnh...";

//     camFeed.style.display = "none";
//     camFeed.src = "";

//     if (typeof stopStream === "function")
//       await stopStream();

//     if (typeof sendCaptureCommand === "function")
//       await sendCaptureCommand();

//   }
//   else if (mode === "stream") {

//     camStatus.style.display = "block";
//     camStatus.innerText =
//       "Đang khởi động Stream...";

//     camFeed.style.display = "none";
//     camFeed.src = "";

//     if (typeof startStream === "function")
//       await startStream();

//     setTimeout(() => {

//       if (
//         window.currentCameraMode !==
//         "stream"
//       ) return;

//       camStatus.style.display = "none";
//       camFeed.style.display = "block";

//       camFeed.src =
//         `${esp32CamIp}:81/stream`;

//     }, 5000);
//   }
//   else if (mode === "stop") {

//     if (typeof stopStream === "function")
//       await stopStream();

//     camFeed.style.display = "none";
//     camFeed.src = "";

//     camStatus.style.display = "block";
//     camStatus.innerText =
//       "Đã tắt Camera";
//   }
// }