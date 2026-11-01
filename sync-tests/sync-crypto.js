// sync-crypto.js
// Encryption at rest for device backups: PBKDF2-SHA256 key from a PIN/passphrase,
// AES-256-GCM for the data. Uses Web Crypto, which works in browsers and Node 19+.
import { Device } from "./sync-core.js";

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();
export const PBKDF2_ITERATIONS = 310000;

function randomBytes(n) { return globalThis.crypto.getRandomValues(new Uint8Array(n)); }

function toB64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(pin, salt, iterations) {
  const base = await subtle.importKey("raw", enc.encode(String(pin)), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJSON(obj, pin, iterations = PBKDF2_ITERATIONS) {
  const plain = enc.encode(JSON.stringify(obj));   // serialise before any await
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(pin, salt, iterations);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  return { v: 1, kdf: "PBKDF2-SHA256", iter: iterations, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON(box, pin) {
  if (!box || box.v !== 1) throw new Error("unknown backup format");
  const key = await deriveKey(pin, fromB64(box.salt), box.iter);
  let plain;
  try {
    plain = await subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct));
  } catch (e) {
    throw new Error("wrong PIN or corrupted backup");
  }
  return JSON.parse(dec.decode(plain));
}

// Encrypted snapshot of a device and its sync cursor. Includes unsynced ops.
export async function backupDevice(device, cursor, pin) {
  return encryptJSON({ device: device.snapshot(), cursor: { ...cursor } }, pin);
}

export async function restoreDevice(box, pin, opts = {}) {
  const data = await decryptJSON(box, pin);
  return { device: Device.fromSnapshot(data.device, opts), cursor: data.cursor };
}
