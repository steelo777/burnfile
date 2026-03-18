/// Burnfile Vault — On-chain access control for self-destructing blobs
/// Deployed on Aptos. Tracks read counts, enforces limits, emits audit log.
module burnfile::vault {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};

    // ─── Errors ────────────────────────────────────────────────────────────────
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_VAULT_NOT_FOUND: u64 = 3;
    const E_VAULT_BURNED: u64 = 4;
    const E_VAULT_EXPIRED: u64 = 5;
    const E_MAX_READS_REACHED: u64 = 6;
    const E_UNAUTHORIZED: u64 = 7;
    const E_INVALID_MAX_READS: u64 = 8;

    // ─── Structs ───────────────────────────────────────────────────────────────

    /// A single recorded access event
    struct AccessEntry has store, copy, drop {
        reader: address,
        timestamp_secs: u64,
        read_index: u64,       // Which read this was (1st, 2nd, 3rd...)
    }

    /// Core vault data stored per-upload
    struct VaultInfo has store {
        blob_id: String,           // Shelby blob identifier
        max_reads: u64,            // Maximum times this can be read (0 = unlimited)
        reads_count: u64,          // How many times it has been read
        created_at: u64,           // Unix timestamp of creation
        expiry_ts: u64,            // Unix timestamp expiry (0 = no expiry)
        owner: address,            // Who created this vault
        is_burned: bool,           // True when permanently destroyed
        file_name: String,         // Original filename (not the content)
        file_size: u64,            // File size in bytes
        mime_type: String,         // MIME type for display purposes
        access_log: vector<AccessEntry>,
    }

    /// Per-account registry of all vaults created by that account
    struct VaultRegistry has key {
        vaults: Table<u64, VaultInfo>,
        vault_count: u64,
        // Event handles
        create_events: EventHandle<VaultCreatedEvent>,
        access_events: EventHandle<VaultAccessedEvent>,
        burn_events: EventHandle<VaultBurnedEvent>,
    }

    // ─── Events ────────────────────────────────────────────────────────────────

    struct VaultCreatedEvent has drop, store {
        vault_id: u64,
        owner: address,
        blob_id: String,
        max_reads: u64,
        expiry_ts: u64,
        file_name: String,
        file_size: u64,
        created_at: u64,
    }

    struct VaultAccessedEvent has drop, store {
        vault_id: u64,
        owner: address,
        reader: address,
        read_index: u64,
        reads_remaining: u64,
        timestamp_secs: u64,
    }

    struct VaultBurnedEvent has drop, store {
        vault_id: u64,
        owner: address,
        total_reads: u64,
        burned_at: u64,
        burn_reason: String,  // "max_reads" | "manual" | "expired"
    }

    // ─── Initialisation ────────────────────────────────────────────────────────

    /// Must be called once per account before creating vaults
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<VaultRegistry>(addr), E_ALREADY_INITIALIZED);

        move_to(account, VaultRegistry {
            vaults: table::new(),
            vault_count: 0,
            create_events: account::new_event_handle<VaultCreatedEvent>(account),
            access_events: account::new_event_handle<VaultAccessedEvent>(account),
            burn_events: account::new_event_handle<VaultBurnedEvent>(account),
        });
    }

    // ─── Vault Management ──────────────────────────────────────────────────────

    /// Create a new vault. Returns the vault_id (u64).
    public entry fun create_vault(
        account: &signer,
        blob_id: vector<u8>,
        max_reads: u64,
        expiry_ts: u64,
        file_name: vector<u8>,
        file_size: u64,
        mime_type: vector<u8>,
    ) acquires VaultRegistry {
        let owner_addr = signer::address_of(account);
        assert!(exists<VaultRegistry>(owner_addr), E_NOT_INITIALIZED);
        assert!(max_reads > 0 && max_reads <= 10000, E_INVALID_MAX_READS);

        let registry = borrow_global_mut<VaultRegistry>(owner_addr);
        let vault_id = registry.vault_count + 1;
        let now = timestamp::now_seconds();

        let vault = VaultInfo {
            blob_id: string::utf8(blob_id),
            max_reads,
            reads_count: 0,
            created_at: now,
            expiry_ts,
            owner: owner_addr,
            is_burned: false,
            file_name: string::utf8(file_name),
            file_size,
            mime_type: string::utf8(mime_type),
            access_log: vector::empty<AccessEntry>(),
        };

        table::add(&mut registry.vaults, vault_id, vault);
        registry.vault_count = vault_id;

        event::emit_event(&mut registry.create_events, VaultCreatedEvent {
            vault_id,
            owner: owner_addr,
            blob_id: string::utf8(blob_id),
            max_reads,
            expiry_ts,
            file_name: string::utf8(file_name),
            file_size,
            created_at: now,
        });
    }

    /// Record a read access and authorise it. Called by recipient before pulling blob from Shelby.
    /// Returns true if access granted. Emits event regardless so audit log is complete.
    public entry fun access_vault(
        accessor: &signer,
        owner_addr: address,
        vault_id: u64,
    ) acquires VaultRegistry {
        assert!(exists<VaultRegistry>(owner_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<VaultRegistry>(owner_addr);
        assert!(table::contains(&registry.vaults, vault_id), E_VAULT_NOT_FOUND);

        let vault = table::borrow_mut(&mut registry.vaults, vault_id);
        let now = timestamp::now_seconds();

        // Check burned
        assert!(!vault.is_burned, E_VAULT_BURNED);

        // Check expiry
        if (vault.expiry_ts > 0) {
            assert!(now <= vault.expiry_ts, E_VAULT_EXPIRED);
        };

        // Check max reads
        assert!(vault.reads_count < vault.max_reads, E_MAX_READS_REACHED);

        // Increment read count
        vault.reads_count = vault.reads_count + 1;
        let read_index = vault.reads_count;
        let reader_addr = signer::address_of(accessor);

        // Append to access log
        vector::push_back(&mut vault.access_log, AccessEntry {
            reader: reader_addr,
            timestamp_secs: now,
            read_index,
        });

        let reads_remaining = vault.max_reads - vault.reads_count;

        // Auto-burn if we just hit the limit
        if (vault.reads_count >= vault.max_reads) {
            vault.is_burned = true;
            event::emit_event(&mut registry.burn_events, VaultBurnedEvent {
                vault_id,
                owner: owner_addr,
                total_reads: vault.reads_count,
                burned_at: now,
                burn_reason: string::utf8(b"max_reads"),
            });
        };

        event::emit_event(&mut registry.access_events, VaultAccessedEvent {
            vault_id,
            owner: owner_addr,
            reader: reader_addr,
            read_index,
            reads_remaining,
            timestamp_secs: now,
        });
    }

    /// Owner can manually destroy a vault before the read limit
    public entry fun burn_vault(
        account: &signer,
        vault_id: u64,
    ) acquires VaultRegistry {
        let owner_addr = signer::address_of(account);
        assert!(exists<VaultRegistry>(owner_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<VaultRegistry>(owner_addr);
        assert!(table::contains(&registry.vaults, vault_id), E_VAULT_NOT_FOUND);

        let vault = table::borrow_mut(&mut registry.vaults, vault_id);
        assert!(!vault.is_burned, E_VAULT_BURNED);
        assert!(vault.owner == owner_addr, E_UNAUTHORIZED);

        vault.is_burned = true;
        let now = timestamp::now_seconds();

        event::emit_event(&mut registry.burn_events, VaultBurnedEvent {
            vault_id,
            owner: owner_addr,
            total_reads: vault.reads_count,
            burned_at: now,
            burn_reason: string::utf8(b"manual"),
        });
    }

    // ─── View Functions ────────────────────────────────────────────────────────

    #[view]
    public fun get_vault_info(owner_addr: address, vault_id: u64): (
        String,  // blob_id
        u64,     // max_reads
        u64,     // reads_count
        u64,     // expiry_ts
        bool,    // is_burned
        String,  // file_name
        u64,     // file_size
        String,  // mime_type
        u64,     // created_at
    ) acquires VaultRegistry {
        assert!(exists<VaultRegistry>(owner_addr), E_NOT_INITIALIZED);
        let registry = borrow_global<VaultRegistry>(owner_addr);
        assert!(table::contains(&registry.vaults, vault_id), E_VAULT_NOT_FOUND);

        let vault = table::borrow(&registry.vaults, vault_id);
        (
            vault.blob_id,
            vault.max_reads,
            vault.reads_count,
            vault.expiry_ts,
            vault.is_burned,
            vault.file_name,
            vault.file_size,
            vault.mime_type,
            vault.created_at,
        )
    }

    #[view]
    public fun get_vault_count(owner_addr: address): u64 acquires VaultRegistry {
        if (!exists<VaultRegistry>(owner_addr)) { return 0 };
        borrow_global<VaultRegistry>(owner_addr).vault_count
    }

    #[view]
    public fun is_initialized(addr: address): bool {
        exists<VaultRegistry>(addr)
    }

    #[view]
    public fun can_access(owner_addr: address, vault_id: u64): bool acquires VaultRegistry {
        if (!exists<VaultRegistry>(owner_addr)) { return false };
        let registry = borrow_global<VaultRegistry>(owner_addr);
        if (!table::contains(&registry.vaults, vault_id)) { return false };
        let vault = table::borrow(&registry.vaults, vault_id);
        let now = timestamp::now_seconds();
        if (vault.is_burned) { return false };
        if (vault.expiry_ts > 0 && now > vault.expiry_ts) { return false };
        vault.reads_count < vault.max_reads
    }
}
