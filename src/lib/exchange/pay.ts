import { EXCHANGE_RPC, TREASURY_SOL, feeSplit, solToLamports } from "./constants";
import { getPhantom, loadWeb3 } from "./wallet";

export async function payListing(opts: { seller: string; priceSol: number }) {
  const split = feeSplit(opts.priceSol);
  const provider = getPhantom();
  if (!provider?.publicKey) throw new Error("Connect Phantom first.");
  const buyer = provider.publicKey.toString();
  if (buyer === opts.seller) throw new Error("You already own this listing.");

  const web3Mod = await loadWeb3();
  const web3 = web3Mod.solanaWeb3;
  const conn = new web3.Connection(EXCHANGE_RPC, "confirmed");
  const from = new web3.PublicKey(buyer);
  const sellerPk = new web3.PublicKey(opts.seller);
  const treasuryPk = new web3.PublicKey(TREASURY_SOL);

  const sellerLamports = Number(solToLamports(split.seller));
  const treasuryLamports = Number(solToLamports(split.treasury));
  if (sellerLamports <= 0 || treasuryLamports <= 0) {
    throw new Error("Price is too small after the 10% treasury fee.");
  }

  const tx = new web3.Transaction();
  tx.add(
    web3.SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: sellerPk,
      lamports: sellerLamports,
    }),
  );
  tx.add(
    web3.SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: treasuryPk,
      lamports: treasuryLamports,
    }),
  );
  tx.feePayer = from;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;

  const sent = await provider.signAndSendTransaction(tx);
  const sig = typeof sent === "string" ? sent : sent?.signature;
  if (!sig) throw new Error("Wallet did not return a signature.");
  await conn.confirmTransaction(sig, "confirmed");
  return { signature: sig, buyer, split };
}
