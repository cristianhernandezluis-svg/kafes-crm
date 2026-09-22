const fs = require("fs");

const files = {
  prompt: "app/whatsapp-qr-server/bot/prompt.mjs",
  cerebro: "app/whatsapp-qr-server/bot/cerebro.mjs",
  esquema: "app/whatsapp-qr-server/bot/esquema.mjs",
  ia: "app/whatsapp-qr-server/bot/ia.mjs",
  server: "app/whatsapp-qr-server/server.mjs",
};

const src = {};
for (const [k, f] of Object.entries(files)) {
  src[k] = fs.readFileSync(f, "utf8");
}

function fail(msg) {
  throw new Error(msg);
}

function replaceOnce(text, oldText, newText, label) {
  const count = text.split(oldText).length - 1;
  if (count !== 1) {
    fail(`${label}: esperaba 1 coincidencia y encontre ${count}`);
  }
  return text.replace(oldText, newText);
}

/* 1) ESQUEMA */
if (!src.esquema.includes('"presentacion"')) {
  src.esquema = replaceOnce(
    src.esquema,
`  multimedia: z.enum([
    "ninguno",
    "foto",
    "video",
    "audio",
  ]),`,
`  multimedia: z.enum([
    "ninguno",
    "foto",
    "video",
    "audio",
    "presentacion",
  ]),`,
    "esquema multimedia"
  );
}

if (!src.esquema.includes("fase_venta: z.enum")) {
  src.esquema = replaceOnce(
    src.esquema,
`  seguimiento_para: z.string().nullable(),
  seguimiento_fecha: z.string().nullable(),
  precio_acordado: z.number().nullable(),

  respuesta: z.string(),`,
`  seguimiento_para: z.string().nullable(),
  seguimiento_fecha: z.string().nullable(),
  precio_acordado: z.number().nullable(),

  apertura: z.string().nullable(),

  fase_venta: z.enum([
    "descubrimiento",
    "presentacion",
    "demostracion",
    "valor",
    "objecion",
    "cierre",
    "seguimiento",
    "postventa",
  ]),

  llamar_ahora: z.boolean(),
  motivo_llamada: z.string().nullable(),

  respuesta: z.string(),`,
    "esquema estrategia"
  );
}

/* 2) IA */
if (!src.ia.includes("multimediaDisponible:")) {
  src.ia = replaceOnce(
    src.ia,
`    descripcion: p.descripcion,
    beneficios: p.beneficios,
  }));`,
`    descripcion: p.descripcion,
    beneficios: p.beneficios,
    multimediaDisponible: {
      fotos: Array.isArray(p.multimedia?.fotos) ? p.multimedia.fotos.length : 0,
      videos: Array.isArray(p.multimedia?.videos) ? p.multimedia.videos.length : 0,
      audios: Array.isArray(p.multimedia?.audios) ? p.multimedia.audios.length : 0,
      gifs: Array.isArray(p.multimedia?.gifs) ? p.multimedia.gifs.length : 0,
    },
  }));`,
    "ia catalogo multimedia"
  );
}

if (!src.ia.includes("VENDEDOR MAESTRO - DECISION COMERCIAL")) {
  src.ia = replaceOnce(
    src.ia,
`- Nunca inventes que existe una foto, video o audio.

REGLAS POSTVENTA:`,
`- Nunca inventes que existe una foto, video o audio.

VENDEDOR MAESTRO - DECISION COMERCIAL:
- "fase_venta" describe el movimiento comercial que conviene ahora, no una etapa rigida del CRM.
- Usa "descubrimiento" cuando todavia necesitas entender producto, ciudad o necesidad.
- Usa "presentacion" cuando es un primer contacto y conviene mostrar visualmente el producto.
- Usa "demostracion" cuando una prueba visual de funcionamiento ayuda a avanzar.
- Usa "valor" cuando toca explicar equipamiento, oferta o diferencias reales.
- Usa "objecion" cuando estas resolviendo una duda que frena la compra.
- Usa "cierre" cuando el cliente ya muestra intencion suficiente para avanzar al pedido o pago.
- Usa "seguimiento" cuando existe postergacion comercial.
- En postventa usa "postventa".
- "apertura" es un mensaje MUY corto y natural que puede acompañar la primera pieza visual. Usa null cuando no haga falta.
- Si el producto esta identificado, el cliente pide informacion general o llega con un saludo/interes inicial, MEMORIA DEL CLIENTE.contexto.presentacion_enviada no es true y el catalogo tiene foto o video, puedes usar multimedia="presentacion".
- multimedia="presentacion" significa que el servidor puede enviar una foto y un video disponibles antes de la respuesta final.
- Nunca repitas multimedia="presentacion" si contexto.presentacion_enviada ya es true.
- No uses multimedia por rutina despues de la presentacion; elige foto o video solo cuando realmente ayude.
- "llamar_ahora" NO significa handoff y NO detiene al bot.
- Usa llamar_ahora=true cuando una llamada humana podria aumentar claramente la probabilidad de cierre: intencion explicita de comprar, pedido, pago, cliente que ya dio ciudad y avanza con envio, o varias senales comerciales fuertes juntas.
- Preguntar solamente precio o pedir informacion general NO basta para llamar_ahora=true.
- Si llamar_ahora=false, motivo_llamada=null.
- Si llamar_ahora=true, motivo_llamada resume en una frase por que conviene llamar.

REGLAS POSTVENTA:`,
    "ia vendedor maestro"
  );
}

