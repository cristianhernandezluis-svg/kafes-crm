import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const empresas = await pool.query(
      "SELECT COUNT(*)::int AS total FROM empresas"
    );

    const usuarios = await pool.query(
      "SELECT COUNT(*)::int AS total FROM usuarios"
    );

    const clientes = await pool.query(
      "SELECT COUNT(*)::int AS total FROM clientes"
    );

    const activas = await pool.query(
      "SELECT COUNT(*)::int AS total FROM empresas WHERE estado = 'activo'"
    );

    const suspendidas = await pool.query(
      "SELECT COUNT(*)::int AS total FROM empresas WHERE estado = 'suspendido'"
    );

    const vencidas = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM empresas
      WHERE fecha_vencimiento IS NOT NULL
      AND fecha_vencimiento < NOW()
      `
    );

    return NextResponse.json({
      success: true,
      metricas: {
        empresas: empresas.rows[0].total,
        usuarios: usuarios.rows[0].total,
        clientes: clientes.rows[0].total,
        activas: activas.rows[0].total,
        suspendidas: suspendidas.rows[0].total,
        vencidas: vencidas.rows[0].total,
      },
    });
  } catch (error) {
    console.error("ERROR ADMIN DASHBOARD:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudieron cargar las métricas",
      },
      { status: 500 }
    );
  }
}