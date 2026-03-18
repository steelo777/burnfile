/**
 * Shelby Protocol SDK Abstraction
 *
 * This wraps the Shelby TypeScript SDK to provide a clean interface.
 * The real SDK is accessed via the Shelby RPC nodes.
 *
 * Docs: https://docs.shelby.xyz/sdks/typescript
 *
 * USAGE:
 *   npm install @shelby-protocol/sdk   (once publicly released)
 *   Then replace the mock implementations below with real SDK calls.
 *
 * The abstraction layer ensures the rest of the app does NOT need to change
 * when moving from testnet mock → real SDK.
 */

import type { ShelbyUploadResult, BlobInfo } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

export const SHELBY_CONFIG = {
  // Testnet RPC endpoint — update to mainnet when available
  rpcEndpoint: process.env.NEXT_PUBLIC_SHELBY_RPC ?? "https://rpc.testnet.shelby.xyz",
  // Storage duration in epochs (Shelby epoch ≈ 1 day on testnet)
  defaultStorageEpochs: 365,
  // Max blob size: 1 GB
  maxBlobSize: 1024 * 1024 * 1024,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShelbyReadAuth {
  /** Signed message from wallet authorizing this read */
  signature: string;
  /** Wallet address of the reader */
  reader: string;
  /** Vault ID being accessed */
  vaultId: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * ShelbyClient wraps the protocol SDK.
 *
 * IMPORTANT: When the real @shelby-protocol/sdk is available:
 * 1. npm install @shelby-protocol/sdk
 * 2. Replace the constructor body with: this.client = new ShelbySDK({ rpc: SHELBY_CONFIG.rpcEndpoint })
 * 3. Replace uploadBlob → this.client.writeBlob(data)
 * 4. Replace downloadBlob → this.client.readBlob(blobId, { paymentChannel: ... })
 */
class ShelbyClient {
  private rpcEndpoint: string;

  constructor(rpcEndpoint = SHELBY_CONFIG.rpcEndpoint) {
    this.rpcEndpoint = rpcEndpoint;
  }

  /**
   * Upload an encrypted blob to the Shelby network.
   *
   * Real SDK call (when available):
   *   const sdk = new ShelbySDK({ rpc: this.rpcEndpoint });
   *   const result = await sdk.writeBlob(data, { storageEpochs: epochs });
   *   return { blobId: result.blobId, size: data.length };
   */
  async uploadBlob(
    data: Uint8Array,
    options: {
      storageEpochs?: number;
      onProgress?: (percent: number) => void;
    } = {}
  ): Promise<ShelbyUploadResult> {
    const { storageEpochs = SHELBY_CONFIG.defaultStorageEpochs, onProgress } = options;

    // ── MOCK (replace with real SDK when available) ───────────────────────────
    if (process.env.NEXT_PUBLIC_USE_MOCK_SHELBY === "true") {
      return mockUpload(data, onProgress);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Real implementation — send multipart upload to Shelby RPC
    const formData = new FormData();
    formData.append("blob", new Blob([data]));
    formData.append("storageEpochs", String(storageEpochs));

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          const json = JSON.parse(xhr.responseText);
          resolve({ blobId: json.blob_id, size: data.length, txHash: json.tx_hash });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.open("POST", `${this.rpcEndpoint}/v1/blobs`);
      xhr.send(formData);
    });
  }

  /**
   * Download an encrypted blob from the Shelby network.
   *
   * Real SDK call (when available):
   *   const sdk = new ShelbySDK({ rpc: this.rpcEndpoint });
   *   const channel = await sdk.openPaymentChannel(walletSigner);
   *   const data = await sdk.readBlob(blobId, { channel });
   *   return data;
   */
  async downloadBlob(
    blobId: string,
    _auth?: ShelbyReadAuth,
    onProgress?: (percent: number) => void
  ): Promise<Uint8Array> {
    // ── MOCK ─────────────────────────────────────────────────────────────────
    if (process.env.NEXT_PUBLIC_USE_MOCK_SHELBY === "true") {
      return mockDownload(blobId, onProgress);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const response = await fetch(`${this.rpcEndpoint}/v1/blobs/${blobId}`, {
      headers: {
        // In real impl: include micropayment channel authorization header
        // "X-Payment-Channel": channel.serialize(),
        "X-Blob-Id": blobId,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const contentLength = Number(response.headers.get("Content-Length") ?? 0);
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (onProgress && contentLength) {
        onProgress(Math.round((received / contentLength) * 100));
      }
    }

    const total = chunks.reduce((a, c) => a + c.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  async getBlobInfo(blobId: string): Promise<BlobInfo | null> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_SHELBY === "true") {
      return mockGetInfo(blobId);
    }

    try {
      const response = await fetch(`${this.rpcEndpoint}/v1/blobs/${blobId}/info`);
      if (!response.ok) return null;
      const json = await response.json();
      return {
        blobId,
        size: json.size,
        createdAt: json.created_at,
        expiryEpoch: json.expiry_epoch,
      };
    } catch {
      return null;
    }
  }
}

// ─── Mock Implementation ──────────────────────────────────────────────────────
// Used during development. Set NEXT_PUBLIC_USE_MOCK_SHELBY=true in .env.local

const mockStore = new Map<string, Uint8Array>();

async function mockUpload(
  data: Uint8Array,
  onProgress?: (percent: number) => void
): Promise<ShelbyUploadResult> {
  // Simulate upload progress
  for (let i = 0; i <= 100; i += 10) {
    await sleep(80);
    onProgress?.(i);
  }

  // Generate a deterministic blob ID from content hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const blobId = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);

  mockStore.set(blobId, data);

  // Persist to localStorage so it survives page navigation
  try {
    const b64 = btoa(String.fromCharCode(...data));
    localStorage.setItem(`mockBlob:${blobId}`, b64);
  } catch { /* ignore storage errors */ }

  return {
    blobId,
    size: data.length,
    txHash: `0x${blobId.slice(0, 64)}`,
  };
}

async function mockDownload(
  blobId: string,
  onProgress?: (percent: number) => void
): Promise<Uint8Array> {
  await sleep(400);
  onProgress?.(50);
  await sleep(400);
  onProgress?.(100);

  let data = mockStore.get(blobId);

  // Fall back to localStorage if not in memory (e.g. after page navigation)
  if (!data) {
    try {
      const b64 = localStorage.getItem(`mockBlob:${blobId}`);
      if (b64) {
        const binary = atob(b64);
        data = new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
        mockStore.set(blobId, data); // repopulate memory cache
      }
    } catch { /* ignore storage errors */ }
  }

  if (!data) throw new Error(`Mock: blob ${blobId} not found`);
  return data;
}

async function mockGetInfo(blobId: string): Promise<BlobInfo | null> {
  const data = mockStore.get(blobId);
  if (!data) return null;
  return {
    blobId,
    size: data.length,
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    expiryEpoch: Math.floor(Date.now() / 1000) + 365 * 86400,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const shelby = new ShelbyClient();
export default shelby;