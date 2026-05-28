import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const KEY = "magicblock-cursors-session-keypair";

export function loadOrCreateSession(): Keypair {
  const existing = localStorage.getItem(KEY);
  if (existing) {
    try {
      return Keypair.fromSecretKey(bs58.decode(existing));
    } catch {
      // fall through to regenerate
    }
  }
  const kp = Keypair.generate();
  localStorage.setItem(KEY, bs58.encode(kp.secretKey));
  return kp;
}

export function resetSession() {
  localStorage.removeItem(KEY);
}
