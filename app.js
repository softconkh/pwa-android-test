/* ============================================
   PWA Playground — App Logic
   ============================================ */

const PWA = {};

// ---- Utility ----
function $(id) { return document.getElementById(id); }
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function setOutput(id, text, type = '') {
  const el = $(id);
  el.className = 'output' + (type ? ' ' + type : '');
  if (text.includes('<')) {
    el.innerHTML = text;
  } else {
    el.textContent = text;
  }
}

// ============================================
// 1. Service Worker Registration
// ============================================
async function initServiceWorker() {
  const dot = $('swDot');
  const text = $('swText');

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      dot.classList.add('sw-active');
      text.textContent = 'SW aktiv';
      console.log('Service Worker registered:', reg.scope);
    } catch (err) {
      dot.classList.add('sw-inactive');
      text.textContent = 'SW Fehler';
      console.error('SW registration failed:', err);
    }
  } else {
    dot.classList.add('sw-inactive');
    text.textContent = 'SW nicht verfügbar';
  }
}

// ============================================
// 2. Install Prompt
// ============================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('installBanner').classList.add('visible');
});

$('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  console.log('Install result:', result.outcome);
  deferredPrompt = null;
  $('installBanner').classList.remove('visible');
});

// Detect standalone mode
function checkDisplayMode() {
  const dot = $('modeDot');
  const text = $('modeText');
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    dot.classList.add('standalone');
    text.textContent = 'Standalone';
  } else {
    text.textContent = 'Browser';
  }
}

// ============================================
// 3. Online/Offline Status
// ============================================
function updateOnlineStatus() {
  const dot = $('onlineDot');
  const text = $('onlineText');
  dot.className = 'status-dot ' + (navigator.onLine ? 'online' : 'offline');
  text.textContent = navigator.onLine ? 'Online' : 'Offline';
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ============================================
// 4. QR Code Scanner
// ============================================
let qrScanner = null;

$('qrStartBtn').addEventListener('click', async () => {
  try {
    if (qrScanner) {
      await qrScanner.clear();
    }
    qrScanner = new Html5Qrcode('qr-reader');
    await qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => {
        // Check if it's a URL
        let display = decodedText;
        try {
          new URL(decodedText);
          display = `<a href="${decodedText}" target="_blank" rel="noopener">${decodedText}</a>`;
        } catch {}
        setOutput('qrOutput', '✅ Gefunden: ' + display, 'success');

        // Vibrate on success
        if ('vibrate' in navigator) navigator.vibrate(200);
      },
      () => {} // ignore scan failures
    );
    hide($('qrStartBtn'));
    show($('qrStopBtn'));
    setOutput('qrOutput', 'Scanner läuft... Halte einen QR-Code vor die Kamera.');
  } catch (err) {
    setOutput('qrOutput', 'Fehler: ' + err.message, 'error');
  }
});

$('qrStopBtn').addEventListener('click', async () => {
  if (qrScanner) {
    await qrScanner.stop();
    await qrScanner.clear();
    qrScanner = null;
  }
  show($('qrStartBtn'));
  hide($('qrStopBtn'));
  setOutput('qrOutput', 'Scanner gestoppt.');
});

