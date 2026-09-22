const fs = require('fs');

const p = 'app/chat/page.tsx';
let s = fs.readFileSync(p, 'utf8');

function insertarDespues(marca, bloque, nombre) {
  if (s.includes(bloque.trim())) {
    console.log(nombre + ': ya estaba');
    return;
  }
  if (!s.includes(marca)) throw new Error('No encontre marca: ' + nombre);
  s = s.replace(marca, marca + '\n' + bloque);
  console.log(nombre + ': agregado');
}

const estados = [
  'const [ventaProducto, setVentaProducto] = useState("");',
  'const [ventaMonto, setVentaMonto] = useState("");',
  'const [ventaAdelanto, setVentaAdelanto] = useState("");',
  'const [guardandoVenta, setGuardandoVenta] = useState(false);'
].join('\n');

insertarDespues(
  '  const [enviando, setEnviando] = useState(false);',
  estados,
  'estados venta'
);

const logicaVenta = [
  'useEffect(() => {',
  '  const clienteId = clienteActivo?.id;',
  '',
  '  if (!clienteId) {',
  '    setVentaProducto("");',
  '    setVentaMonto("");',
  '    setVentaAdelanto("");',
  '    return;',
  '  }',
  '',
  '  let cancelado = false;',
  '',
  '  const cargarVenta = async () => {',
  '    try {',
  '      const res = await fetch(`/api/ventas?cliente_id=${clienteId}`, {',
  '        cache: "no-store",',
  '      });',
  '',
  '      const data = await res.json();',
  '      if (cancelado) return;',
  '',
  '      if (res.ok && data.venta) {',
  '        setVentaProducto(data.venta.producto || "");',
  '        setVentaMonto(String(data.venta.monto ?? ""));',
  '        setVentaAdelanto(String(data.venta.adelanto ?? ""));',
  '      } else {',
  '        setVentaProducto(clienteActivo?.bot_producto || "");',
  '        setVentaMonto("");',
  '        setVentaAdelanto("");',
  '      }',
  '    } catch (error) {',
  '      console.error("Error cargando venta:", error);',
  '    }',
  '  };',
  '',
  '  cargarVenta();',
  '',
  '  return () => {',
  '    cancelado = true;',
  '  };',
  '}, [clienteActivo?.id]);',
  '',
  'const confirmarAdelanto = async () => {',
  '  if (!clienteActivo || guardandoVenta) return;',
  '',
  '  const producto = ventaProducto.trim();',
  '  const monto = Number(ventaMonto);',
  '  const adelanto = Number(ventaAdelanto);',
  '',
  '  if (!producto) {',
  '    alert("Ingresa el producto");',
  '    return;',
  '  }',
  '',
  '  if (!Number.isFinite(monto) || monto <= 0) {',
  '    alert("Ingresa un monto total valido");',
  '    return;',
  '  }',
  '',
  '  if (!Number.isFinite(adelanto) || adelanto < 0 || adelanto > monto) {',
  '    alert("Ingresa un adelanto valido");',
  '    return;',
  '  }',
  '',
  '  setGuardandoVenta(true);',
  '',
  '  try {',
  '    const res = await fetch("/api/ventas", {',
  '      method: "POST",',
  '      headers: { "Content-Type": "application/json" },',
  '      body: JSON.stringify({',
  '        cliente_id: clienteActivo.id,',
  '        producto,',
  '        monto,',
  '        adelanto,',
  '      }),',
  '    });',
  '',
  '    const data = await res.json();',
  '',
  '    if (!res.ok || !data.success) {',
  '      alert(data.error || "No se pudo registrar la venta");',
  '      return;',
  '    }',
  '',
  '    setVentaMonto(String(data.venta?.monto ?? monto));',
  '    setVentaAdelanto(String(data.venta?.adelanto ?? adelanto));',
  '',
  '    setClienteActivo((actual) =>',
  '      actual',
  '        ? { ...actual, etapa: "Pag\\u00f3 Adelanto", bot_paso: "postventa" }',
  '        : actual',
  '    );',
  '',
  '    await cargarClientes();',
  '    alert("Adelanto registrado correctamente");',
  '  } catch (error) {',
  '    console.error("Error registrando adelanto:", error);',
  '    alert("Error registrando adelanto");',
  '  } finally {',
  '    setGuardandoVenta(false);',
  '  }',
  '};',
  ''
].join('\n');

