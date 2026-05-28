import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  Connection,
  Transaction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { sha256 } from "@noble/hashes/sha256";
import { PROGRAM_ID } from "./config";
import { cursorPdaFor } from "./cursor";

// Anchor instruction discriminator: first 8 bytes of sha256("global:<name>")
function disc(name: string): Buffer {
  return Buffer.from(sha256(`global:${name}`)).subarray(0, 8) as any;
}

// MagicBlock delegation program addresses (devnet)
const DELEGATION_PROGRAM = new PublicKey(
  "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh",
);
const MAGIC_PROGRAM = new PublicKey(
  "Magic11111111111111111111111111111111111111",
);
const MAGIC_CONTEXT = new PublicKey(
  "MagicContext1111111111111111111111111111111",
);
const DEFAULT_VALIDATOR = new PublicKey(
  "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
);

function bufferFromI32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeInt32LE(n, 0);
  return b;
}

function bufferFromU32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

export function ixInitialize(user: PublicKey, color: number): TransactionInstruction {
  const [cursor] = cursorPdaFor(user);
  const data = Buffer.concat([disc("initialize"), bufferFromU32(color)]);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: cursor, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function ixMoveCursor(payer: PublicKey, x: number, y: number): TransactionInstruction {
  const [cursor] = cursorPdaFor(payer);
  const data = Buffer.concat([
    disc("move_cursor"),
    bufferFromI32(x),
    bufferFromI32(y),
  ]);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: cursor, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: false },
    ],
    data,
  });
}

// `delegate` instruction layout matches the SDK macro — exact account list
// must be confirmed against the deployed program's IDL. See README "Caveats".
export function ixDelegate(payer: PublicKey): TransactionInstruction {
  const [cursor] = cursorPdaFor(payer);
  const [bufferPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("buffer"), cursor.toBuffer()],
    PROGRAM_ID,
  );
  const [delegationRecord] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), cursor.toBuffer()],
    DELEGATION_PROGRAM,
  );
  const [delegationMetadata] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation-metadata"), cursor.toBuffer()],
    DELEGATION_PROGRAM,
  );
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: bufferPda, isSigner: false, isWritable: true },
      { pubkey: delegationRecord, isSigner: false, isWritable: true },
      { pubkey: delegationMetadata, isSigner: false, isWritable: true },
      { pubkey: cursor, isSigner: false, isWritable: true },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: DELEGATION_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: DEFAULT_VALIDATOR, isSigner: false, isWritable: false },
    ],
    data: disc("delegate"),
  });
}

export function ixUndelegate(payer: PublicKey): TransactionInstruction {
  const [cursor] = cursorPdaFor(payer);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: cursor, isSigner: false, isWritable: true },
      { pubkey: MAGIC_CONTEXT, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: disc("undelegate"),
  });
}

export async function sendIx(
  conn: Connection,
  payer: Keypair,
  ix: TransactionInstruction,
  opts: { skipPreflight?: boolean } = {},
): Promise<string> {
  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  return conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: opts.skipPreflight ?? true,
  });
}
