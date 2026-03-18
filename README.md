# 🔥 Burnfile

> Self-destructing encrypted file vault. Built on [Shelby Protocol](https://shelby.xyz) and [Aptos](https://aptoslabs.com).

Files that destroy themselves after N reads. Not by a server you have to trust — by a smart contract you can audit.

---

## How It Works

```
Upload → AES-256 encrypt (browser) → Store on Shelby → Create on-chain vault
Share link (encryption key lives in URL fragment, never transmitted)

Recipient → Connect wallet → Sign access tx (increments on-chain counter)
         → Download encrypted blob → Decrypt in browser → View file

When counter == max_reads → Smart contract revokes access permanently
```

**Three properties that only work because of Shelby + Aptos:**

1. **Read counting is on-chain** — every access is a signed transaction; you can't fake a read or skip the counter
2. **Storage is decentralized** — no company can delete the blob or unilaterally grant access
3. **Encryption key never touches a server** — lives only in the URL fragment; the server sees only ciphertext

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | File-based routing, server components, great DX |
| Language | TypeScript (strict) | Type safety across contract interactions |
| Styling | Tailwind CSS v3 + custom CSS | Utility-first + precise custom animations |
| Animations | Framer Motion + CSS | Smooth transitions without jank |
| Wallet | `@aptos-labs/wallet-adapter-react` | Official Aptos adapter, supports Petra + more |
| Blockchain SDK | `@aptos-labs/ts-sdk` | Type-safe Aptos contract calls and event fetching |
| Storage | Shelby Protocol TypeScript SDK | High-performance decentralized blob storage |
| Encryption | Web Crypto API (browser-native) | Zero dependencies, AES-256-GCM, FIPS-approved |
| Smart Contract | Move (Aptos) | Resource-safe, auditable access control |
| Deployment | Vercel | Zero-config, edge-optimized Next.js hosting |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20.x | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10.x | Comes with Node |
| Aptos CLI | Latest | See below |
| Petra Wallet | Latest | [petra.app](https://petra.app) (browser extension) |
| Git | Any | [git-scm.com](https://git-scm.com) |

### Install Aptos CLI

```bash
# macOS
brew install aptos

# Linux
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

# Windows
iwr "https://aptos.dev/scripts/install_cli.py" -useb | python3

# Verify
aptos --version
```

---

## Quick Start (Local Dev with Mock)

The fastest way to run Burnfile locally without deploying any contracts.

```bash
# 1. Clone the repo
git clone https://github.com/yourname/burnfile.git
cd burnfile

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local

# .env.local — keep these defaults for mock mode:
# NEXT_PUBLIC_USE_MOCK_SHELBY=true
# NEXT_PUBLIC_APTOS_NETWORK=testnet

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In mock mode:
- Files are encrypted in the browser (real AES-256-GCM)
- Blobs are stored in-memory (cleared on page refresh)
- Wallet interactions are simulated
- All UI flows work end-to-end

---

## Full Setup (Testnet Deployment)

### Step 1: Create Aptos Account

```bash
# Initialize a new account on testnet
aptos init --profile testnet --network testnet

# Fund it with testnet APT
aptos account fund-with-faucet --profile testnet --amount 100000000
```

This creates `~/.aptos/config.yaml` with your key.

### Step 2: Get Your Contract Address

```bash
# Get the address of your testnet account
aptos account list --profile testnet
```

Note the `Account Address` — this is your `CONTRACT_ADDRESS`.

### Step 3: Deploy the Smart Contract

```bash
# Compile first to catch any errors
npm run contract:compile

# Run tests
npm run contract:test

# Deploy to testnet
npm run contract:publish
# This runs: aptos move publish --package-dir contracts/burnfile \
#   --named-addresses burnfile=$CONTRACT_ADDR --profile testnet
```

After publishing, you'll see a transaction hash. Verify on [Aptos Explorer](https://explorer.aptoslabs.com/?network=testnet).

### Step 4: Get Shelby RPC Access

1. Go to [developers.shelby.xyz/apply](https://developers.shelby.xyz/apply)
2. Sign in with GitHub and apply to the early access program
3. Once approved, you'll receive an RPC endpoint URL
4. Optionally get an Aptos API key from [developers.aptoslabs.com](https://developers.aptoslabs.com)

### Step 5: Configure Environment

Edit `.env.local`:

```env
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_API_KEY=your_api_key_here
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_your_deployed_contract_address
NEXT_PUBLIC_SHELBY_RPC=https://rpc.testnet.shelby.xyz
NEXT_PUBLIC_USE_MOCK_SHELBY=false
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 6: Plug In the Real Shelby SDK

When your Shelby SDK access is granted:

```bash
npm install @shelby-protocol/sdk
```

Then in `lib/shelby.ts`, replace the mock implementations:

```typescript
// At the top of the file, import the real SDK:
import { ShelbySDK } from "@shelby-protocol/sdk";

// In the constructor:
this.client = new ShelbySDK({ rpc: this.rpcEndpoint });

// In uploadBlob():
const result = await this.client.writeBlob(data, { storageEpochs });
return { blobId: result.blobId, size: data.length, txHash: result.txHash };

// In downloadBlob():
const channel = await this.client.openPaymentChannel(walletSigner);
const data = await this.client.readBlob(blobId, { channel });
return data;
```

The rest of the app does not need to change — the abstraction handles it.

### Step 7: Run Locally Against Testnet

```bash
npm run dev
```

Test the full flow:
1. Upload a file with max reads = 1
2. Copy the share link
3. Open it in a different browser / incognito
4. Connect a second wallet
5. Click Authorize — confirm the transaction
6. The file decrypts and displays
7. Try opening the link again — it should show "DESTROYED"

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# https://vercel.com/your-team/burnfile/settings/environment-variables
# Add all variables from .env.example with real values
```

Or deploy via Vercel's GitHub integration:

1. Push to GitHub
2. Connect repo at [vercel.com/new](https://vercel.com/new)
3. Add env vars in the dashboard
4. Deploy

---

## Project Structure

```
burnfile/
├── app/
│   ├── layout.tsx          # Root layout, fonts, metadata
│   ├── page.tsx            # Home — upload + vault creation
│   ├── globals.css         # Design system, animations, utilities
│   ├── providers.tsx       # Wallet adapter provider
│   └── burn/[id]/
│       └── page.tsx        # Recipient — access, decrypt, view
│
├── components/
│   ├── Nav.tsx             # Top navigation
│   ├── WalletButton.tsx    # Wallet connection + dropdown
│   ├── UploadZone.tsx      # Drag-and-drop file upload
│   ├── BurnConfig.tsx      # Max reads + expiry settings
│   ├── ShareModal.tsx      # Post-upload share link modal
│   ├── BurnCounter.tsx     # Animated reads remaining display
│   ├── AccessLog.tsx       # On-chain read history
│   └── FileViewer.tsx      # In-browser file preview
│
├── lib/
│   ├── shelby.ts           # Shelby Protocol SDK abstraction
│   ├── crypto.ts           # AES-256-GCM browser encryption
│   ├── aptos.ts            # Smart contract interactions
│   └── utils.ts            # Formatting, helpers
│
├── types/
│   └── index.ts            # TypeScript interfaces + ABI constants
│
├── contracts/
│   └── burnfile/
│       ├── Move.toml       # Move package manifest
│       └── sources/
│           └── burnfile.move  # Vault access control contract
│
├── .env.example            # Environment variable template
├── tailwind.config.ts      # Design tokens + custom animations
├── next.config.ts          # Next.js config
└── tsconfig.json           # TypeScript config (strict)
```

---

## Smart Contract Reference

The Move contract lives at `contracts/burnfile/sources/burnfile.move`.

### Public entry functions

| Function | Who calls it | What it does |
|----------|-------------|--------------|
| `initialize(account)` | Vault creator (once) | Creates the VaultRegistry resource |
| `create_vault(...)` | Uploader | Registers blob ID, max reads, expiry |
| `access_vault(accessor, owner, vault_id)` | File reader | Records read, enforces limits, auto-burns |
| `burn_vault(account, vault_id)` | Owner only | Manual early destruction |

### View functions (no gas)

| Function | Returns |
|----------|---------|
| `get_vault_info(owner, vault_id)` | Blob ID, max reads, read count, expiry, burn status, file metadata |
| `can_access(owner, vault_id)` | `bool` — quick check before authorizing |
| `get_vault_count(owner)` | Total vaults created by this address |
| `is_initialized(addr)` | Whether VaultRegistry exists |

### Events emitted

| Event | When |
|-------|------|
| `VaultCreatedEvent` | New vault registered |
| `VaultAccessedEvent` | Every successful read (includes reader address, read index, remaining) |
| `VaultBurnedEvent` | Vault hits max reads or is manually destroyed |

All events are permanent on-chain and form the tamper-proof audit log.

---

## Security Model

### What Burnfile protects against

| Threat | Protection |
|--------|-----------|
| Server reads your file | AES-256-GCM client-side encryption before upload |
| Server lies about read count | Read count is tracked on Aptos — no server involved |
| Admin bypasses the read limit | Smart contract enforces it — no admin key |
| Someone reads without counting | All access must go through `access_vault()` transaction |
| File is readable after burn | Smart contract blocks `access_vault()` — no access token issued |
| Key leaks via server logs | Key lives in URL fragment (`#key`) — browsers don't send fragments to servers |

### What Burnfile does NOT protect against

| Threat | Status |
|--------|--------|
| Recipient screenshots / copies the file | **Not preventable** — once decrypted in browser, user controls it |
| Key leaks via browser history | Fragment is in history — use private browsing for max sensitivity |
| Shelby network failure | File inaccessible until network recovers — durability depends on SP uptime |
| Smart contract bugs | Auditing recommended before mainnet — contract is unaudited |

---

## Development Notes

### Running the Move tests

```bash
npm run contract:test
# or directly:
aptos move test --package-dir contracts/burnfile
```

### Type checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Parsing vault index from transaction events

In the current implementation, the vault index after creation is approximated. For production, parse it from the `VaultCreatedEvent`:

```typescript
// After signAndSubmitTransaction:
const txResponse = await aptos.waitForTransaction({ transactionHash: txResult.hash });
const events = txResponse.events;
const createEvent = events.find(e => e.type.includes("VaultCreatedEvent"));
const vaultIndex = Number(createEvent?.data?.vault_id);
```

---

## Roadmap

- [ ] Parse vault_id from transaction events (remove approximation)
- [ ] Real Shelby SDK integration (pending SDK release)
- [ ] QR code for share links
- [ ] Shareable vault with password fallback (no wallet required for recipient)
- [ ] Batch upload (multiple files → one vault)
- [ ] Email notification on each read (opt-in, server-side only, no content access)
- [ ] Dashboard: all vaults you've created
- [ ] Mainnet deployment

---

## Contributing

PRs welcome. Please open an issue before large changes.

```bash
git checkout -b feature/your-feature
npm run type-check
npm run lint
# open PR
```

---

## License

MIT — see `LICENSE`.

---

Built with [Shelby Protocol](https://shelby.xyz) × [Aptos](https://aptoslabs.com)
