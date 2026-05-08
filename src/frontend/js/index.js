// const IP = "http://192.168.10.10";
const IP = "http://172.20.10.4";
// const IP = "https://2514f12b-b0b5-4d1c-840e-41ae0567ff6e.mock.pstmn.io";

async function getSensorData() {
  try {
    const [humidityRes, tempRes, soilRes, lightRes, thresholdLowRes, thresholdHighRes, pumpStateRes] = await Promise.all([
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
    const threshold_low = await thresholdLowRes.text();
    const threshold_high = await thresholdHighRes.text();
    const pump_state = await pumpStateRes.text();

    data = {
      humidity: humidity,
      temperature: temperature,
      soil: soil,
      light: light,
      threshold_low: threshold_low,
      threshold_high: threshold_high,
      pump_state: pump_state
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
  // console.log(data);

  // độ ẩm đất
  // updateMoisture(1, data.soil);
  document.getElementById("moisture-1").innerText =
    data.soil + "%";

  // nhiệt độ
  document.getElementById("temp-1").innerText =
    data.temperature + "°C";

  // độ khói
  document.getElementById("humidity-1").innerText =
    data.humidity + "%";

  // ánh sáng (tạm dùng humidity giả lập)
  document.getElementById("light-1").innerText =
    data.light + "%";

  // ThreshHold
  document.getElementById("threshhold-low").value =
    data.threshold_low;
  document.getElementById("threshhold-high").value =
    data.threshold_high;
  // PUMP
  document.getElementById("pump-state").innerText =
    data.pump_state;

  if (data.pump_state.trim().toLowerCase() === "on") {
    document.getElementById("water-status").innerText = "💧 Dừng tưới";
  } else {
    document.getElementById("water-status").innerText = "💧 Tưới ngay";
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