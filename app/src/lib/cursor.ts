import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { PROGRAM_ID, CURSOR_SEED } from "./config";

export type Cursor = {
  owner: PublicKey;
  x: number;
  y: number;
  color: number;
  lastUpdate: number;
};

export function cursorPdaFor(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CURSOR_SEED), owner.toBuffer()],
    PROGRAM_ID,
  );
}

// 8 (discrim) + 32 (owner) + 4 (x) + 4 (y) + 4 (color) + 8 (last_update)
export function decodeCursor(data: Uint8Array): Cursor | null {
  if (data.length < 60) return null;
  const buf = Buffer.from(data);
  const owner = new PublicKey(buf.subarray(8, 40));
  const x = buf.readInt32LE(40);
  const y = buf.readInt32LE(44);
  const color = buf.readUInt32LE(48);
  const lastUpdate = Number(buf.readBigInt64LE(52));
  return { owner, x, y, color, lastUpdate };
}

export function colorToCss(n: number): string {
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}

export function randomColor(): number {
  const palette = [
    0xff0066, 0x00ccff, 0x66ff00, 0xffaa00, 0xaa00ff, 0xff3333, 0x33ffaa,
    0xffd700, 0x00ffd5, 0xff66cc,
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}
