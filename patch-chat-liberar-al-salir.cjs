const fs = require("fs");

const path = "app/chat/page.tsx";
let s = fs.readFileSync(path, "utf8");

if (s.includes("const liberarAlSalir = () =>")) {
  console.log("CHAT: liberacion automatica al salir ya estaba");
  process.exit(0);
}

const marca = `const devolverAlBot = async () => {`;
const idx = s.indexOf(marca);

if (idx < 0) {
  throw new Error("CHAT: no encontre devolverAlBot");
}

const bloque = `useEffect(() => {
  const clienteId = clienteActivo?.id;
  const qrId = whatsappQrId;

  if (!clienteId || !qrId) return;

  const liberarAlSalir = () => {
    fetch("/api/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteId,
        whatsapp_qr_id: qrId,
        accion: "liberar",
      }),
      keepalive: true,
    }).catch(() => {});
  };

  const manejarPageHide = () => {
    liberarAlSalir();
  };

  window.addEventListener("pagehide", manejarPageHide);

  return () => {
    window.removeEventListener("pagehide", manejarPageHide);
    liberarAlSalir();
  };
}, [clienteActivo?.id, whatsappQrId]);

`;

s = s.slice(0, idx) + bloque + s.slice(idx);

fs.writeFileSync(path, s, "utf8");
console.log("CHAT: libera bot al salir de la conversacion o cerrar/navegar");
