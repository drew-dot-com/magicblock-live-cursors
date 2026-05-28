import { PublicKey } from "@solana/web3.js";

export type Phase =
  | "init"
  | "needs-funding"
  | "initializing"
  | "delegating"
  | "live"
  | "undelegating"
  | "error";

export function StatusBar({
  phase,
  pubkey,
  balanceSol,
  count,
  txPerSec,
  error,
  onUndelegate,
}: {
  phase: Phase;
  pubkey: PublicKey;
  balanceSol: number | null;
  count: number;
  txPerSec: number;
  error: string | null;
  onUndelegate: () => void;
}) {
  const label = {
    init: "init",
    "needs-funding": "needs devnet SOL",
    initializing: "initializing on devnet",
    delegating: "delegating to ER",
    live: "LIVE on ER",
    undelegating: "committing to devnet",
    error: "error",
  }[phase];

  const dot =
    phase === "live"
      ? "#66ff00"
      : phase === "error"
        ? "#ff3333"
        : phase === "needs-funding"
          ? "#ffaa00"
          : "#00ccff";

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 12,
        right: 12,
        display: "flex",
        gap: 16,
        alignItems: "center",
        background: "rgba(20, 20, 20, 0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        padding: "8px 14px",
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        color: "#e5e5e5",
        zIndex: 100,
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dot,
          boxShadow: `0 0 8px ${dot}`,
        }}
      />
      <span style={{ color: dot, fontWeight: 600 }}>{label.toUpperCase()}</span>
      <span style={{ color: "#888" }}>|</span>
      <span title={pubkey.toBase58()}>
        {pubkey.toBase58().slice(0, 4)}…{pubkey.toBase58().slice(-4)}
      </span>
      {balanceSol !== null && (
        <span style={{ color: "#888" }}>{balanceSol.toFixed(3)} SOL</span>
      )}
      <span style={{ color: "#888" }}>|</span>
      <span>{count} cursor{count === 1 ? "" : "s"}</span>
      <span style={{ color: "#888" }}>{txPerSec.toFixed(1)} tx/s</span>
      <span style={{ flex: 1 }} />
      {phase === "live" && (
        <button
          onClick={onUndelegate}
          style={{
            background: "#1a1a1a",
            color: "#e5e5e5",
            border: "1px solid #444",
            borderRadius: 4,
            padding: "4px 10px",
            fontFamily: "inherit",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          commit & exit
        </button>
      )}
      {phase === "needs-funding" && (
        <a
          href="https://faucet.solana.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#00ccff" }}
        >
          fund devnet →
        </a>
      )}
      {error && <span style={{ color: "#ff3333" }}>{error}</span>}
    </div>
  );
}
