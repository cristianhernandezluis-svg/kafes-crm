import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
});

function limpiarTelefono(telefono: string) {
const limpio = telefono.replace(/\D/g, "");

if (limpio.startsWith("51")) {
return limpio;
}

return `51${limpio}`;
}

export async function POST(req: Request) {
try {
const { cliente_id, telefono, mensaje } = await req.json();

```
if (!telefono || !mensaje) {
  return NextResponse.json(
    { success: false, error: "Falta teléfono o mensaje" },
    { status: 400 }
  );
}

if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
  return NextResponse.json(
    {
      success: false,
      error: "Faltan variables de WhatsApp en EasyPanel",
    },
    { status: 500 }
  );
}

const telefonoFinal = limpiarTelefono(telefono);

const payload = {
  messaging_product: "whatsapp",
  recipient_type: "individual",
  to: telefonoFinal,
  type: "text",
  text: {
    preview_url: false,
    body: mensaje,
  },
};

console.log("PAYLOAD WHATSAPP:", payload);
console.log(
  "PHONE_NUMBER_ID:",
  process.env.WHATSAPP_PHONE_NUMBER_ID
);

const response = await fetch(
  `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);

const data = await response.json();

console.log("RESPUESTA META:", data);

if (!response.ok) {
  console.error("ERROR META WHATSAPP:", data);

  return NextResponse.json(
    {
      success: false,
      error: data,
    },
    { status: 500 }
  );
}

await pool.query(
  `
  INSERT INTO conversaciones (
    cliente_id,
    telefono,
    whatsapp_message_id,
    mensaje,
    remitente,
    tipo
  )
  VALUES ($1, $2, $3, $4, $5, $6)
  `,
  [
    cliente_id,
    telefonoFinal,
    data.messages?.[0]?.id || null,
    mensaje,
    "asesor",
    "text",
  ]
);

return NextResponse.json({
  success: true,
  telefono: telefonoFinal,
  data,
});
```

} catch (error) {
console.error("ERROR ENVIANDO WHATSAPP:", error);

```
return NextResponse.json(
  {
    success: false,
    error: "Error enviando mensaje",
  },
  { status: 500 }
);
```

}
}
