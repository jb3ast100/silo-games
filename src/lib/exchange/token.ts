import { EXCHANGE_RPC } from "./constants";
import { getPhantom, loadWeb3, type SolanaWeb3 } from "./wallet";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ASSOCIATED_TOKEN = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SYSTEM = "11111111111111111111111111111111";

type Web3 = SolanaWeb3 & {
  Keypair: {
    generate: () => ListingKeypair;
    fromSecretKey: (secret: Uint8Array) => ListingKeypair;
  };
  TransactionInstruction: new (opts: {
    programId: unknown;
    keys: Array<{ pubkey: unknown; isSigner: boolean; isWritable: boolean }>;
    data: Uint8Array;
  }) => unknown;
  PublicKey: new (s: string) => {
    toString(): string;
    toBytes(): Uint8Array;
  };
};

export type ListingKeypair = {
  publicKey: { toString(): string; toBytes(): Uint8Array };
  secretKey: Uint8Array;
};

function u64le(n: number) {
  const buf = new Uint8Array(8);
  let x = BigInt(n);
  for (let i = 0; i < 8; i += 1) {
    buf[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return buf;
}

export function encodeSecret(secret: Uint8Array) {
  return Array.from(secret);
}

export function decodeSecret(arr: number[]) {
  return Uint8Array.from(arr);
}

export function restoreListingKeypair(secret: number[], web3: Web3) {
  return web3.Keypair.fromSecretKey(decodeSecret(secret));
}

async function ataAddress(web3: Web3, owner: string, mint: string) {
  const Pubkey = web3.PublicKey as unknown as {
    new (s: string): { toString(): string; toBytes(): Uint8Array };
    findProgramAddress: (
      seeds: Uint8Array[],
      program: unknown,
    ) => Promise<[{ toString(): string }, number]>;
  };
  const [pda] = await Pubkey.findProgramAddress(
    [
      new Pubkey(owner).toBytes(),
      new Pubkey(TOKEN_2022).toBytes(),
      new Pubkey(mint).toBytes(),
    ],
    new Pubkey(ASSOCIATED_TOKEN),
  );
  return pda;
}

function ixCreateAta(web3: Web3, payer: string, ata: unknown, owner: string, mint: string) {
  return new web3.TransactionInstruction({
    programId: new web3.PublicKey(ASSOCIATED_TOKEN),
    keys: [
      { pubkey: new web3.PublicKey(payer), isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: new web3.PublicKey(owner), isSigner: false, isWritable: false },
      { pubkey: new web3.PublicKey(mint), isSigner: false, isWritable: false },
      { pubkey: new web3.PublicKey(SYSTEM), isSigner: false, isWritable: false },
      { pubkey: new web3.PublicKey(TOKEN_2022), isSigner: false, isWritable: false },
    ],
    data: Uint8Array.from([1]),
  });
}

function ixTransfer(web3: Web3, source: string, dest: unknown, owner: unknown, amount = 1) {
  const data = new Uint8Array(1 + 8);
  data[0] = 3;
  data.set(u64le(amount), 1);
  return new web3.TransactionInstruction({
    programId: new web3.PublicKey(TOKEN_2022),
    keys: [
      { pubkey: new web3.PublicKey(source), isSigner: false, isWritable: true },
      { pubkey: dest, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  });
}

async function send(web3: Web3, ixs: unknown[], extraSigners: ListingKeypair[]) {
  const provider = getPhantom();
  if (!provider?.publicKey) throw new Error("Connect Phantom first.");
  const conn = new web3.Connection(EXCHANGE_RPC, "confirmed");
  const tx = new web3.Transaction();
  ixs.forEach((ix) => tx.add(ix));
  tx.feePayer = new web3.PublicKey(provider.publicKey.toString());
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  if (extraSigners.length) {
    const maybe = tx as unknown as { partialSign?: (...s: ListingKeypair[]) => void };
    if (typeof maybe.partialSign === "function") maybe.partialSign(...extraSigners);
  }
  const sent = await provider.signAndSendTransaction(tx);
  const sig = typeof sent === "string" ? sent : sent?.signature;
  if (!sig) throw new Error("Wallet did not return a signature.");
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function escrowNft(opts: { mint: string; sellerAta: string; seller: string }) {
  const { solanaWeb3 } = await loadWeb3();
  const web3 = solanaWeb3 as unknown as Web3;
  const listingKp = web3.Keypair.generate();
  const escrowPk = listingKp.publicKey.toString();
  const escrowAta = await ataAddress(web3, escrowPk, opts.mint);
  const ixs = [
    ixCreateAta(web3, opts.seller, escrowAta, escrowPk, opts.mint),
    ixTransfer(web3, opts.sellerAta, escrowAta, new web3.PublicKey(opts.seller), 1),
  ];
  const signature = await send(web3, ixs, []);
  return {
    signature,
    escrowPk,
    escrowAta: escrowAta.toString(),
    escrowSecret: encodeSecret(listingKp.secretKey),
  };
}

export async function returnNft(opts: {
  mint: string;
  seller: string;
  escrowPk: string;
  escrowAta: string;
  escrowSecret: number[];
}) {
  const { solanaWeb3 } = await loadWeb3();
  const web3 = solanaWeb3 as unknown as Web3;
  const listingKp = restoreListingKeypair(opts.escrowSecret, web3);
  const sellerAta = await ataAddress(web3, opts.seller, opts.mint);
  const ixs = [
    ixCreateAta(web3, opts.seller, sellerAta, opts.seller, opts.mint),
    ixTransfer(web3, opts.escrowAta, sellerAta, listingKp.publicKey, 1),
  ];
  const signature = await send(web3, ixs, [listingKp]);
  return { signature, sellerAta: sellerAta.toString() };
}

export async function deliverNft(opts: {
  mint: string;
  buyer: string;
  escrowAta: string;
  escrowSecret: number[];
}) {
  const { solanaWeb3 } = await loadWeb3();
  const web3 = solanaWeb3 as unknown as Web3;
  const listingKp = restoreListingKeypair(opts.escrowSecret, web3);
  const buyerAta = await ataAddress(web3, opts.buyer, opts.mint);
  const ixs = [
    ixCreateAta(web3, opts.buyer, buyerAta, opts.buyer, opts.mint),
    ixTransfer(web3, opts.escrowAta, buyerAta, listingKp.publicKey, 1),
  ];
  const signature = await send(web3, ixs, [listingKp]);
  return { signature, buyerAta: buyerAta.toString() };
}