// ============================================
// 5. Geolocation
// ============================================
$('geoBtn').addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    setOutput('geoOutput', 'Geolocation wird nicht unterstützt.', 'error');
    return;
  }

  setOutput('geoOutput', 'Position wird ermittelt...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
      setOutput('geoOutput',
        `📍 Lat: ${latitude.toFixed(6)}<br>` +
        `📍 Lon: ${longitude.toFixed(6)}<br>` +
        `🎯 Genauigkeit: ${accuracy.toFixed(0)}m<br>` +
        `<a href="${mapUrl}" target="_blank" rel="noopener">Auf Karte anzeigen →</a>`,
        'success'
      );
    },
    (err) => {
      setOutput('geoOutput', 'Fehler: ' + err.message, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ============================================
// 6. Device Motion & Orientation (3D Cube)
// ============================================
let motionActive = false;
let orientationHandler = null;
let motionHandler = null;

$('motionBtn').addEventListener('click', async () => {
  if (motionActive) {
    motionActive = false;
    if (orientationHandler) {
      window.removeEventListener('deviceorientation', orientationHandler);
      orientationHandler = null;
    }
    if (motionHandler) {
      window.removeEventListener('devicemotion', motionHandler);
      motionHandler = null;
    }
    $('motionBtn').textContent = 'Sensor aktivieren';
    setOutput('motionOutput', 'Sensor deaktiviert.');
    return;
  }

  // iOS 13+ requires permission
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== 'granted') {
        setOutput('motionOutput', 'Berechtigung verweigert.', 'error');
        return;
      }
    } catch (err) {
      setOutput('motionOutput', 'Fehler: ' + err.message, 'error');
      return;
    }
  }

  motionActive = true;
  $('motionBtn').textContent = 'Sensor stoppen';
  setOutput('motionOutput', 'Drehe dein Gerät...');

  // Test if the API delivers actual data
  let receivedData = false;

  // Handler for deviceorientation (primary)
  orientationHandler = (e) => {
    if (!motionActive) return;

    const alpha = e.alpha;
    const beta = e.beta;
    const gamma = e.gamma;

    if (alpha === null && beta === null && gamma === null) return;

    receivedData = true;
    const a = alpha || 0;
    const b = beta || 0;
    const g = gamma || 0;

    $('cube').style.transform =
      `rotateX(${b}deg) rotateY(${g}deg) rotateZ(${a}deg)`;

    setOutput('motionOutput',
      `α: ${a.toFixed(1)}° | β: ${b.toFixed(1)}° | γ: ${g.toFixed(1)}°`
    );
  };

  // Handler for devicemotion (fallback for Samsung Internet etc.)
  motionHandler = (e) => {
    if (!motionActive || receivedData) return; // skip if orientation already works

    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || (acc.x === null && acc.y === null && acc.z === null)) return;

    receivedData = true;
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;

    // Map acceleration to rotation
    const rotX = y * 9;
    const rotY = x * 9;

    $('cube').style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;

    setOutput('motionOutput',
      `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Z: ${z.toFixed(2)} (Accelerometer)`
    );
  };

  window.addEventListener('deviceorientation', orientationHandler);
  window.addEventListener('devicemotion', motionHandler);

  // After 2 seconds, if no data received, suggest touch fallback
  setTimeout(() => {
    if (motionActive && !receivedData) {
      setOutput('motionOutput',
        'Kein Sensor erkannt. Nutze Touch um den Würfel zu drehen!', 'error');
    }
  }, 2000);
});

// Touch fallback for mobile without gyroscope
let touchStartX = 0, touchStartY = 0, cubeRotX = 0, cubeRotY = 0;
const cubeScene = document.querySelector('.cube-scene');

cubeScene.addEventListener('touchstart', (e) => {
  if (motionActive) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });

cubeScene.addEventListener('touchmove', (e) => {
  if (motionActive) return;
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  cubeRotY += dx * 0.5;
  cubeRotX -= dy * 0.5;
  $('cube').style.transform = `rotateX(${cubeRotX}deg) rotateY(${cubeRotY}deg)`;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  e.preventDefault();
}, { passive: false });

// Mouse fallback for desktop
cubeScene.addEventListener('mousemove', (e) => {
  if (motionActive) return;
  const rect = e.currentTarget.getBoundingClientRect();
  cubeRotY = ((e.clientX - rect.left) / rect.width - 0.5) * 60;
  cubeRotX = ((e.clientY - rect.top) / rect.height - 0.5) * -60;
  $('cube').style.transform = `rotateX(${cubeRotX}deg) rotateY(${cubeRotY}deg)`;
});

// ============================================
// 7. Camera & Photo
// ============================================
let cameraStream = null;

$('cameraStartBtn').addEventListener('click', async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } }
    });
    const video = $('cameraPreview');
    video.srcObject = cameraStream;
    video.classList.add('active');
    hide($('cameraStartBtn'));
    show($('cameraSnapBtn'));
  } catch (err) {
    console.error('Camera error:', err);
  }
});

