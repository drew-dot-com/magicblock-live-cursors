import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "EbgjnmbNznJPqZkFwFkZ8AUcPpDoBkSEKEv2LM5NfLD7",
);

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const DEVNET_WS = "wss://api.devnet.solana.com";

export const ER_RPC = "https://devnet-as.magicblock.app";
export const ER_WS = "wss://devnet-as.magicblock.app";

export const CURSOR_SEED = "cursor";
export const CURSOR_ACCOUNT_SIZE = 8 + 32 + 4 + 4 + 4 + 8;
