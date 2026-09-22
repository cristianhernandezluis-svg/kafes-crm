const fs = require("fs");

const archivo = "app/whatsapp-qr-server/server.mjs";
let codigo = fs.readFileSync(archivo, "utf8");

const marcador = `app.post("/sync-contacts", async (req, res) => {`;

if (!codigo.includes(marcador)) {
  throw new Error("No encontre /sync-contacts");
}

const endpoint = `
app.post("/desconectar", async (req, res) => {
  try {
    estado = "desconectando";
    qrActual = null;

    if (sock) {
      try {
        await sock.logout();
      } catch (error) {
        console.error("Error cerrando sesion WhatsApp:", error);
      }
    }

    await limpiarSesionWhatsApp();

    sock = null;
    estado = "desconectado";

    setTimeout(() => {
      iniciarWhatsApp().catch((error) => {
        console.error("Error reiniciando WhatsApp:", error);
      });
    }, 1000);

    res.json({
      success: true,
      mensaje: "WhatsApp desconectado. Generando nuevo QR.",
    });
  } catch (error) {
    console.error("Error desconectando WhatsApp:", error);

    res.status(500).json({
      success: false,
      error: "No se pudo desconectar WhatsApp",
    });
  }
});

`;

codigo = codigo.replace(marcador, endpoint + marcador);

fs.writeFileSync(archivo, codigo, "utf8");

console.log("Endpoint /desconectar agregado");