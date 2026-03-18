/**
 * Aptos smart contract interaction layer.
 * Uses @aptos-labs/ts-sdk for type-safe contract calls.
 */

import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  type InputViewFunctionData,
  type InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import {
  CONTRACT_FUNCTIONS,
  CONTRACT_VIEWS,
  type VaultInfo,
  type VaultId,
} from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const NETWORK =
  (process.env.NEXT_PUBLIC_APTOS_NETWORK as Network) ?? Network.TESTNET;

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000000000000000000000000001"; // placeholder

export const aptos = new Aptos(new AptosConfig({ network: NETWORK }));

// ─── View: Get vault info ─────────────────────────────────────────────────────

export async function getVaultInfo(
  ownerAddress: string,
  vaultIndex: number
): Promise<VaultInfo | null> {
  try {
    const payload: InputViewFunctionData = {
      function: CONTRACT_VIEWS.getVaultInfo as `${string}::${string}::${string}`,
      functionArguments: [
        AccountAddress.fromString(ownerAddress),
        BigInt(vaultIndex),
      ],
    };

    const result = await aptos.view({ payload });
    if (!result || result.length < 9) return null;

    const [
      blobId,
      maxReads,
      readsCount,
      expiryTs,
      isBurned,
      fileName,
      fileSize,
      mimeType,
      createdAt,
    ] = result as [string, string, string, string, boolean, string, string, string, string];

    return {
      blobId,
      maxReads: Number(maxReads),
      readsCount: Number(readsCount),
      expiryTs: Number(expiryTs),
      isBurned,
      fileName,
      fileSize: Number(fileSize),
      mimeType,
      createdAt: Number(createdAt),
      owner: ownerAddress,
    };
  } catch (err) {
    console.error("getVaultInfo error:", err);
    return null;
  }
}

// ─── View: Can access ─────────────────────────────────────────────────────────

export async function canAccess(
  ownerAddress: string,
  vaultIndex: number
): Promise<boolean> {
  try {
    const payload: InputViewFunctionData = {
      function: CONTRACT_VIEWS.canAccess as `${string}::${string}::${string}`,
      functionArguments: [
        AccountAddress.fromString(ownerAddress),
        BigInt(vaultIndex),
      ],
    };
    const result = await aptos.view({ payload });
    return Boolean(result[0]);
  } catch {
    return false;
  }
}

// ─── View: Is initialized ─────────────────────────────────────────────────────

export async function isContractInitialized(address: string): Promise<boolean> {
  try {
    const payload: InputViewFunctionData = {
      function: CONTRACT_VIEWS.isInitialized as `${string}::${string}::${string}`,
      functionArguments: [AccountAddress.fromString(address)],
    };
    const result = await aptos.view({ payload });
    return Boolean(result[0]);
  } catch {
    return false;
  }
}

// ─── Transaction payloads ─────────────────────────────────────────────────────
// These return the payload only — the wallet adapter signs + submits them.

export function buildInitializePayload(): InputGenerateTransactionPayloadData {
  return {
    function: CONTRACT_FUNCTIONS.initialize as `${string}::${string}::${string}`,
    functionArguments: [],
  };
}

export function buildCreateVaultPayload(params: {
  blobId: string;
  maxReads: number;
  expiryTs: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): InputGenerateTransactionPayloadData {
  const encoder = new TextEncoder();
  return {
    function: CONTRACT_FUNCTIONS.createVault as `${string}::${string}::${string}`,
    functionArguments: [
      Array.from(encoder.encode(params.blobId)),
      BigInt(params.maxReads),
      BigInt(params.expiryTs),
      Array.from(encoder.encode(params.fileName)),
      BigInt(params.fileSize),
      Array.from(encoder.encode(params.mimeType)),
    ],
  };
}

export function buildAccessVaultPayload(
  ownerAddress: string,
  vaultIndex: number
): InputGenerateTransactionPayloadData {
  return {
    function: CONTRACT_FUNCTIONS.accessVault as `${string}::${string}::${string}`,
    functionArguments: [
      AccountAddress.fromString(ownerAddress),
      BigInt(vaultIndex),
    ],
  };
}

export function buildBurnVaultPayload(
  vaultIndex: number
): InputGenerateTransactionPayloadData {
  return {
    function: CONTRACT_FUNCTIONS.burnVault as `${string}::${string}::${string}`,
    functionArguments: [BigInt(vaultIndex)],
  };
}

// ─── Vault ID encoding ────────────────────────────────────────────────────────

export function encodeVaultId(ownerAddress: string, vaultIndex: number): string {
  // Compact URL-safe encoding: base58-ish but simple
  const addr = ownerAddress.replace("0x", "").toLowerCase();
  const idx = vaultIndex.toString(16).padStart(8, "0");
  return `${addr}${idx}`;
}

export function decodeVaultId(encoded: string): VaultId | null {
  try {
    if (encoded.length < 72) return null;
    const ownerHex = encoded.slice(0, 64);
    const idxHex = encoded.slice(64);
    return {
      ownerAddress: `0x${ownerHex}`,
      vaultIndex: parseInt(idxHex, 16),
    };
  } catch {
    return null;
  }
}

// ─── Event fetching ───────────────────────────────────────────────────────────

export interface AccessEvent {
  reader: string;
  readIndex: number;
  readsRemaining: number;
  timestampSecs: number;
}

export async function getVaultAccessEvents(
  ownerAddress: string,
  vaultIndex: number
): Promise<AccessEvent[]> {
  try {
    const events = await aptos.getAccountEventsByEventType({
      accountAddress: AccountAddress.fromString(ownerAddress),
      eventType: `${CONTRACT_ADDRESS}::vault::VaultAccessedEvent`,
      options: { limit: 100 },
    });

    return events
      .filter(
        (e: { data: { vault_id: string } }) => Number(e.data.vault_id) === vaultIndex
      )
      .map((e: { data: Record<string, string> }) => ({
        reader: e.data.reader as string,
        readIndex: Number(e.data.read_index),
        readsRemaining: Number(e.data.reads_remaining),
        timestampSecs: Number(e.data.timestamp_secs),
      }));
  } catch {
    return [];
  }
}
