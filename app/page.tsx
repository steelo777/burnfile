"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Flame, Lock, Zap, Shield, Upload, AlertCircle,
  ChevronDown, ChevronUp, ArrowRight, Globe, Key, Activity
} from "lucide-react";
import { DocsLayout } from "@/components/DocsLayout";
import { UploadZone } from "@/components/UploadZone";
import { BurnConfig } from "@/components/BurnConfig";
import { ShareModal } from "@/components/ShareModal";
import { encryptFile, packEncryptedBlob, buildShareUrl } from "@/lib/crypto";
import shelby from "@/lib/shelby";
import {
  buildInitializePayload,
  buildCreateVaultPayload,
  encodeVaultId,
  isContractInitialized,
} from "@/lib/aptos";
import type { UploadConfig, UploadResult, UploadStep, FilePreview } from "@/types";

const DEFAULT_CONFIG: UploadConfig = { maxReads: 1, expiryTs: 0, selfDestruct: true };

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "Create Vault",
  encrypting: "Encrypting locally…",
  uploading_shelby: "Uploading to Shelby…",
  creating_vault: "Creating on-chain vault…",
  done: "Vault created!",
  error: "Try again",
};

const TOC = [
  { label: "Create a Vault", anchor: "upload" },
  { label: "How It Works",   anchor: "how" },
  { label: "Encryption",     anchor: "encryption" },
  { label: "Storage",        anchor: "storage" },
  { label: "Access Control", anchor: "access" },
];

