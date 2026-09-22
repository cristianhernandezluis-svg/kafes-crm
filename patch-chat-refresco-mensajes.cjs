const fs = require("fs");

const path = "app/chat/page.tsx";
let s = fs.readFileSync(path, "utf8");

const inicio = s.indexOf("  useEffect(() => {\n  cargarClientes();\n  cargarPlantillas();");
if (inicio < 0) {
  throw new Error("CHAT: no encontre el useEffect de refresco");
}

const finMarca = "  }, [clienteActivo]);";
const finBase = s.indexOf(finMarca, inicio);
if (finBase < 0) {
  throw new Error("CHAT: no encontre el final del useEffect de refresco");
}

const fin = finBase + finMarca.length;

const nuevo = `  useEffect(() => {
  cargarClientes();
  cargarPlantillas();

  const intervalo = setInterval(async () => {
    cargarClientes();

    if (clienteActivo && whatsappQrId) {
      await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteActivo.id,
          whatsapp_qr_id: whatsappQrId,
          accion: "tomar",
        }),
      });

      const res = await fetch(
        \`/api/conversaciones/\${clienteActivo.id}?whatsapp_qr_id=\${whatsappQrId}\`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.success) {
        setConversaciones(data.conversaciones);
      }
    }
  }, 5000);

  return () => clearInterval(intervalo);
}, [clienteActivo?.id, whatsappQrId]);`;

s = s.slice(0, inicio) + nuevo + s.slice(fin);

fs.writeFileSync(path, s, "utf8");
console.log("CHAT: refresco de mensajes corregido");
