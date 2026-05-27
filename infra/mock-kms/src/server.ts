/**
 * Mock KMS Service — локальная замена AWS KMS / Vault для разработки.
 *
 * Реализует минимальный envelope-encryption API:
 *   POST /kms/generate-data-key  — генерация AES-256 DEK
 *   POST /kms/encrypt            — шифрование plaintext мастер-ключом
 *   POST /kms/decrypt            — дешифрование ciphertextBlob
 *   GET  /healthz                — health check
 *
 * Все DEK хранятся в памяти (Map keyId → key).
 * MASTER_KEY используется для envelope-шифрования DEK через AES-256-GCM.
 */

import crypto from 'node:crypto';
import http from 'node:http';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env['PORT'] ?? '2599', 10);
const MASTER_KEY_RAW = process.env['MASTER_KEY'] ?? 'dev-master-key-32-bytes-padding!!';

/** Derive a 32-byte key from the raw master key string. */
function deriveMasterKey(raw: string): Buffer {
  return crypto.createHash('sha256').update(raw).digest();
}

const MASTER_KEY: Buffer = deriveMasterKey(MASTER_KEY_RAW);

// ---------------------------------------------------------------------------
// In-memory DEK store
// ---------------------------------------------------------------------------

/** Maps keyId → raw 32-byte AES-256 key */
const dekStore = new Map<string, Buffer>();

// ---------------------------------------------------------------------------
// Crypto helpers (AES-256-GCM)
// ---------------------------------------------------------------------------

const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

/**
 * Encrypt `plaintext` with `key` using AES-256-GCM.
 * Returns Buffer: [ iv (12 bytes) | authTag (16 bytes) | ciphertext ]
 */
function aesGcmEncrypt(plaintext: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypt a blob produced by `aesGcmEncrypt`.
 * Blob layout: [ iv (12 bytes) | authTag (16 bytes) | ciphertext ]
 */
function aesGcmDecrypt(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, GCM_IV_BYTES);
  const tag = blob.subarray(GCM_IV_BYTES, GCM_IV_BYTES + GCM_TAG_BYTES);
  const ciphertext = blob.subarray(GCM_IV_BYTES + GCM_TAG_BYTES);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Request / Response helpers
// ---------------------------------------------------------------------------

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendError(res: http.ServerResponse, status: number, message: string): void {
  console.error(`[mock-kms] ERROR ${status}: ${message}`);
  sendJson(res, status, { error: message });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** GET /healthz */
function handleHealthz(res: http.ServerResponse): void {
  console.info('[mock-kms] GET /healthz → ok');
  sendJson(res, 200, { status: 'ok' });
}

/**
 * POST /kms/generate-data-key
 * Body (optional): { keyId?: string }
 * Response: { plaintextKey: base64, ciphertextBlob: base64, keyId: string }
 */
async function handleGenerateDataKey(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  let requestedKeyId: string | undefined;

  try {
    const raw = await readBody(req);
    if (raw.trim()) {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'keyId' in parsed &&
        typeof (parsed as Record<string, unknown>)['keyId'] === 'string'
      ) {
        requestedKeyId = (parsed as Record<string, string>)['keyId'];
      }
    }
  } catch {
    // body is optional — ignore parse errors
  }

  const keyId = requestedKeyId ?? crypto.randomUUID();
  const dek = crypto.randomBytes(32); // AES-256 key

  // Envelope-encrypt DEK with MASTER_KEY and store only the encrypted form
  const encryptedDek = aesGcmEncrypt(dek, MASTER_KEY);
  dekStore.set(keyId, encryptedDek);

  console.info(`[mock-kms] GenerateDataKey keyId=${keyId}`);

  sendJson(res, 200, {
    plaintextKey: dek.toString('base64'),
    ciphertextBlob: encryptedDek.toString('base64'),
    keyId,
  });
}

/**
 * POST /kms/encrypt
 * Body: { plaintext: base64, keyId: string }
 * Response: { ciphertextBlob: base64 }
 *
 * Encrypts the caller's plaintext using the DEK identified by keyId.
 * The returned ciphertextBlob embeds the keyId prefix so Decrypt can
 * look up the right DEK without requiring the caller to pass keyId again.
 */
async function handleEncrypt(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    sendError(res, 400, 'Invalid JSON body');
    return;
  }

  if (
    body === null ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>)['plaintext'] !== 'string' ||
    typeof (body as Record<string, unknown>)['keyId'] !== 'string'
  ) {
    sendError(res, 400, 'Body must contain plaintext (base64) and keyId');
    return;
  }

  const { plaintext: plaintextB64, keyId } = body as { plaintext: string; keyId: string };

  const encryptedDek = dekStore.get(keyId);
  if (!encryptedDek) {
    sendError(res, 404, `Unknown keyId: ${keyId}`);
    return;
  }

  let plaintext: Buffer;
  try {
    plaintext = Buffer.from(plaintextB64, 'base64');
  } catch {
    sendError(res, 400, 'plaintext must be valid base64');
    return;
  }

  // Decrypt DEK from envelope store
  let dek: Buffer;
  try {
    dek = aesGcmDecrypt(encryptedDek, MASTER_KEY);
  } catch {
    sendError(res, 500, 'Failed to unwrap DEK');
    return;
  }

  // Encrypt caller's plaintext with DEK
  const ciphertext = aesGcmEncrypt(plaintext, dek);

  // Embed keyId length (2 bytes BE) + keyId bytes + ciphertext so Decrypt
  // can find the DEK without an extra parameter.
  const keyIdBuf = Buffer.from(keyId, 'utf8');
  const header = Buffer.alloc(2);
  header.writeUInt16BE(keyIdBuf.length, 0);
  const blob = Buffer.concat([header, keyIdBuf, ciphertext]);

  console.info(`[mock-kms] Encrypt keyId=${keyId} plaintextBytes=${plaintext.length}`);

  sendJson(res, 200, { ciphertextBlob: blob.toString('base64') });
}

