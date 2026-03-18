"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Flame, Shield, Clock, Lock, AlertTriangle,
  RefreshCw, ExternalLink, Eye, ArrowLeft, Activity
} from "lucide-react";
import Link from "next/link";
import { DocsLayout } from "@/components/DocsLayout";
import { BurnCounter } from "@/components/BurnCounter";
import { AccessLog } from "@/components/AccessLog";
import { FileViewer } from "@/components/FileViewer";
import { WalletButton } from "@/components/WalletButton";
import { cn, formatBytes, formatTimestamp, timeUntil } from "@/lib/utils";
import { extractKeyFromFragment, decryptBlob, unpackEncryptedBlob } from "@/lib/crypto";
import { getVaultInfo, getVaultAccessEvents, buildAccessVaultPayload, decodeVaultId } from "@/lib/aptos";
import shelby from "@/lib/shelby";
import type { VaultInfo, AccessStep } from "@/types";
import type { AccessEvent } from "@/lib/aptos";

export default function BurnPage() {
  const params = useParams<{ id: string }>();
  const { account, connected, signAndSubmitTransaction } = useWallet();

  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([]);
  const [step, setStep] = useState<AccessStep>("loading");
  const [error, setError] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<Uint8Array | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const vaultId = params.id;

  const loadVault = useCallback(async () => {
    if (!vaultId) { setStep("not_found"); return; }
    const isMock = process.env.NEXT_PUBLIC_USE_MOCK_SHELBY === "true";

    if (isMock) {
      try {
        const raw = localStorage.getItem(`mockVault:${vaultId}`);
        if (!raw) { setStep("not_found"); return; }
        const info: VaultInfo = JSON.parse(raw);
        const now = Math.floor(Date.now() / 1000);
        if (info.isBurned) { setStep("burned"); return; }
        if (info.expiryTs > 0 && now > info.expiryTs) { setStep("expired"); return; }
        if (info.readsCount >= info.maxReads) { setStep("burned"); return; }
        setVault(info);
        setStep(connected ? "ready" : "awaiting_wallet");
      } catch { setStep("not_found"); }
      return;
    }

    const decoded = decodeVaultId(vaultId);
    if (!decoded) { setStep("not_found"); return; }
    try {
      const info = await getVaultInfo(decoded.ownerAddress, decoded.vaultIndex);
      if (!info) { setStep("not_found"); return; }
      setVault(info);
      const now = Math.floor(Date.now() / 1000);
      if (info.isBurned) { setStep("burned"); return; }
      if (info.expiryTs > 0 && now > info.expiryTs) { setStep("expired"); return; }
      if (info.readsCount >= info.maxReads) { setStep("burned"); return; }
      getVaultAccessEvents(decoded.ownerAddress, decoded.vaultIndex).then(setAccessEvents);
      setStep(connected ? "ready" : "awaiting_wallet");
    } catch (err) {
      console.error(err);
      setStep("error");
      setError("Could not load vault.");
    }
  }, [vaultId, connected]);

  useEffect(() => { loadVault(); }, [loadVault]);

  useEffect(() => {
    if (step === "awaiting_wallet" && connected) setStep("ready");
    if (step === "ready" && !connected) setStep("awaiting_wallet");
  }, [connected, step]);

  const handleAccess = async () => {
    if (!vault || !vaultId) return;
    setError(null);
    const decoded = decodeVaultId(vaultId);
    if (!decoded) return;
    const isMock = process.env.NEXT_PUBLIC_USE_MOCK_SHELBY === "true";

    try {
      setStep("authorizing");
      if (!isMock) {
        const payload = buildAccessVaultPayload(decoded.ownerAddress, decoded.vaultIndex);
        await signAndSubmitTransaction({ data: payload });
        await new Promise((r) => setTimeout(r, 1500));
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }

      setStep("decrypting");
      setDownloadProgress(0);
      const packedData = await shelby.downloadBlob(
        vault.blobId,
        { signature: "", reader: account?.address?.toString() ?? "mock", vaultId },
        (p) => setDownloadProgress(p)
      );

      const fragment = window.location.hash;
      if (!fragment) throw new Error("Encryption key not found in URL.");
      const keyB64 = extractKeyFromFragment(fragment);
      const { ciphertext, iv } = unpackEncryptedBlob(packedData);
      const plaintext = await decryptBlob(ciphertext, iv, keyB64);
      setDecryptedData(plaintext);

      if (isMock) {
        const raw = localStorage.getItem(`mockVault:${vaultId}`);
        if (raw) {
          const info: VaultInfo = JSON.parse(raw);
          info.readsCount = info.readsCount + 1;
          if (info.readsCount >= info.maxReads) info.isBurned = true;
          localStorage.setItem(`mockVault:${vaultId}`, JSON.stringify(info));
          setVault({ ...info });
        }
      } else {
        const updated = await getVaultInfo(decoded.ownerAddress, decoded.vaultIndex);
        if (updated) setVault(updated);
        const events = await getVaultAccessEvents(decoded.ownerAddress, decoded.vaultIndex);
        setAccessEvents(events);
      }
      setStep("viewing");
    } catch (err) {
      console.error("Access failed:", err);
      setError(err instanceof Error ? err.message : "Access failed.");
      setStep("ready");
    }
  };

  const isActive = !["loading","not_found","burned","expired"].includes(step);

  return (
    <DocsLayout>
      <div className="space-y-6">

        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Create a new vault
        </Link>

        {/* ── Loading ── */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-[#202938] border-t-[#EC4899] rounded-full animate-spin" />
            <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>Loading vault…</p>
          </div>
        )}

        {/* ── Not found ── */}
        {step === "not_found" && (
          <div
            className="rounded-xl p-10 flex flex-col items-center text-center space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
              <AlertTriangle className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "8px" }}>Vault not found</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                This vault doesn&apos;t exist, or the link is incorrect.
              </p>
            </div>
          </div>
        )}

        {/* ── Burned ── */}
        {step === "burned" && (
          <div
            className="rounded-xl p-10 flex flex-col items-center text-center space-y-6"
            style={{ background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <div className="relative">
              <div className="absolute inset-0 blur-2xl rounded-full" style={{ background: "rgba(239,68,68,0.15)", transform: "scale(1.5)" }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center animate-burn-pulse"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <Flame className="w-8 h-8" style={{ color: "#EF4444" }} />
              </div>
            </div>
            <div className="space-y-3">
              <h2
                className="glitch-text text-3xl font-extrabold"
                data-text="DESTROYED"
                style={{ color: "#EF4444" }}
              >
                DESTROYED
              </h2>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: "var(--text-muted)" }}>
                This vault has hit its maximum read count. Access has been permanently
                revoked by the smart contract. The file cannot be recovered by anyone.
              </p>
            </div>
            {vault && (
              <div
                className="flex items-center gap-4 text-xs font-mono px-4 py-2.5 rounded-lg"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
              >
                <span>Total reads: <strong style={{ color: "var(--text-primary)" }}>{vault.readsCount}</strong></span>
                <span style={{ color: "var(--border-color)" }}>·</span>
                <span>Max: <strong style={{ color: "var(--text-primary)" }}>{vault.maxReads}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* ── Expired ── */}
        {step === "expired" && (
          <div
            className="rounded-xl p-10 flex flex-col items-center text-center space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Clock className="w-6 h-6" style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "8px" }}>Vault Expired</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                This vault&apos;s time limit has passed.
                {vault?.expiryTs ? ` Expired at ${formatTimestamp(vault.expiryTs)}.` : ""}
              </p>
            </div>
          </div>
        )}

        {/* ── Active vault ── */}
        {isActive && vault && (
          <>
            {/* Vault header */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-secondary)" }}>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" style={{ color: "#EC4899" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Encrypted Vault</span>
                </div>
                <div className="flex items-center gap-2">
                  {step === "viewing" && <span className="badge-green">DECRYPTED</span>}
                  <button
                    onClick={loadVault}
                    className="btn-ghost p-1.5"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h2 style={{ fontSize: "18px", color: "var(--text-primary)", fontWeight: 600, marginBottom: "4px" }}>
                    {vault.fileName}
                  </h2>
                  <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                    {formatBytes(vault.fileSize)} · {vault.mimeType}
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Eye, label: "Reads Used", value: `${vault.readsCount} / ${vault.maxReads}`,
                      color: vault.readsCount >= vault.maxReads ? "#EF4444" : "#EC4899" },
                    { icon: Shield, label: "Encryption", value: "AES-256-GCM", color: "#7DD3FC" },
                    { icon: Clock, label: "Expires",
                      value: vault.expiryTs === 0 ? "Never" : timeUntil(vault.expiryTs),
                      color: "var(--text-secondary)" },
                    { icon: Activity, label: "Network", value: "Aptos Testnet", color: "var(--text-secondary)" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="rounded-lg p-3 space-y-1.5"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                          {label}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-semibold truncate" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Burn counter */}
                <BurnCounter
                  readsCount={vault.readsCount}
                  maxReads={vault.maxReads}
                  isBurned={vault.isBurned}
                />
              </div>
            </div>

            {/* ── Access gate ── */}
            {step !== "viewing" && (
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center gap-2 px-5 py-3 border-b"
                  style={{ borderColor: "var(--border-color)", background: "var(--bg-secondary)" }}>
                  <Lock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Access Gate</span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Lock icon */}
                  <div className="flex flex-col items-center gap-4 text-center py-4">
                    <div className="relative">
                      <div className="absolute inset-0 blur-2xl rounded-full transition-colors duration-500"
                        style={{
                          background: step === "authorizing" || step === "decrypting"
                            ? "rgba(236,72,153,0.12)" : "transparent"
                        }} />
                      <div className={cn(
                        "relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300"
                      )}
                        style={{
                          background: step === "authorizing" || step === "decrypting"
                            ? "rgba(236,72,153,0.08)" : "var(--bg-secondary)",
                          border: `1px solid ${step === "authorizing" || step === "decrypting"
                            ? "rgba(236,72,153,0.25)" : "var(--border-color)"}`,
                        }}>
                        {step === "authorizing" || step === "decrypting" ? (
                          <span className="w-5 h-5 border-2 border-[#0B0F14]/30 border-t-[#EC4899] rounded-full animate-spin" />
                        ) : (
                          <Lock className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                        )}
                      </div>
                    </div>

                    <div className="max-w-sm space-y-2">
                      <h3 style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>
                        {step === "awaiting_wallet" && "Connect wallet to access"}
                        {step === "ready" && "Ready to decrypt"}
                        {step === "authorizing" && "Signing on-chain…"}
                        {step === "decrypting" && `Downloading… ${downloadProgress}%`}
                      </h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                        {step === "awaiting_wallet" &&
                          "Your wallet signature records this access on-chain permanently."}
                        {step === "ready" &&
                          "Clicking Authorize records this read on-chain, then decrypts the file in your browser."}
                        {step === "authorizing" &&
                          "Confirm in your wallet. This transaction increments the read counter."}
                        {step === "decrypting" &&
                          "Pulling the encrypted blob from Shelby and decrypting locally…"}
                      </p>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="alert alert-warning flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
                    <p className="text-sm">
                      <strong style={{ color: "var(--text-primary)" }}>This counts as a read.</strong>{" "}
                      Once authorized, the counter increments permanently. There are{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {vault.maxReads - vault.readsCount} read
                        {vault.maxReads - vault.readsCount !== 1 ? "s" : ""} remaining
                      </strong>{" "}
                      including this one.
                    </p>
                  </div>

                  {error && (
                    <div className="alert alert-error flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                      <p className="text-sm">{error}</p>
                    </div>
                  )}

                  {/* CTA */}
                  {step === "awaiting_wallet" ? (
                    <div className="flex flex-col items-center gap-3">
                      <WalletButton />
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Petra or any Aptos-compatible wallet
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleAccess}
                      disabled={step === "authorizing" || step === "decrypting"}
                      className="btn-primary w-full py-3"
                    >
                      {step === "authorizing" || step === "decrypting" ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#071a16]/30 border-t-[#071a16] rounded-full animate-spin" />
                          {step === "authorizing" ? "Signing transaction…" : `Decrypting… ${downloadProgress}%`}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Authorize &amp; Decrypt
                        </>
                      )}
                    </button>
                  )}

                  <div className="text-center">
                    <a
                      href={`https://explorer.aptoslabs.com/account/${vault.owner}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#EC4899")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      View vault on Aptos Explorer
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── File content ── */}
            {step === "viewing" && decryptedData && (
              <FileViewer
                data={decryptedData}
                mimeType={vault.mimeType}
                fileName={vault.fileName}
                fileSize={vault.fileSize}
              />
            )}

            {/* Access log */}
            <AccessLog events={accessEvents} maxReads={vault.maxReads} />
          </>
        )}
      </div>
    </DocsLayout>
  );
}
