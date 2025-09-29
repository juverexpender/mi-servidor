import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { WebcastPushConnection } from "tiktok-live-connector";

// 🔧 CONFIGURACIÓN
const TIKTOK_USER = "juverbriceoterron"; // 👈 Cambia por tu usuario TikTok
const ESP32_IP = "http://10.119.91.207"; // 👈 Cambia por tu IP del ESP32

const app = express();
const PORT = process.env.PORT || 3000;
let ledState = "OFF"; // Estado actual del LED (sincronizado con ESP32)

// Servir la carpeta "public" para la interfaz web
app.use(express.static("public"));
app.use(bodyParser.json());

// 🔘 API para controlar el LED manualmente desde la interfaz
app.post("/led", async (req, res) => {
  const { action } = req.body;
  try {
    if (action === "on") {
      await axios.get(`${ESP32_IP}/on`);
      ledState = "ON";
      console.log("✅ LED ENCENDIDO (manual)");
    } else if (action === "off") {
      await axios.get(`${ESP32_IP}/off`);
      ledState = "OFF";
      console.log("✅ LED APAGADO (manual)");
    }
    res.json({ estado: ledState, mensaje: `LED ${ledState}` });
  } catch (err) {
    console.error("❌ Error enviando señal al ESP32:", err.message);
    res.status(500).json({ error: "No se pudo comunicar con el ESP32" });
  }
});

// Endpoint para consultar el estado actual del LED
app.get("/estado", (req, res) => {
  res.json({ estado: ledState });
});

// Iniciar el servidor HTTP
app.listen(PORT, () => {
  console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
});

// ==========================
// 🔴 CONEXIÓN A TIKTOK LIVE
// ==========================
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
    console.error("❌ Error de conexión a TikTok:", err.message);
  }
}

startTikTok();

// ==========================
// 🎯 MANEJO DE EVENTOS
// ==========================
tiktokConnection.on("chat", async (data) => {
  const comment = data.comment.trim().toLowerCase();
  console.log(`💬 ${data.uniqueId}: ${comment}`);

  if (comment === "on") {
    try {
      await axios.get(`${ESP32_IP}/on`);
      ledState = "ON";
      console.log("✅ LED ENCENDIDO (TikTok)");
    } catch (err) {
      console.error("❌ Error al enviar ON al ESP32:", err.message);
    }
  }

  if (comment === "off") {
    try {
      await axios.get(`${ESP32_IP}/off`);
      ledState = "OFF";
      console.log("✅ LED APAGADO (TikTok)");
    } catch (err) {
      console.error("❌ Error al enviar OFF al ESP32:", err.message);
    }
  }
});