/**
 * POST /kms/decrypt
 * Body: { ciphertextBlob: base64 }
 * Response: { plaintext: base64 }
 */
async function handleDecrypt(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    sendError(res, 400, 'Invalid JSON body');
    return;
  }

  if (
    body === null ||
    typeof body !== 'object' ||
    typeof (body as Record<string, unknown>)['ciphertextBlob'] !== 'string'
  ) {
    sendError(res, 400, 'Body must contain ciphertextBlob (base64)');
    return;
  }

  const { ciphertextBlob } = body as { ciphertextBlob: string };

  let blob: Buffer;
  try {
    blob = Buffer.from(ciphertextBlob, 'base64');
  } catch {
    sendError(res, 400, 'ciphertextBlob must be valid base64');
    return;
  }

  if (blob.length < 2) {
    sendError(res, 400, 'ciphertextBlob too short');
    return;
  }

  // Parse header: [ keyIdLen (2 bytes) | keyId | ciphertext ]
  const keyIdLen = blob.readUInt16BE(0);
  if (blob.length < 2 + keyIdLen) {
    sendError(res, 400, 'ciphertextBlob malformed: header truncated');
    return;
  }

  const keyId = blob.subarray(2, 2 + keyIdLen).toString('utf8');
  const ciphertext = blob.subarray(2 + keyIdLen);

  const encryptedDek = dekStore.get(keyId);
  if (!encryptedDek) {
    sendError(res, 404, `Unknown keyId: ${keyId}`);
    return;
  }

  let dek: Buffer;
  try {
    dek = aesGcmDecrypt(encryptedDek, MASTER_KEY);
  } catch {
    sendError(res, 500, 'Failed to unwrap DEK');
    return;
  }

  let plaintext: Buffer;
  try {
    plaintext = aesGcmDecrypt(ciphertext, dek);
  } catch {
    sendError(res, 400, 'Decryption failed: invalid ciphertextBlob or tampered data');
    return;
  }

  console.info(`[mock-kms] Decrypt keyId=${keyId} plaintextBytes=${plaintext.length}`);

  sendJson(res, 200, { plaintext: plaintext.toString('base64') });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function router(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const method = req.method?.toUpperCase() ?? 'GET';
  const url = req.url ?? '/';

  try {
    if (method === 'GET' && url === '/healthz') {
      handleHealthz(res);
      return;
    }

    if (method === 'POST' && url === '/kms/generate-data-key') {
      await handleGenerateDataKey(req, res);
      return;
    }

    if (method === 'POST' && url === '/kms/encrypt') {
      await handleEncrypt(req, res);
      return;
    }

    if (method === 'POST' && url === '/kms/decrypt') {
      await handleDecrypt(req, res);
      return;
    }

    sendError(res, 404, `Not found: ${method} ${url}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendError(res, 500, `Internal server error: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  void router(req, res);
});

server.listen(PORT, () => {
  console.info(`[mock-kms] Server listening on port ${PORT}`);
  console.info(`[mock-kms] KMS_BACKEND=mock  MASTER_KEY=${MASTER_KEY_RAW.slice(0, 8)}…`);
});

export {};