/* 3) PROMPT */
if (!src.prompt.includes("VENDEDOR MAESTRO CONVERSACIONAL:")) {
  src.prompt = replaceOnce(
    src.prompt,
`OBJECIONES:`,
`VENDEDOR MAESTRO CONVERSACIONAL:
Tu comportamiento visible debe parecer el de una vendedora experimentada conversando por WhatsApp, no el de un formulario ni un FAQ.

- No sigas siempre la formula "respuesta + caracteristicas + pregunta".
- No termines todos los mensajes con una pregunta.
- Una persona real a veces responde, confirma algo y espera; otras veces hace una pregunta corta; otras veces intenta cerrar.
- Evita preguntas mecanicas que no nacen del contexto.
- No preguntes "¿para que lo necesitas?" por rutina. Preguntalo solo si conocer el uso realmente ayuda a vender o recomendar.
- No preguntes "¿Deseas mas informacion?" ni "¿Que deseas saber?" como cierre generico.
- Evita repetir saludo, nombre del producto, precio o caracteristicas si ya fueron comunicados.
- Cuando el cliente responda algo corto como ciudad, uso, "si", "ya", "cuanto", interpreta la continuidad usando memoria e historial.
- Primero reacciona de forma humana a lo que dijo el cliente y luego decide si conviene informar, demostrar, preguntar, cerrar o esperar.
- No inventes cercania, emociones, urgencia, stock ni escasez.

PRESENTACION VISUAL TIPO MINI PAGINA:
Cuando sea un primer contacto comercial, el producto este identificado, el cliente pida informacion general y aun no se haya realizado la presentacion:
- si existe multimedia real disponible, puedes usar multimedia = "presentacion";
- apertura debe ser una frase corta y natural, por ejemplo "Claro 👋 te muestro la sierra que viste.";
- la respuesta final debe complementar lo visual con pocos datos relevantes y avanzar naturalmente;
- no conviertas la respuesta en una ficha tecnica larga;
- no repitas la misma presentacion en mensajes posteriores.

RITMO COMERCIAL:
Piensa en la conversacion como movimientos, no como un cuestionario:
1. atraer y mostrar;
2. entender lo necesario;
3. demostrar valor con hechos reales;
4. resolver frenos;
5. avanzar al pedido;
6. recuperar si posterga.

No es obligatorio recorrer esos movimientos en orden. El mensaje actual del cliente manda.

LLAMADA COMERCIAL:
Ademas de vender por chat, detecta cuando una llamada humana podria cerrar mejor.
- llamar_ahora=true es una ALERTA comercial interna; NO significa handoff_closer.
- Si llamar_ahora=true, el bot sigue conversando normalmente.
- Activalo ante intencion explicita de compra/pedido/pago o varias senales fuertes juntas.
- No lo actives solo porque pregunto precio, saludo o pidio informacion general.
- motivo_llamada debe ser breve y concreto.
- Si el cliente rechaza definitivamente la compra, no actives llamar_ahora.

OBJECIONES:`,
    "prompt vendedor maestro"
  );
}

if (!src.prompt.includes('En postventa, fase_venta = "postventa".')) {
  src.prompt = replaceOnce(
    src.prompt,
`CLASIFICACION CRM EN POSTVENTA:`,
`CLASIFICACION CRM EN POSTVENTA:
- En postventa, fase_venta = "postventa".
- En postventa, apertura = null.
- En postventa, llamar_ahora = false y motivo_llamada = null.`,
    "prompt postventa campos"
  );
}