export default function HomePage() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [config, setConfig] = useState<UploadConfig>(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const canUpload = selectedFile && connected && (step === "idle" || step === "error");

  const handleFileSelect = useCallback((file: File, preview: FilePreview) => {
    setSelectedFile(file);
    setFilePreview(preview);
    setSettingsOpen(true);
    setError(null);
  }, []);

  const handleClear = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setSettingsOpen(false);
    setStep("idle");
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !account?.address) return;
    setError(null);
    setProgress(0);

    try {
      setStep("encrypting");
      const { ciphertext, iv, keyB64 } = await encryptFile(selectedFile);
      const packed = packEncryptedBlob(ciphertext, iv);

      setStep("uploading_shelby");
      const shelbyResult = await shelby.uploadBlob(packed, {
        onProgress: (p) => setProgress(p),
      });
      setProgress(100);

      setStep("creating_vault");
      const ownerAddr = account.address.toString();
      const isMock = process.env.NEXT_PUBLIC_USE_MOCK_SHELBY === "true";
      let txHash = "";
      const vaultIndex = Date.now() % 1000000;

      if (isMock) {
        await new Promise((r) => setTimeout(r, 1200));
        txHash = `mock_tx_${Date.now().toString(16)}`;
        const mockVaultInfo = {
          blobId: shelbyResult.blobId,
          maxReads: config.maxReads,
          readsCount: 0,
          expiryTs: config.expiryTs,
          isBurned: false,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type || "application/octet-stream",
          createdAt: Math.floor(Date.now() / 1000),
          owner: ownerAddr,
        };
        const mockVaultId = encodeVaultId(ownerAddr, vaultIndex);
        localStorage.setItem(`mockVault:${mockVaultId}`, JSON.stringify(mockVaultInfo));
      } else {
        const initialized = await isContractInitialized(ownerAddr);
        if (!initialized) {
          await signAndSubmitTransaction({ data: buildInitializePayload() });
          await new Promise((r) => setTimeout(r, 2000));
        }
        const createPayload = buildCreateVaultPayload({
          blobId: shelbyResult.blobId,
          maxReads: config.maxReads,
          expiryTs: config.expiryTs,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type || "application/octet-stream",
        });
        const txResult = await signAndSubmitTransaction({ data: createPayload });
        await new Promise((r) => setTimeout(r, 1500));
        txHash = txResult.hash ?? shelbyResult.txHash ?? "";
      }

      const vaultId = encodeVaultId(ownerAddr, vaultIndex);
      const shareUrl = buildShareUrl(window.location.origin, vaultId, keyB64);
      setResult({ vaultId, blobId: shelbyResult.blobId, shareUrl, txHash });
      setStep("done");
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setStep("error");
    }
  };

  const isLoading = ["encrypting", "uploading_shelby", "creating_vault"].includes(step);
  const progressWidth =
    step === "encrypting" ? "30%" :
    step === "uploading_shelby" ? `${30 + progress * 0.5}%` :
    step === "creating_vault" ? "90%" : "100%";

  return (
    <DocsLayout toc={TOC}>
      <div className="space-y-12">

        {/* ── Hero ── */}
        <section className="stagger" id="overview">
          <div className="shelby-tag mb-5">
            <Flame className="w-3 h-3" style={{color:"#BE185D"}} />
            Shelby Protocol × Aptos
          </div>

          <h1 style={{ color: "#E6EDF3", marginBottom: "16px" }}>
            Files that destroy{" "}
            <span style={{ color: "#EC4899" }}>themselves.</span>
          </h1>

          <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--text-secondary)", maxWidth: "560px" }}>
            Upload any file. Set a maximum read count. When the limit is hit, access
            is permanently revoked — enforced by smart contract, not a server you have to trust.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Lock,   text: "AES-256-GCM client-side encryption" },
              { icon: Globe,  text: "Shelby decentralized storage" },
              { icon: Shield, text: "On-chain read enforcement" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#EC4899" }} />
                {text}
              </div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="divider" />

        {/* ── Upload section ── */}
        <section id="upload" className="space-y-6">
          <div>
            <h2 style={{ color: "var(--text-primary)", fontSize: "24px", marginBottom: "6px" }}>
              Create a Vault
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Encrypt and upload a file. Set how many times it can be opened. Share the link.
            </p>
          </div>

          {/* Upload card */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            {/* Card header */}
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{ borderColor: "var(--border-color)", background: "var(--bg-secondary)" }}
            >
              <Upload className="w-3.5 h-3.5" style={{ color: "#EC4899" }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>New Burnfile</span>
              <span className="flex-1" />
              <span className="badge-teal text-[10px]">ENCRYPTED</span>
            </div>

            <div className="p-5 space-y-5">
              <UploadZone
                onFileSelect={handleFileSelect}
                onClear={handleClear}
                selectedFile={selectedFile}
                disabled={isLoading}
              />

              {/* Settings accordion */}
              {selectedFile && (
                <div className="animate-slide-up">
                  <button
                    onClick={() => setSettingsOpen((v) => !v)}
                    className="w-full flex items-center justify-between py-2 text-xs font-mono font-semibold transition-colors"
                    style={{ color: settingsOpen ? "#EC4899" : "var(--text-muted)" }}
                  >
                    <span className="uppercase tracking-widest">Burn Settings</span>
                    {settingsOpen
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />
                    }
                  </button>
                  {settingsOpen && (
                    <div className="pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                      <BurnConfig config={config} onChange={setConfig} disabled={isLoading} />
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {isLoading && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex justify-between text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text-primary)" }}>{STEP_LABELS[step]}</span>
                    {step === "uploading_shelby" && <span>{progress}%</span>}
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill transition-all duration-300"
                      style={{ width: progressWidth, background: "#EC4899" }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="alert alert-error animate-slide-up flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                  <span>{error}</span>
                </div>
              )}

              {/* CTA */}
              {!connected ? (
                <div
                  className="rounded-lg p-4 text-center text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
                >
                  Connect your Aptos wallet to create a vault
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Wallet signature required for on-chain vault registration
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  disabled={!canUpload || isLoading}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#071a16]/30 border-t-[#071a16] rounded-full animate-spin" />
                      {STEP_LABELS[step]}
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4" />
                      {selectedFile ? "Create Vault" : "Select a file to continue"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <p className="text-xs font-mono text-center" style={{ color: "var(--text-muted)" }}>
            Encryption key stays in your browser. Never transmitted. Never stored.
          </p>
        </section>

        <div className="divider" />

        {/* ── How it works ── */}
        <section id="how" className="space-y-6">
          <div>
            <h2 style={{ color: "var(--text-primary)", fontSize: "24px", marginBottom: "6px" }}>
              How It Works
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Three primitives. No trusted parties.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Lock,
                step: "01",
                title: "Encrypt",
                color: "#7DD3FC",
                bg: "rgba(125,211,252,0.06)",
                border: "rgba(125,211,252,0.15)",
                desc: "Your file is encrypted with AES-256-GCM in your browser. The key is embedded in the share link and never leaves your device.",
              },
              {
                icon: Globe,
                step: "02",
                title: "Store",
                color: "#5EEAD4",
                bg: "rgba(94,234,212,0.06)",
                border: "rgba(94,234,212,0.15)",
                desc: "The encrypted blob is uploaded to Shelby Protocol — decentralized, high-performance blob storage built on Aptos.",
              },
              {
                icon: Shield,
                step: "03",
                title: "Destroy",
                color: "#F87171",
                bg: "rgba(239,68,68,0.06)",
                border: "rgba(239,68,68,0.15)",
                desc: "An Aptos Move smart contract tracks reads. When the read limit is hit, it permanently revokes access. No override exists.",
              },
            ].map(({ icon: Icon, step: s, title, color, bg, border, desc }) => (
              <div
                key={title}
                className="rounded-xl p-5 space-y-3 card-hover"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                    STEP {s}
                  </span>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* ── Burnfiles section ── */}
        <section id="burnfiles-section" className="space-y-4">
          <h2 style={{ color: "var(--text-primary)", fontSize: "24px" }}>Burnfiles</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            A <strong>Burnfile</strong> is a file vault with a built-in self-destruct mechanism.
            Unlike a normal file share, a Burnfile has two properties enforced at the protocol level:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Max Reads", desc: "The maximum number of times the file can be opened. Set by the uploader. Tracked on-chain. Cannot be changed after creation." },
              { label: "Encrypted Blob", desc: "The file is encrypted with AES-256-GCM before it ever leaves your browser. Only someone with the URL fragment key can decrypt it." },
              { label: "Read Counter", desc: "Every access is a signed Aptos transaction. The counter is immutable — no server can reset or bypass it." },
              { label: "Auto-Destroy", desc: "When reads_count reaches max_reads, the Move smart contract sets is_burned = true. Access is permanently revoked." },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl p-4 space-y-1.5 card-hover" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                <p className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>{label}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* ── Encryption section ── */}
        <section id="encryption" className="space-y-4">
          <h2 style={{ color: "var(--text-primary)", fontSize: "24px" }}>Encryption</h2>

          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Burnfile uses AES-256-GCM, implemented via the browser-native Web Crypto API.
            No third-party encryption libraries. The key is generated in your browser, embedded
            in the URL fragment (<code className="code-inline">#key</code>), and never transmitted
            to any server — not Shelby, not Burnfile, not anyone.
          </p>

          <div
            className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Algorithm", value: "AES-256-GCM" },
                { label: "Key length", value: "256-bit" },
                { label: "IV", value: "96-bit random" },
                { label: "Key location", value: "URL fragment only" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 px-3 rounded-lg"
                  style={{ background: "var(--bg-secondary)" }}>
                  <span className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span className="text-sm font-mono font-semibold" style={{ color: "#EC4899" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="alert alert-info flex items-start gap-2.5">
            <Key className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#7DD3FC" }} />
            <span className="text-sm">
              The URL fragment (<code className="code-inline">#…</code>) is never sent to servers —
              browsers strip it from HTTP requests. Your key is mathematically private.
            </span>
          </div>
        </section>

        <div className="divider" />

        {/* ── Storage section ── */}
        <section id="storage" className="space-y-4">
          <h2 style={{ color: "var(--text-primary)", fontSize: "24px" }}>Storage</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Encrypted blobs are stored on{" "}
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer"
              style={{ color: "#EC4899" }}>
              Shelby Protocol
            </a>
            {" "} — a decentralized blob storage network built on Aptos with sub-second reads
            over dedicated fiber infrastructure. Unlike IPFS or Arweave, Shelby's paid-read
            model means every file access is a verifiable on-chain event.
          </p>
          <div className="alert alert-success flex items-center gap-2.5">
            <Activity className="w-4 h-4 flex-shrink-0" style={{ color: "#22C55E" }} />
            <span className="text-sm">
              Currently running in <strong>mock mode</strong>. Set{" "}
              <code className="code-inline">NEXT_PUBLIC_USE_MOCK_SHELBY=false</code> and add the
              Shelby SDK to connect to the live network.
            </span>
          </div>
        </section>

        <div className="divider" />

        {/* ── Access Control section ── */}
        <section id="access" className="space-y-4">
          <h2 style={{ color: "var(--text-primary)", fontSize: "24px" }}>Access Control</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Every read is recorded as a signed transaction on the Aptos blockchain.
            The <code className="code-inline">burnfile::vault</code> Move module enforces
            the read limit atomically — when the counter hits <code className="code-inline">maxReads</code>,
            the contract permanently revokes access. No admin can override this.
          </p>

          <div className="code-block">
            <span style={{ color: "var(--text-muted)" }}>// Aptos Move — access gate</span>{"\n"}
            <span style={{ color: "#7DD3FC" }}>public entry fun</span>{" "}
            <span style={{ color: "#EC4899" }}>access_vault</span>
            {"(accessor: &signer, owner: address, vault_id: u64) {"}{"\n"}
            {"  "}<span style={{ color: "var(--text-muted)" }}>// Checks: not burned, not expired, reads_count &lt; max_reads</span>{"\n"}
            {"  "}<span style={{ color: "#7DD3FC" }}>assert</span>{"(!vault.is_burned, E_VAULT_BURNED);"}{"\n"}
            {"  "}<span style={{ color: "#7DD3FC" }}>assert</span>{"(vault.reads_count < vault.max_reads, E_MAX_READS_REACHED);"}{"\n"}
            {"  vault.reads_count = vault.reads_count + 1;"}{"\n"}
            {"  "}<span style={{ color: "var(--text-muted)" }}>// Auto-burn when limit hit</span>{"\n"}
            {"  "}<span style={{ color: "#7DD3FC" }}>if</span>{"(vault.reads_count >= vault.max_reads) { vault.is_burned = true; }"}{"\n"}
            {"}"}
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="divider" />
        <div className="flex items-center justify-between text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          <span>Built on Shelby Protocol × Aptos</span>
          <a
            href="https://docs.shelby.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#5EEAD4")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            Shelby Docs <ArrowRight className="w-3 h-3" />
          </a>
        </div>

      </div>

      {/* Share modal */}
      {result && step === "done" && (
        <ShareModal
          result={result}
          maxReads={config.maxReads}
          expiryTs={config.expiryTs}
          fileName={selectedFile?.name ?? ""}
          onClose={() => { setResult(null); handleClear(); setStep("idle"); }}
        />
      )}
    </DocsLayout>
  );
}
