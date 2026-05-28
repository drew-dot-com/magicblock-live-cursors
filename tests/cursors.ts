import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Cursors } from "../target/types/cursors";
import { assert } from "chai";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("cursors", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Cursors as Program<Cursors>;

  const erConnection = new anchor.web3.Connection(
    "https://devnet-as.magicblock.app/",
    {
      wsEndpoint: "wss://devnet-as.magicblock.app/",
      commitment: "confirmed",
    },
  );

  const wallet = provider.wallet as anchor.Wallet;
  const [cursorPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("cursor"), wallet.publicKey.toBuffer()],
    program.programId,
  );

  it("initialize on devnet", async () => {
    const sig = await program.methods
      .initialize(0xff0066)
      .accounts({ user: wallet.publicKey })
      .rpc();
    console.log("init:", sig);
    const c = await program.account.cursor.fetch(cursorPda);
    assert.equal(c.x, 0);
    assert.equal(c.y, 0);
  });

  it("delegate to ER", async () => {
    const sig = await program.methods
      .delegate()
      .accounts({ payer: wallet.publicKey, pda: cursorPda })
      .rpc();
    console.log("delegate:", sig);
    await SLEEP(3000);
  });

  it("move on ER (fast, no commit)", async () => {
    for (let i = 0; i < 5; i++) {
      let tx = await program.methods
        .moveCursor(i * 10, i * 7)
        .accounts({ payer: wallet.publicKey })
        .transaction();
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
      tx = await wallet.signTransaction(tx);
      const sig = await erConnection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
      });
      await erConnection.confirmTransaction(sig, "confirmed");
      console.log("move", i, sig);
    }
  });

  it("commit_and_undelegate back to devnet", async () => {
    let tx = await program.methods
      .undelegate()
      .accounts({ payer: wallet.publicKey })
      .transaction();
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
    tx = await wallet.signTransaction(tx);
    const sig = await erConnection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
    });
    await erConnection.confirmTransaction(sig, "confirmed");
    console.log("undelegate:", sig);
    await SLEEP(5000);
    const c = await program.account.cursor.fetch(cursorPda);
    assert.equal(c.x, 40);
    assert.equal(c.y, 28);
  });
});
