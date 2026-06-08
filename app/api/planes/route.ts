import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const limites: any = {
  gratis: { usuarios: 1 },
  pro: { usuarios: 5 },
  empresa: { usuarios: 999 },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresa_id");

  if (!empresaId) {
    return NextResponse.json({ success: false, error: "empresa_id obligatorio" });
  }

  const empresa = await pool.query(
    "SELECT id, nombre, plan, estado FROM empresas WHERE id = $1",
    [empresaId]
  );

  if (empresa.rows.length === 0) {
    return NextResponse.json({ success: false, error: "Empresa no encontrada" });
  }

  const usuarios = await pool.query(
    "SELECT COUNT(*)::int AS total FROM usuarios WHERE empresa_id = $1",
    [empresaId]
  );

  const plan = empresa.rows[0].plan || "gratis";

  return NextResponse.json({
    success: true,
    empresa: empresa.rows[0],
    limites: limites[plan] || limites.gratis,
    uso: {
      usuarios: usuarios.rows[0].total,
    },
  });
}