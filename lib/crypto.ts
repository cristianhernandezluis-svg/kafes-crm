
import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function obtenerClave(): Buffer {
  const valor = process.env.META_TOKEN_ENCRYPTION_KEY;

  if (!valor) {
    throw new Error("Falta META_TOKEN_ENCRYPTION_KEY");
  }

  const clave = Buffer.from(valor, "base64");

  if (clave.length !== 32) {
    throw new Error("La clave de cifrado debe tener 32 bytes");
  }

  return clave;
}

export function cifrarToken(token: string): string {
  if (!token || typeof token !== "string") {
    throw new Error("Token inválido");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ALGORITHM,
    obtenerClave(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return (
    PREFIX +
    [
      iv.toString("base64"),
      tag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":")
  );
}

export function descifrarToken(valor: string): string {
  if (!valor.startsWith(PREFIX)) {
    throw new Error("El token no tiene un formato cifrado válido");
  }

  const partes = valor.slice(PREFIX.length).split(":");

  if (partes.length !== 3) {
    throw new Error("Formato de token cifrado inválido");
  }

  const [ivBase64, tagBase64, encryptedBase64] = partes;

  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Datos de cifrado inválidos");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    obtenerClave(),
    iv
  );

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
