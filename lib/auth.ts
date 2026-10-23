import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'kafes_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  empresa_id: number;
  rol: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
  }
  return new TextEncoder().encode(secret);
}

export async function crearTokenSesion(usuario: SessionUser): Promise<string> {
  return new SignJWT({ empresa_id: usuario.empresa_id, rol: usuario.rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(usuario.id))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function obtenerSesion(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    const empresa_id = Number(payload.empresa_id);
    const rol = payload.rol;
    if (!Number.isSafeInteger(id) || id <= 0 ||
        !Number.isSafeInteger(empresa_id) || empresa_id <= 0 ||
        typeof rol !== 'string' || !rol) return null;
    return { id, empresa_id, rol };
  } catch {
    return null;
  }
}
