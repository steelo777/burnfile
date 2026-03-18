/**
 * Client-side AES-256-GCM encryption.
 * The key is generated in the browser and embedded in the URL fragment (#).
 * It is NEVER sent to any server — not Shelby, not Burnfile, nobody.
 */

const ALGO = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM

// ─── Key Generation ────────────────────────────────────────────────────────────

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGO, length: KEY_LENGTH },
    true, // extractable so we can export to share in URL
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64url(new Uint8Array(raw));
}

export async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = base64urlToBuffer(keyB64);
  return crypto.subtle.importKey("raw", raw, { name: ALGO }, false, ["decrypt"]);
}

// ─── Encrypt ──────────────────────────────────────────────────────────────────

export interface EncryptResult {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  keyB64: string;
}

export async function encryptFile(file: File): Promise<EncryptResult> {
  const key = await generateKey();
  const keyB64 = await exportKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const plaintext = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    plaintext
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    iv,
    keyB64,
  };
}

export async function encryptBytes(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, data);
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

// ─── Decrypt ──────────────────────────────────────────────────────────────────

export async function decryptBlob(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  keyB64: string
): Promise<Uint8Array> {
  const key = await importKey(keyB64);
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new Uint8Array(plaintext);
}

// ─── Packaging ────────────────────────────────────────────────────────────────
// We pack: [4 bytes IV length][IV bytes][ciphertext]
// This way a single blob contains everything needed for decryption except the key.

export function packEncryptedBlob(ciphertext: Uint8Array, iv: Uint8Array): Uint8Array {
  const packed = new Uint8Array(4 + iv.length + ciphertext.length);
  const view = new DataView(packed.buffer);
  view.setUint32(0, iv.length, false); // big-endian
  packed.set(iv, 4);
  packed.set(ciphertext, 4 + iv.length);
  return packed;
}

export function unpackEncryptedBlob(packed: Uint8Array): {
  ciphertext: Uint8Array;
  iv: Uint8Array;
} {
  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength);
  const ivLength = view.getUint32(0, false);
  const iv = packed.slice(4, 4 + ivLength);
  const ciphertext = packed.slice(4 + ivLength);
  return { ciphertext, iv };
}

// ─── Base64url helpers ─────────────────────────────────────────────────────────

export function bufferToBase64url(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function base64urlToBuffer(b64url: string): Uint8Array {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
}

// ─── URL fragment helpers ──────────────────────────────────────────────────────

/**
 * The encryption key lives in the URL fragment (#key) so it is never sent
 * to any server — not even in HTTP referer headers.
 */
export function buildShareUrl(
  baseUrl: string,
  vaultId: string,
  keyB64: string
): string {
  return `${baseUrl}/burn/${vaultId}#${keyB64}`;
}

export function extractKeyFromFragment(fragment: string): string {
  // Fragment may start with "#"
  return fragment.startsWith("#") ? fragment.slice(1) : fragment;
}
