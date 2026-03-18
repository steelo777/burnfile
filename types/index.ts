// ─── Vault Types ─────────────────────────────────────────────────────────────

export interface VaultInfo {
  blobId: string;
  maxReads: number;
  readsCount: number;
  expiryTs: number;        // 0 = no expiry
  isBurned: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
  owner: string;
}

export interface VaultId {
  ownerAddress: string;
  vaultIndex: number;
}

export interface AccessEntry {
  reader: string;
  timestampSecs: number;
  readIndex: number;
}

// ─── Upload Types ─────────────────────────────────────────────────────────────

export interface UploadConfig {
  maxReads: number;
  expiryTs: number;         // Unix timestamp, 0 = no expiry
  selfDestruct: boolean;    // Same as maxReads === 1 but surfaced as toggle
}

export interface UploadResult {
  vaultId: string;           // "{ownerAddress}:{vaultIndex}"
  blobId: string;
  shareUrl: string;          // Full URL including encryption key fragment
  txHash: string;
}

// ─── Encryption Types ─────────────────────────────────────────────────────────

export interface EncryptedBlob {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  keyB64: string;           // Base64-encoded AES-256 key (lives in URL fragment)
}

// ─── Shelby Types ─────────────────────────────────────────────────────────────

export interface ShelbyUploadResult {
  blobId: string;
  size: number;
  txHash?: string;
}

export interface BlobInfo {
  blobId: string;
  size: number;
  createdAt: number;
  expiryEpoch?: number;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type UploadStep =
  | "idle"
  | "encrypting"
  | "uploading_shelby"
  | "creating_vault"
  | "done"
  | "error";

export type AccessStep =
  | "loading"
  | "not_found"
  | "burned"
  | "expired"
  | "awaiting_wallet"
  | "ready"
  | "authorizing"
  | "decrypting"
  | "viewing"
  | "error";

export interface FilePreview {
  file: File;
  dataUrl?: string;
  type: "image" | "video" | "audio" | "pdf" | "text" | "binary";
}

// ─── Contract ABI helpers ─────────────────────────────────────────────────────

export const CONTRACT_MODULE = "burnfile::vault";

export const CONTRACT_FUNCTIONS = {
  initialize: `${CONTRACT_MODULE}::initialize`,
  createVault: `${CONTRACT_MODULE}::create_vault`,
  accessVault: `${CONTRACT_MODULE}::access_vault`,
  burnVault: `${CONTRACT_MODULE}::burn_vault`,
} as const;

export const CONTRACT_VIEWS = {
  getVaultInfo: `${CONTRACT_MODULE}::get_vault_info`,
  getVaultCount: `${CONTRACT_MODULE}::get_vault_count`,
  isInitialized: `${CONTRACT_MODULE}::is_initialized`,
  canAccess: `${CONTRACT_MODULE}::can_access`,
} as const;