$('cameraSnapBtn').addEventListener('click', () => {
  const video = $('cameraPreview');
  const canvas = $('cameraCanvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  const img = $('photoResult');
  img.src = dataUrl;
  img.classList.add('visible');

  // Stop camera
  cameraStream.getTracks().forEach(t => t.stop());
  video.classList.remove('active');
  hide($('cameraSnapBtn'));
  show($('cameraStartBtn'));
  show($('cameraDownloadBtn'));

  if ('vibrate' in navigator) navigator.vibrate(100);
});

$('cameraDownloadBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = $('photoResult').src;
  a.download = 'pwa-photo-' + Date.now() + '.png';
  a.click();
});

// ============================================
// 8. Vibration API
// ============================================
const vibPatterns = {
  short: [100],
  long: [500],
  sos: [100, 50, 100, 50, 100, 150, 300, 50, 300, 50, 300, 150, 100, 50, 100, 50, 100],
  heartbeat: [100, 100, 100, 400, 100, 100, 100]
};

PWA.vibrate = function(pattern) {
  if (!('vibrate' in navigator)) {
    return;
  }
  navigator.vibrate(vibPatterns[pattern] || [200]);
  animateVibration(vibPatterns[pattern] || [200]);
};

function animateVibration(pattern) {
  const viz = $('vibViz');
  viz.innerHTML = '';
  const totalDuration = pattern.reduce((a, b) => a + b, 0);
  const numBars = 20;

  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement('span');
    bar.className = 'vib-bar';
    bar.style.height = '4px';
    viz.appendChild(bar);
  }

  let elapsed = 0;
  let isVibrating = true;

  pattern.forEach((duration, idx) => {
    const start = elapsed;
    isVibrating = idx % 2 === 0;
    elapsed += duration;

    if (isVibrating) {
      setTimeout(() => {
        const bars = viz.querySelectorAll('.vib-bar');
        bars.forEach(bar => {
          bar.style.height = Math.random() * 24 + 4 + 'px';
        });
      }, start);

      setTimeout(() => {
        const bars = viz.querySelectorAll('.vib-bar');
        bars.forEach(bar => { bar.style.height = '4px'; });
      }, start + duration);
    }
  });
}

// ============================================
// 9. Notifications
// ============================================
$('notifBtn').addEventListener('click', function() {
  var out = $('notifOutput');
  try {
    if (!('Notification' in window)) {
      setOutput('notifOutput', 'Notifications werden nicht unterstützt.', 'error');
      return;
    }

    if (Notification.permission === 'denied') {
      setOutput('notifOutput', 'Berechtigung blockiert. Tippe auf das Schloss-Symbol in der Adressleiste → Berechtigungen → Benachrichtigungen erlauben.', 'error');
      return;
    }

    if (Notification.permission === 'default') {
      setOutput('notifOutput', 'Frage Berechtigung an...');
      Notification.requestPermission().then(function(perm) {
        if (perm === 'granted') sendNotif(out);
        else setOutput('notifOutput', 'Berechtigung nicht erteilt.', 'error');
      });
      return;
    }

    sendNotif(out);
  } catch (err) {
    setOutput('notifOutput', 'Fehler: ' + err.message, 'error');
  }
});

function sendNotif(out) {
  var text = $('notifInput').value || 'Hallo von der PWA Playground!';

  if (!('serviceWorker' in navigator)) {
    setOutput('notifOutput', 'Kein ServiceWorker verfügbar.', 'error');
    return;
  }

  navigator.serviceWorker.getRegistration().then(function(reg) {
    if (!reg || !reg.active) {
      setOutput('notifOutput', 'Service Worker nicht bereit. Lade die Seite neu.', 'error');
      return;
    }
    return reg.showNotification('PWA Playground', {
      body: text,
      icon: 'icons/icon-192.png',
      vibrate: [200, 100, 200]
    });
  }).then(function() {
    setOutput('notifOutput', '✅ Notification gesendet!', 'success');
  }).catch(function(err) {
    setOutput('notifOutput', 'Fehler: ' + err.message, 'error');
  });
}

