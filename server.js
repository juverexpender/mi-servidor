import express from "express";
import axios from "axios";
import { WebcastPushConnection } from "tiktok-live-connector";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔧 CONFIGURA AQUÍ
const TIKTOK_USER = "juverbriceoterron";  // 👈 tu usuario de TikTok
const ESP32_IP = "http://10.119.91.207";  // 👈 la IP local de tu ESP32 (o pública si está expuesto)

let ledState = "OFF";

// Servir la interfaz
app.use(express.static("public"));

// Endpoint de prueba
app.get("/led/:state", async (req, res) => {
  const state = req.params.state;
  try {
    await axios.get(`${ESP32_IP}/${state}`);
    ledState = state.toUpperCase();
    console.log(`✅ LED ${ledState} enviado al ESP32`);
    res.json({ success: true, estado: ledState });
  } catch (err) {
    console.error(`❌ Error enviando al ESP32:`, err.message);
    res.status(500).json({ success: false });
  }
});

// Endpoint para ver estado actual
app.get("/estado", (req, res) => {
  res.json({ estado: ledState });
});

// Iniciar servidor web
app.listen(PORT, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
});

// =====================
// 🎥 CONEXIÓN A TIKTOK
// =====================
const tiktokConnection = new WebcastPushConnection(TIKTOK_USER);

async function startTikTok() {
  try {
    console.log("⏳ Conectando a TikTok Live...");
    const state = await tiktokConnection.connect();

    if (state?.roomInfo?.owner?.nickname) {
      console.log(`✅ Conectado al LIVE de @${state.roomInfo.owner.nickname}`);
    } else {
      console.log("⚠️ No se pudo obtener información de la sala. ¿Estás en vivo?");
    }
  } catch (err) {
    console.error("❌ Error de conexión:", err.message);
  }
}

startTikTok();

// Escuchar eventos de chat
tiktokConnection.on("chat", (data) => {
  const comment = data.comment.trim().toLowerCase();
  console.log(`💬 ${data.uniqueId}: ${comment}`);

  if (comment === "on") {
    axios.get(`${ESP32_IP}/on`)
      .then(() => console.log("💡 LED ON (TikTok)"))
      .catch(err => console.error("❌ Error ON:", err.message));
  }

  if (comment === "off") {
    axios.get(`${ESP32_IP}/off`)
      .then(() => console.log("💤 LED OFF (TikTok)"))
      .catch(err => console.error("❌ Error OFF:", err.message));
  }
});
