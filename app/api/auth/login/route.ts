import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { crearTokenSesion, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Correo y contraseña obligatorios' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, empresa_id, nombre, email, password, rol
       FROM usuarios WHERE lower(email) = $1 LIMIT 1`,
      [email]
    );
    const usuario = result.rows[0];
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      return NextResponse.json({ success: false, error: 'Correo o contraseña incorrectos' }, { status: 401 });
    }
    if (!Number.isSafeInteger(Number(usuario.id)) ||
        !Number.isSafeInteger(Number(usuario.empresa_id)) ||
        !usuario.rol) {
      return NextResponse.json({ success: false, error: 'Usuario sin empresa o rol válido' }, { status: 403 });
    }

    const token = await crearTokenSesion({
      id: Number(usuario.id), empresa_id: Number(usuario.empresa_id), rol: String(usuario.rol)
    });
    const response = NextResponse.json({
      success: true,
      usuario: {
        id: usuario.id, empresa_id: usuario.empresa_id,
        nombre: usuario.nombre, email: usuario.email, rol: usuario.rol
      }
    });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error('ERROR LOGIN:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
