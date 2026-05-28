import { useEffect, useRef, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { Cursor, decodeCursor } from "../lib/cursor";
import { PROGRAM_ID } from "../lib/config";

// Subscribe to every cursor account owned by the program on the ER, plus
// load the initial set via getProgramAccounts. Updates flow into a map keyed
// by the account pubkey (the cursor PDA).
export function useCursors(erConnection: Connection, selfPda: PublicKey | null) {
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const subIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const accounts = await erConnection.getProgramAccounts(PROGRAM_ID, {
          commitment: "confirmed",
        });
        if (cancelled) return;
        const initial = new Map<string, Cursor>();
        for (const { pubkey, account } of accounts) {
          const c = decodeCursor(account.data);
          if (c) initial.set(pubkey.toBase58(), c);
        }
        setCursors(initial);
      } catch (e) {
        console.warn("getProgramAccounts failed:", e);
      }

      const subId = erConnection.onProgramAccountChange(
        PROGRAM_ID,
        ({ accountId, accountInfo }) => {
          const c = decodeCursor(accountInfo.data);
          if (!c) return;
          setCursors((prev) => {
            const next = new Map(prev);
            next.set(accountId.toBase58(), c);
            return next;
          });
        },
        "confirmed",
      );
      subIdRef.current = subId;
    })();

    return () => {
      cancelled = true;
      if (subIdRef.current !== null) {
        erConnection.removeProgramAccountChangeListener(subIdRef.current).catch(() => {});
        subIdRef.current = null;
      }
    };
  }, [erConnection]);

  return cursors;
}