// ============================================
// 10. Share API
// ============================================
$('shareBtn').addEventListener('click', async () => {
  if (!navigator.share) {
    setOutput('shareOutput', 'Share API wird nicht unterstützt (nur HTTPS + Mobilgerät).', 'error');
    return;
  }

  try {
    await navigator.share({
      title: 'PWA Playground',
      text: $('shareInput').value,
      url: window.location.href
    });
    setOutput('shareOutput', '✅ Erfolgreich geteilt!', 'success');
  } catch (err) {
    if (err.name !== 'AbortError') {
      setOutput('shareOutput', 'Fehler: ' + err.message, 'error');
    }
  }
});

// ============================================
// 11. Clipboard API
// ============================================
$('clipCopyBtn').addEventListener('click', async () => {
  const text = $('clipInput').value;
  if (!text) {
    setOutput('clipOutput', 'Bitte Text eingeben.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setOutput('clipOutput', '✅ Kopiert: "' + text + '"', 'success');
  } catch (err) {
    setOutput('clipOutput', 'Fehler: ' + err.message, 'error');
  }
});

$('clipPasteBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    $('clipInput').value = text;
    setOutput('clipOutput', '📋 Eingefügt: "' + text + '"', 'success');
  } catch (err) {
    setOutput('clipOutput', 'Fehler: ' + err.message + ' (Berechtigung nötig)', 'error');
  }
});

// ============================================
// 12. Speech Synthesis & Recognition
// ============================================
$('ttsBtn').addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    setOutput('speechOutput', 'SpeechSynthesis wird nicht unterstützt.', 'error');
    return;
  }

  const text = $('ttsInput').value || 'Hallo Welt!';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 1;
  utterance.pitch = 1;

  const wave = $('speechWave');
  utterance.onstart = () => wave.classList.add('active');
  utterance.onend = () => wave.classList.remove('active');

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  setOutput('speechOutput', '🔊 Spreche: "' + text + '"');
});

$('sttBtn').addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setOutput('speechOutput', 'SpeechRecognition wird nicht unterstützt.', 'error');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'de-DE';
  recognition.continuous = false;
  recognition.interimResults = true;

  const wave = $('speechWave');

  recognition.onstart = () => {
    wave.classList.add('active');
    setOutput('speechOutput', '🎤 Zuhören...');
  };

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join('');
    setOutput('speechOutput', '🎤 ' + transcript);
    $('ttsInput').value = transcript;
  };

  recognition.onerror = (event) => {
    wave.classList.remove('active');
    setOutput('speechOutput', 'Fehler: ' + event.error, 'error');
  };

  recognition.onend = () => {
    wave.classList.remove('active');
  };

  recognition.start();
});

// ============================================
// 13. Network Information
// ============================================
function updateNetworkInfo() {
  const bar = $('networkBar');
  const type = $('networkType');
  const output = $('networkOutput');

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!navigator.onLine) {
    bar.className = 'network-bar offline';
    type.textContent = 'Offline';
    output.textContent = 'Keine Internetverbindung';
    output.className = 'output error';
    return;
  }

  if (conn) {
    const effectiveType = conn.effectiveType || 'unbekannt';
    const downlink = conn.downlink ? conn.downlink + ' Mbps' : '-';
    const rtt = conn.rtt ? conn.rtt + 'ms' : '-';

    type.textContent = effectiveType.toUpperCase();

    const strength = effectiveType === '4g' ? 'strong' :
                     effectiveType === '3g' ? 'medium' : 'weak';
    bar.className = 'network-bar ' + strength;

    output.className = 'output success';
    output.innerHTML =
      `Typ: ${conn.type || 'unbekannt'}<br>` +
      `Effektiv: ${effectiveType}<br>` +
      `Downlink: ${downlink}<br>` +
      `RTT: ${rtt}<br>` +
      `Data Saver: ${conn.saveData ? 'Ja' : 'Nein'}`;
  } else {
    bar.className = 'network-bar strong';
    type.textContent = 'Online';
    output.textContent = 'NetworkInformation API nicht verfügbar.';
    output.className = 'output';
  }
}

