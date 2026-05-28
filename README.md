# Live Cursors on Solana

Real-time multi-user cursors on Solana, powered by [MagicBlock](https://magicblock.gg) ephemeral rollups.

Every cursor position is an on-chain account, mutated by transactions sent to a MagicBlock ER. Movement feels instant because the ER finalizes in milliseconds; state is periodically committed back to Solana devnet. No backend server, no websocket relay — clients subscribe directly to the ER for live updates.

## Architecture

```
   browser A                       browser B
       │                               │
       │  mousemove (50ms throttle)    │
       ▼                               ▼
  moveCursor(x,y) ─────► MagicBlock ER ◄──── onProgramAccountChange
                              │
                              │ commit_and_undelegate
                              ▼
                       Solana devnet
                    (cursor PDA settles)
```

- **Program** (`programs/cursors/`) — Anchor program with `initialize`, `move_cursor`, `delegate`, `move_and_commit`, `undelegate`. Cursor state is a PDA seeded by the owner's pubkey.
- **Frontend** (`app/`) — Vite + React. Generates an ephemeral session keypair stored in `localStorage`, airdrops devnet SOL, initializes + delegates the cursor PDA, then streams `move_cursor` ixs to the ER on every (throttled) mousemove. Subscribes to `onProgramAccountChange` against the ER for everyone else's cursors.

## Quickstart

### Prerequisites

```bash
# Solana CLI (3.1.9)
sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.9/install)"

# Anchor (1.0.2) via avm
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 1.0.2 && avm use 1.0.2

# Node 20+ and pnpm or yarn
```

### Deploy the program

```bash
solana-keygen new --no-bip39-passphrase           # if you don't already have one
solana config set --url https://api.devnet.solana.com
solana airdrop 2                                   # may need to retry — devnet faucet is flaky

# Generate a real program ID and replace the placeholder in three places:
#   - programs/cursors/src/lib.rs           (declare_id!)
#   - Anchor.toml                            ([programs.devnet] cursors = "...")
#   - app/src/lib/config.ts                  (PROGRAM_ID)
anchor keys list                                   # after first build

anchor build
anchor deploy --provider.cluster devnet
```

### Run the frontend

```bash
cd app
pnpm install
pnpm dev
```

Open the URL in **two browser tabs** (or two browsers) to see live cursors. Each tab gets its own session keypair, requests its own devnet airdrop, and delegates its own cursor PDA into the ER.

### Run the integration test

```bash
anchor test --skip-local-validator --provider.cluster devnet
```

The test walks the full lifecycle: `initialize` on devnet → `delegate` → 5× `move_cursor` on the ER → `commit_and_undelegate` → assert final state landed on devnet.

## Endpoints

| | HTTP | WS |
|---|---|---|
| Base layer (devnet) | `https://api.devnet.solana.com` | `wss://api.devnet.solana.com` |
| MagicBlock ER | `https://devnet-as.magicblock.app` | `wss://devnet-as.magicblock.app` |

## Caveats

- **`ixDelegate` account layout** in `app/src/lib/instructions.ts` is hand-rolled from reading the `ephemeral-rollups-sdk` macro source. If the deployed program's IDL diverges, regenerate the client from `target/idl/cursors.json` with `anchor` instead of using the hand-rolled builder. The Rust program uses the supported `delegate_pda` API so it's authoritative — the frontend builder is the part to verify.
- **Devnet airdrop is rate-limited.** If the auto-airdrop fails, the status bar links to <https://faucet.solana.com> — fund the session pubkey manually and reload.
- **`getProgramAccounts` on the ER** returns only currently-delegated cursors. Once a user commits-and-undelegates, their cursor disappears from the live view (it's back on the base layer).
- **Wallet-extension–free by design.** A session keypair in `localStorage` keeps friction near zero for a demo, but anyone with browser access can sign with it — fine for devnet, never for mainnet.

## Why this exists

Real-time on-chain interaction is MagicBlock's whole pitch, and the starter-kits gallery doesn't yet have a tweet-worthy multiplayer demo. Live cursors are the canonical "is this thing actually realtime?" smoke test — Figma, Linear, Notion all use them. This is that, but every pixel of motion is a finalized Solana transaction.

## License

MIT.
