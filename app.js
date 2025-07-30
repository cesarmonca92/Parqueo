let detectedPlate = '';
window.onload = () => openDB();

document.getElementById('btnScan').onclick = async () => {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return alert("📷 Selecciona una imagen");

  const result = await Tesseract.recognize(file, 'eng');
  detectedPlate = result.data.text.trim().replace(/\s/g, '').toUpperCase();
  document.getElementById('plateResult').textContent = detectedPlate || "No detectado";
  document.getElementById('manualPlate').value = detectedPlate;
};

document.getElementById('btnEntry').onclick = enviarEntrada;
document.getElementById('btnExit').onclick = enviarSalida;

async function enviarEntrada() {
  const plate = document.getElementById('manualPlate').value.trim().toUpperCase();
  if (!plate) return alert("❗ Ingresa o escanea una matrícula válida");
  const payload = { plate };

  if (navigator.onLine) {
    await fetch('/api/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    alert("✔️ Entrada registrada online");
  } else {
    saveOffline('entry', payload);
    alert("⚠️ Entrada guardada offline");
  }
}

async function enviarSalida() {
  const plate = document.getElementById('manualPlate').value.trim().toUpperCase();
  if (!plate) return alert("❗ Ingresa o escanea una matrícula válida");
  const payload = { plate };

  if (navigator.onLine) {
    const res = await fetch('/api/exit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById('amountInfo').textContent = `💰 Monto a pagar: S/ ${data.amount.toFixed(2)}`;
  } else {
    saveOffline('exit', payload);
    alert("⚠️ Salida guardada offline");
  }
}

// Offline con IndexedDB
let db;
const DB_NAME = 'parking_offline_db', DB_STORE = 'offlineActions';
function openDB() {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = e => e.target.result.createObjectStore(DB_STORE, { autoIncrement: true });
  req.onsuccess = e => { db = e.target.result; syncOfflineData(); };
}

function saveOffline(type, payload) {
  db.transaction([DB_STORE], 'readwrite').objectStore(DB_STORE).add({ type, payload });
}

function syncOfflineData() {
  const tx = db.transaction([DB_STORE], 'readonly'), store = tx.objectStore(DB_STORE);
  store.getAll().onsuccess = async e => {
    const actions = e.target.result;
    if (!actions.length) return;
    for (const { type, payload } of actions) {
      try {
        await fetch(`/api/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {
        return;
      }
    }
    db.transaction([DB_STORE], 'readwrite').objectStore(DB_STORE).clear();
  };
      }