/* 4) CEREBRO */
if (!src.cerebro.includes("contexto.fase_venta = analisis.fase_venta")) {
  src.cerebro = replaceOnce(
    src.cerebro,
`    if (analisis.ciudad) {
      contexto.ciudad = analisis.ciudad;
    }

    const producto =`,
`    if (analisis.ciudad) {
      contexto.ciudad = analisis.ciudad;
    }

    if (analisis.fase_venta) {
      contexto.fase_venta = analisis.fase_venta;
    }

    if (analisis.llamar_ahora === true) {
      contexto.llamar_ahora = true;
      contexto.motivo_llamada = analisis.motivo_llamada || "Interes comercial alto";
    } else if (analisis.etapa_sugerida === "Descartado") {
      contexto.llamar_ahora = false;
      delete contexto.motivo_llamada;
    }

    const producto =`,
    "cerebro contexto comercial"
  );
}

if (!src.cerebro.includes("apertura: analisis.apertura || null")) {
  src.cerebro = replaceOnce(
    src.cerebro,
`      accion: analisis.accion,
      mensaje: mensajeFinal,
      multimedia: analisis.multimedia || "ninguno",
      handoff,`,
`      accion: analisis.accion,
      apertura: analisis.apertura || null,
      mensaje: mensajeFinal,
      multimedia: analisis.multimedia || "ninguno",
      faseVenta: analisis.fase_venta,
      llamarAhora: analisis.llamar_ahora === true,
      motivoLlamada: analisis.motivo_llamada || null,
      handoff,`,
    "cerebro retorno comercial"
  );
}

src.cerebro = src.cerebro.replace(
  "`${producto.nombre} está a S/${producto.precio}. ¿Deseas más información?`",
  "`${producto.nombre} está a S/${producto.precio}. Si quieres, te muestro cómo viene y qué incluye.`"
);
src.cerebro = src.cerebro.replace(
  "`Sí, tenemos ${producto.nombre} a S/${producto.precio}. ¿Qué deseas saber?`",
  "`Claro 👋 Te cuento sobre ${producto.nombre}. Está a S/${producto.precio}.`"
);
src.cerebro = src.cerebro.replace(
  '"Claro, te ayudo. ¿Qué producto te interesa?"',
  '"Claro 👋 Dime qué producto viste y te paso la información."'
);

