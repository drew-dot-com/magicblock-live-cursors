import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "EbgjnmbNznJPqZkFwFkZ8AUcPpDoBkSEKEv2LM5NfLD7",
);

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const DEVNET_WS = "wss://api.devnet.solana.com";

export const ER_RPC = "https://devnet-as.magicblock.app";
export const ER_WS = "wss://devnet-as.magicblock.app";

export const CURSOR_SEED = "cursor";

// MagicBlock delegation program — owns delegated PDAs on the base layer while
// the ER has authority. Checking this owner on devnet is the canonical way to
// tell if a cursor is currently delegated.
export const DELEGATION_PROGRAM_ID =
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
export const CURSOR_ACCOUNT_SIZE = 8 + 32 + 4 + 4 + 4 + 8;
