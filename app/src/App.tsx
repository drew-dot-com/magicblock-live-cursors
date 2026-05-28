import { useEffect, useMemo, useRef, useState } from "react";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { loadOrCreateSession } from "./lib/session";
import { cursorPdaFor, randomColor } from "./lib/cursor";
import {
  DEVNET_RPC,
  DEVNET_WS,
  ER_RPC,
  ER_WS,
} from "./lib/config";
import {
  ixInitialize,
  ixDelegate,
  ixMoveCursor,
  ixUndelegate,
  sendIx,
} from "./lib/instructions";
import { useCursors } from "./hooks/useCursors";
import { CursorLayer } from "./components/CursorLayer";
import { StatusBar, Phase } from "./components/StatusBar";

const MOVE_THROTTLE_MS = 50; // ~20 tx/s ceiling
const FUNDING_MIN_SOL = 0.05;

export default function App() {
  const session: Keypair = useMemo(() => loadOrCreateSession(), []);
  const myColor = useMemo(() => randomColor(), []);
  const [phase, setPhase] = useState<Phase>("init");
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [txPerSec, setTxPerSec] = useState(0);

  const devnet = useMemo(
    () => new Connection(DEVNET_RPC, { wsEndpoint: DEVNET_WS, commitment: "confirmed" }),
    [],
  );
  const er = useMemo(
    () => new Connection(ER_RPC, { wsEndpoint: ER_WS, commitment: "confirmed" }),
    [],
  );

  const [selfPda] = useMemo(() => cursorPdaFor(session.publicKey), [session]);
  const cursors = useCursors(er, selfPda);

  const lastSentRef = useRef(0);
  const tickRef = useRef<{ count: number; windowStart: number }>({
    count: 0,
    windowStart: Date.now(),
  });

  // ---- bootstrap: balance → initialize → delegate ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const bal = await devnet.getBalance(session.publicKey);
        if (cancelled) return;
        setBalance(bal / LAMPORTS_PER_SOL);

        if (bal < FUNDING_MIN_SOL * LAMPORTS_PER_SOL) {
          // try airdrop; if it fails (rate limit), guide to faucet
          try {
            setPhase("needs-funding");
            const sig = await devnet.requestAirdrop(
              session.publicKey,
              1 * LAMPORTS_PER_SOL,
            );
            await devnet.confirmTransaction(sig, "confirmed");
            const after = await devnet.getBalance(session.publicKey);
            setBalance(after / LAMPORTS_PER_SOL);
            if (after < FUNDING_MIN_SOL * LAMPORTS_PER_SOL) return;
          } catch {
            return;
          }
        }

        // Check if already delegated by querying the ER for the cursor account.
        const erAcct = await er.getAccountInfo(selfPda, "confirmed");
        if (erAcct) {
          setPhase("live");
          return;
        }

        setPhase("initializing");
        const acct = await devnet.getAccountInfo(selfPda, "confirmed");
        if (!acct) {
          await sendIx(devnet, session, ixInitialize(session.publicKey, myColor), {
            skipPreflight: false,
          });
        }

        if (cancelled) return;
        setPhase("delegating");
        await sendIx(devnet, session, ixDelegate(session.publicKey), {
          skipPreflight: false,
        });
        await new Promise((r) => setTimeout(r, 3000));

        if (cancelled) return;
        setPhase("live");
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? String(e));
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [devnet, er, session, selfPda, myColor]);

  // ---- mousemove → throttled moveCursor on ER ----
  useEffect(() => {
    if (phase !== "live") return;

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSentRef.current < MOVE_THROTTLE_MS) return;
      lastSentRef.current = now;

      const x = Math.round(e.clientX);
      const y = Math.round(e.clientY);

      sendIx(er, session, ixMoveCursor(session.publicKey, x, y))
        .then(() => {
          const t = tickRef.current;
          t.count += 1;
          const elapsed = Date.now() - t.windowStart;
          if (elapsed >= 1000) {
            setTxPerSec((t.count * 1000) / elapsed);
            t.count = 0;
            t.windowStart = Date.now();
          }
        })
        .catch((err) => console.warn("move failed:", err?.message ?? err));
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [phase, er, session]);

  // ---- commit & exit ----
  const onUndelegate = async () => {
    try {
      setPhase("undelegating");
      await sendIx(er, session, ixUndelegate(session.publicKey));
      // give the ER a beat to propagate
      await new Promise((r) => setTimeout(r, 4000));
      setPhase("init");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPhase("error");
    }
  };

  // commit on tab close (best-effort; not guaranteed)
  useEffect(() => {
    const onUnload = () => {
      if (phase !== "live") return;
      navigator.sendBeacon?.(ER_RPC, ""); // no-op; just keeps the connection warm
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [phase]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <StatusBar
        phase={phase}
        pubkey={session.publicKey}
        balanceSol={balance}
        count={cursors.size}
        txPerSec={txPerSec}
        error={error}
        onUndelegate={onUndelegate}
      />
      <CursorLayer cursors={cursors} selfPdaB58={selfPda.toBase58()} />
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          color: "#555",
          fontFamily: "ui-monospace, monospace",
          textAlign: "center",
        }}
      >
        move your cursor · everything you see is on-chain, settled via MagicBlock ER
        <br />
        open this URL in two tabs to see it
      </div>
    </div>
  );
}