if (!s.includes('const confirmarAdelanto = async () => {')) {
  const marca = 'const iniciarGrabacion = async () => {';
  if (!s.includes(marca)) throw new Error('No encontre marca: logica venta');
  s = s.replace(marca, logicaVenta + '\n' + marca);
  console.log('logica venta: agregada');
} else {
  console.log('logica venta: ya estaba');
}

const tarjeta = [
  '        <div',
  '          className={`rounded-xl border p-3 space-y-3 ${',
  '            temaClaro',
  '              ? "bg-slate-50 border-slate-200"',
  '              : "bg-slate-900/60 border-slate-700"',
  '          }`}',
  '        >',
  '          <div className="flex items-center justify-between">',
  '            <p className={`text-xs font-bold ${temaClaro ? "text-slate-900" : "text-white"}`}>',
  '              Venta',
  '            </p>',
  '            <span className="text-[11px] text-slate-500">',
  '              Saldo: S/ {Math.max((Number(ventaMonto) || 0) - (Number(ventaAdelanto) || 0), 0).toFixed(2)}',
  '            </span>',
  '          </div>',
  '',
  '          <div>',
  '            <label className="text-[11px] text-slate-500">Producto</label>',
  '            <input',
  '              type="text"',
  '              value={ventaProducto}',
  '              onChange={(e) => setVentaProducto(e.target.value)}',
  '              placeholder="Producto vendido"',
  '              className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${',
  '                temaClaro',
  '                  ? "bg-white border-slate-300 text-slate-900"',
  '                  : "bg-slate-950 border-slate-700 text-white"',
  '              }`}',
  '            />',
  '          </div>',
  '',
  '          <div className="grid grid-cols-2 gap-2">',
  '            <div>',
  '              <label className="text-[11px] text-slate-500">Total</label>',
  '              <input',
  '                type="number"',
  '                min="0"',
  '                step="0.01"',
  '                value={ventaMonto}',
  '                onChange={(e) => setVentaMonto(e.target.value)}',
  '                placeholder="235"',
  '                className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${',
  '                  temaClaro',
  '                    ? "bg-white border-slate-300 text-slate-900"',
  '                    : "bg-slate-950 border-slate-700 text-white"',
  '                }`}',
  '              />',
  '            </div>',
  '',
  '            <div>',
  '              <label className="text-[11px] text-slate-500">Adelanto</label>',
  '              <input',
  '                type="number"',
  '                min="0"',
  '                step="0.01"',
  '                value={ventaAdelanto}',
  '                onChange={(e) => setVentaAdelanto(e.target.value)}',
  '                placeholder="30"',
  '                className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${',
  '                  temaClaro',
  '                    ? "bg-white border-slate-300 text-slate-900"',
  '                    : "bg-slate-950 border-slate-700 text-white"',
  '                }`}',
  '              />',
  '            </div>',
  '          </div>',
  '',
  '          <button',
  '            type="button"',
  '            onClick={confirmarAdelanto}',
  '            disabled={guardandoVenta}',
  '            className="w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:bg-slate-600"',
  '          >',
  '            {guardandoVenta ? "Guardando..." : "Confirmar adelanto"}',
  '          </button>',
  '        </div>'
].join('\n');

if (!s.includes('onClick={confirmarAdelanto}')) {
  const marcaTarjeta = '\n        <div>\n          <p className="text-slate-500 text-xs">\u00daltima actividad</p>';
  if (!s.includes(marcaTarjeta)) throw new Error('No encontre marca: tarjeta venta');
  s = s.replace(marcaTarjeta, '\n' + tarjeta + marcaTarjeta);
  console.log('tarjeta venta: agregada');
} else {
  console.log('tarjeta venta: ya estaba');
}

fs.writeFileSync(p, s, 'utf8');
console.log('PATCH CHAT VENTAS OK');
