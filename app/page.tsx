"use client";

import { useEffect, useState } from "react";

const estados = [
  "Nuevo",
  "Interesado",
  "Seguimiento",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
  "No Responde",
];

type Mensaje = {
  autor: "cliente" | "asesor";
  texto: string;
};

type Cliente = {
  nombre: string;
  celular: string;
  producto: string;
  ciudad: string;
  estado: string;
  asesor: string;
  nota?: string;
  mensajes: Mensaje[];
};

export default function Home() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteActivo, setClienteActivo] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");

  const [form, setForm] = useState<Cliente>({
    nombre: "",
    celular: "",
    producto: "",
    ciudad: "",
    estado: "Nuevo",
    asesor: "Janina",
    nota: "",
    mensajes: [],
  });

  useEffect(() => {
    const guardados = localStorage.getItem("kafes-clientes-chat");

    if (guardados) {
      setClientes(JSON.parse(guardados));
    } else {
      setClientes([
        {
          nombre: "Carlos Ramirez",
          celular: "980296583",
          producto: 'Sierra BOMVINK 8"',
          ciudad: "Lima",
          estado: "Nuevo",
          asesor: "Janina",
          nota: "Cliente de prueba",
          mensajes: [
            {
              autor: "cliente",
              texto: "Hola, quiero información de la sierra.",
            },
            {
              autor: "asesor",
              texto: "Hola estimado, está en promoción.",
            },
          ],
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("kafes-clientes-chat", JSON.stringify(clientes));
  }, [clientes]);

  const guardarCliente = () => {
    if (!form.nombre || !form.celular || !form.producto) {
      alert("Completa nombre, celular y producto");
      return;
    }

    setClientes([
      ...clientes,
      {
        ...form,
        mensajes: [
          {
            autor: "cliente",
            texto: "Cliente agregado manualmente al CRM.",
          },
        ],
      },
    ]);

    setForm({
      nombre: "",
      celular: "",
      producto: "",
      ciudad: "",
      estado: "Nuevo",
      asesor: "Janina",
      nota: "",
      mensajes: [],
    });

    setMostrarModal(false);
  };

  const cambiarEstado = (index: number, nuevoEstado: string) => {
    const copia = [...clientes];
    copia[index].estado = nuevoEstado;
    setClientes(copia);
  };

  const enviarMensaje = async () => {
    if (clienteActivo === null || !mensaje.trim()) return;

    const cliente = clientes[clienteActivo];
    const telefono = "51" + cliente.celular.replace(/\s/g, "");

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefono,
          mensaje,
        }),
      });

      const data = await response.json();
      console.log(data);

      const copia = [...clientes];

      copia[clienteActivo].mensajes.push({
        autor: "asesor",
        texto: mensaje,
      });

      setClientes(copia);
      setMensaje("");

      alert("Mensaje enviado por WhatsApp");
    } catch (error) {
      console.error(error);
      alert("Error enviando WhatsApp");
    }
  };

  const clienteSeleccionado =
    clienteActivo !== null ? clientes[clienteActivo] : null;

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex">
      <aside className="w-20 bg-white border-r flex flex-col items-center py-5 gap-6">
        <div className="w-11 h-11 bg-yellow-400 rounded-full flex items-center justify-center font-bold">
          K
        </div>
        <div className="text-2xl">🏠</div>
        <div className="text-2xl">💬</div>
        <div className="text-2xl">📊</div>
        <div className="text-2xl">⚙️</div>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-gray-500">Kafes CRM</p>
            <h1 className="text-3xl font-bold">Sales Funnel</h1>
          </div>

          <button
            onClick={() => setMostrarModal(true)}
            className="bg-yellow-400 px-5 py-3 rounded-xl font-bold"
          >
            + Nuevo Lead
          </button>
        </div>

        <div className="flex gap-5 min-w-[1200px]">
          {estados.map((estado) => (
            <div
              key={estado}
              className="w-[310px] bg-white rounded-xl shadow-sm min-h-[700px]"
            >
              <div className="p-4 border-b flex justify-between">
                <h2 className="font-bold text-lg">{estado}</h2>
                <span className="text-gray-500">
                  {clientes.filter((c) => c.estado === estado).length}
                </span>
              </div>

              <div className="divide-y">
                {clientes.map((cliente, index) =>
                  cliente.estado === estado ? (
                    <div
                      key={index}
                      onClick={() => setClienteActivo(index)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        clienteActivo === index ? "bg-yellow-50" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {cliente.nombre.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1">
                          <p className="font-bold text-lg">{cliente.nombre}</p>
                          <p className="text-sm text-gray-500">
                            {cliente.asesor}
                          </p>
                          <p className="text-sm">📱 {cliente.celular}</p>
                          <p className="text-sm">📦 {cliente.producto}</p>
                        </div>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <section className="w-[420px] bg-white border-l flex flex-col">
        {clienteSeleccionado ? (
          <>
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold">{clienteSeleccionado.nombre}</h2>
              <p className="text-sm text-gray-500">
                {clienteSeleccionado.celular}
              </p>
              <p className="text-sm">{clienteSeleccionado.producto}</p>

              <select
                className="border w-full p-2 mt-3 rounded"
                value={clienteSeleccionado.estado}
                onChange={(e) => cambiarEstado(clienteActivo!, e.target.value)}
              >
                {estados.map((estado) => (
                  <option key={estado}>{estado}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
              {clienteSeleccionado.mensajes.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl max-w-[80%] ${
                    m.autor === "asesor"
                      ? "bg-green-500 text-white ml-auto"
                      : "bg-white border"
                  }`}
                >
                  {m.texto}
                </div>
              ))}
            </div>

            <div className="p-4 border-t flex gap-2">
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="border rounded-lg p-3 flex-1"
              />

              <button
                onClick={enviarMensaje}
                className="bg-green-600 text-white px-4 rounded-lg font-bold"
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-center p-8">
            Selecciona un cliente para ver la conversación.
          </div>
        )}
      </section>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[430px]">
            <h2 className="text-2xl font-bold mb-4">Nuevo Lead</h2>

            <input
              className="border w-full p-3 mb-3 rounded"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded"
              placeholder="Celular sin 51"
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded"
              placeholder="Producto"
              value={form.producto}
              onChange={(e) => setForm({ ...form, producto: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded"
              placeholder="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />

            <select
              className="border w-full p-3 mb-3 rounded"
              value={form.asesor}
              onChange={(e) => setForm({ ...form, asesor: e.target.value })}
            >
              <option>Janina</option>
              <option>Kathi</option>
              <option>Xiomara</option>
              <option>Cristian</option>
            </select>

            <select
              className="border w-full p-3 mb-4 rounded"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              {estados.map((estado) => (
                <option key={estado}>{estado}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="bg-gray-300 w-full py-3 rounded"
              >
                Cancelar
              </button>

              <button
                onClick={guardarCliente}
                className="bg-yellow-400 w-full py-3 rounded font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}