// ============================================
// 14. Battery Status
// ============================================
async function initBattery() {
  if (!('getBattery' in navigator)) {
    setOutput('batteryOutput', 'Battery API nicht verfügbar.', 'error');
    return;
  }

  const battery = await navigator.getBattery();

  function update() {
    const level = Math.round(battery.level * 100);
    const levelEl = $('batteryLevel');
    levelEl.style.width = level + '%';
    levelEl.className = 'battery-level' +
      (level <= 20 ? ' low' : level <= 50 ? ' medium' : '');

    $('batteryText').textContent = level + '%';

    const charging = battery.charging ? '⚡ Wird geladen' : '🔋 Batterie';
    const chTime = battery.chargingTime !== Infinity
      ? ' (' + Math.round(battery.chargingTime / 60) + ' min bis voll)'
      : '';
    const dischTime = battery.dischargingTime !== Infinity
      ? ' (' + Math.round(battery.dischargingTime / 60) + ' min verbleibend)'
      : '';

    setOutput('batteryOutput',
      `${charging}${battery.charging ? chTime : dischTime}`,
      level <= 20 ? 'error' : 'success'
    );
  }

  battery.addEventListener('chargingchange', update);
  battery.addEventListener('levelchange', update);
  update();
}

// ============================================
// 15. Cache Management
// ============================================
$('cacheListBtn').addEventListener('click', () => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    setOutput('cacheOutput', 'Service Worker nicht aktiv.', 'error');
    return;
  }

  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => {
    const urls = event.data;
    const list = $('cacheList');
    list.innerHTML = '';
    urls.forEach(url => {
      const li = document.createElement('li');
      li.textContent = new URL(url).pathname;
      list.appendChild(li);
    });
    setOutput('cacheOutput', urls.length + ' Einträge im Cache.', 'success');
  };

  navigator.serviceWorker.controller.postMessage('GET_CACHE_CONTENTS', [channel.port2]);
});

$('cacheClearBtn').addEventListener('click', () => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    setOutput('cacheOutput', 'Service Worker nicht aktiv.', 'error');
    return;
  }

  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => {
    if (event.data) {
      $('cacheList').innerHTML = '';
      setOutput('cacheOutput', '🗑️ Cache geleert!', 'success');
    }
  };

  navigator.serviceWorker.controller.postMessage('CLEAR_CACHE', [channel.port2]);
});

// ============================================
// 16. Device Info
// ============================================
function showDeviceInfo() {
  const info = [];
  info.push('🖥️ ' + navigator.userAgent.split(') ')[0].split('(')[1]);
  info.push('📏 Bildschirm: ' + screen.width + '×' + screen.height + ' (' + devicePixelRatio + 'x)');
  info.push('🪟 Viewport: ' + window.innerWidth + '×' + window.innerHeight);
  info.push('🧭 Plattform: ' + (navigator.userAgentData?.platform || navigator.platform));
  info.push('🌍 Sprache: ' + navigator.language);
  info.push('🧮 CPU Kerne: ' + (navigator.hardwareConcurrency || '?'));
  info.push('💾 RAM: ' + (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '?'));
  info.push('👆 Touch: ' + (navigator.maxTouchPoints > 0 ? 'Ja (' + navigator.maxTouchPoints + ' Punkte)' : 'Nein'));

  $('deviceOutput').innerHTML = info.join('<br>');
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  checkDisplayMode();
  updateOnlineStatus();
  updateNetworkInfo();
  initBattery();
  showDeviceInfo();

  // Live network updates
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    conn.addEventListener('change', updateNetworkInfo);
  }
  window.addEventListener('online', updateNetworkInfo);
  window.addEventListener('offline', updateNetworkInfo);
});
