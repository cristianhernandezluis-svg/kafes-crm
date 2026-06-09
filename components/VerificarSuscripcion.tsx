"use client";

import { useEffect } from "react";

export default function VerificarSuscripcion() {
  useEffect(() => {
    const verificar = async () => {
      const usuarioGuardado = localStorage.getItem("usuario");

      if (!usuarioGuardado) {
        window.location.href = "/login";
        return;
      }

      const usuario = JSON.parse(usuarioGuardado);

      const res = await fetch("/api/auth/verificar-suscripcion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa_id: usuario.empresa_id,
        }),
      });

      const data = await res.json();

      if (!data.activa) {
        window.location.href = "/suscripcion-vencida";
      }
    };

    verificar();
  }, []);

  return null;
}