/* 5) SERVER */
if (!src.server.includes("PRESENTACION COMERCIAL BOT ENVIADA")) {
  const startMarker = `  const multimediaSolicitada = respuestaBot?.multimedia || "ninguno";`;
  const endMarker = `\n\n  const enviadoBot = await sock.sendMessage(jidRespuesta, {`;

  const start = src.server.indexOf(startMarker);
  const end = src.server.indexOf(endMarker, start);

  if (start < 0 || end < 0) {
    fail("server: no encontre bloque multimedia esperado");
  }

  const nuevoBloque = `  const multimediaSolicitada = respuestaBot?.multimedia || "ninguno";

  const pausaMultimedia = () =>
    new Promise((resolve) =>
      setTimeout(resolve, 700 + Math.floor(Math.random() * 700))
    );

  const enviarMultimediaBot = async ({
    archivo,
    tipo,
    caption = undefined,
  }) => {
    const bufferArchivo = await readFile(archivo);

    if (tipo === "foto") {
      await sock.sendMessage(jidRespuesta, {
        image: bufferArchivo,
        ...(caption ? { caption } : {}),
      });
    } else if (tipo === "video") {
      await sock.sendMessage(jidRespuesta, {
        video: bufferArchivo,
        ...(caption ? { caption } : {}),
      });
    } else if (tipo === "audio") {
      const ruta = String(archivo).toLowerCase();
      const mimetype = ruta.endsWith(".ogg")
        ? "audio/ogg; codecs=opus"
        : ruta.endsWith(".m4a") || ruta.endsWith(".mp4")
          ? "audio/mp4"
          : "audio/mpeg";

      await sock.sendMessage(jidRespuesta, {
        audio: bufferArchivo,
        mimetype,
        ptt: false,
      });
    }

    console.log("MULTIMEDIA BOT ENVIADO:", {
      clienteId,
      producto: respuestaBot.producto,
      tipo,
      archivo,
    });
  };

  if (
    multimediaSolicitada === "presentacion" &&
    respuestaBot?.producto
  ) {
    const fotos = obtenerMultimediaProducto(respuestaBot.producto, "foto");
    const videos = obtenerMultimediaProducto(respuestaBot.producto, "video");

    const secuencia = [];
    if (fotos[0]) secuencia.push({ tipo: "foto", archivo: fotos[0] });
    if (videos[0]) secuencia.push({ tipo: "video", archivo: videos[0] });

    const apertura = String(respuestaBot?.apertura || "").trim();
    let aperturaUsada = false;
    let enviadosPresentacion = 0;

    for (let i = 0; i < secuencia.length; i += 1) {
      const item = secuencia[i];

      try {
        const caption =
          !aperturaUsada && apertura && item.tipo !== "audio"
            ? apertura
            : undefined;

        await enviarMultimediaBot({
          archivo: item.archivo,
          tipo: item.tipo,
          caption,
        });

        if (caption) aperturaUsada = true;
        enviadosPresentacion += 1;

        if (i < secuencia.length - 1) {
          await pausaMultimedia();
        }
      } catch (error) {
        console.error(
          "ERROR ENVIANDO PRESENTACION BOT:",
          item.archivo,
          error?.message || error
        );
      }
    }

    if (enviadosPresentacion > 0) {
      await pool.query(
        \`
        UPDATE clientes
        SET bot_contexto = jsonb_set(
              jsonb_set(
                COALESCE(bot_contexto, '{}'::jsonb),
                '{presentacion_enviada}',
                'true'::jsonb,
                true
              ),
              '{presentacion_enviada_at}',
              to_jsonb(NOW()::text),
              true
            )
        WHERE id = $1
        \`,
        [clienteId]
      );

      console.log(
        "PRESENTACION COMERCIAL BOT ENVIADA:",
        clienteId,
        respuestaBot.producto,
        "ARCHIVOS:",
        enviadosPresentacion
      );

      await pausaMultimedia();
    }
  } else {
    const archivosMultimedia =
      multimediaSolicitada !== "ninguno" && respuestaBot?.producto
        ? obtenerMultimediaProducto(
            respuestaBot.producto,
            multimediaSolicitada
          )
        : [];

    if (archivosMultimedia.length > 0) {
      const limite = multimediaSolicitada === "foto" ? 2 : 1;

      for (const archivo of archivosMultimedia.slice(0, limite)) {
        try {
          await enviarMultimediaBot({
            archivo,
            tipo: multimediaSolicitada,
          });
        } catch (error) {
          console.error(
            "ERROR ENVIANDO MULTIMEDIA BOT:",
            archivo,
            error?.message || error
          );
        }
      }
    }
  }`;

  src.server =
    src.server.slice(0, start) +
    nuevoBloque +
    src.server.slice(end);
}

/* VALIDACIONES */
const checks = [
  [src.esquema, '"presentacion"', "esquema presentacion"],
  [src.esquema, "fase_venta: z.enum", "esquema fase_venta"],
  [src.esquema, "llamar_ahora: z.boolean()", "esquema llamar_ahora"],
  [src.ia, "multimediaDisponible:", "ia multimedia"],
  [src.ia, "VENDEDOR MAESTRO - DECISION COMERCIAL", "ia reglas"],
  [src.prompt, "VENDEDOR MAESTRO CONVERSACIONAL:", "prompt maestro"],
  [src.cerebro, "contexto.fase_venta = analisis.fase_venta", "cerebro fase"],
  [src.cerebro, "apertura: analisis.apertura || null", "cerebro apertura"],
  [src.server, "PRESENTACION COMERCIAL BOT ENVIADA", "server presentacion"],
];

for (const [text, needle, label] of checks) {
  if (!text.includes(needle)) {
    fail("Validacion fallo: " + label);
  }
}

for (const [k, f] of Object.entries(files)) {
  fs.writeFileSync(f, src[k], "utf8");
}

console.log("ESQUEMA VENDEDOR MAESTRO: OK");
console.log("IA CON MULTIMEDIA DISPONIBLE: OK");
console.log("PROMPT CONVERSACIONAL: OK");
console.log("CEREBRO CON FASE + LLAMAR AHORA: OK");
console.log("SERVER PRESENTACION FOTO + VIDEO: OK");
console.log("VENDEDOR MAESTRO V1 APLICADO");
