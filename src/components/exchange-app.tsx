"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { StatBars } from "@/components/stat-bars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeaponGlyph } from "@/components/weapon-icon";
import {
  CLASS_LABEL,
  GAME_ORIGIN,
  explorerAddress,
  shortPk,
} from "@/lib/exchange/constants";
import { readInventory, readListings, listWeapon, cancelListing, buyListing, quoteSol, type ChainWeapon, type ChainListing } from "@/lib/exchange/chain";
import { connectPhantom, getPhantom } from "@/lib/exchange/wallet";

function MintLine({ mint }: { mint: string }) {
  const [copied, setCopied] = useState(false);
  async function copyMint() {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="mt-1">
      <p className="break-all font-mono text-[12px] leading-5 text-muted">
        <span className="block select-all">{mint}</span>
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button
          type="button"
          className="font-display text-[11px] uppercase tracking-[0.12em] text-gold hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            void copyMint();
          }}
        >
          {copied ? "Copied" : "Copy mint"}
        </button>
        <a
          className="font-display text-[11px] uppercase tracking-[0.12em] text-gold hover:underline"
          href={explorerAddress(mint)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Explorer
        </a>
      </div>
    </div>
  );
}

export function ExchangeApp() {
  const [wallet,setWallet]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[loadingInv,setLoadingInv]=useState(false);
  const [note,setNote]=useState("Reading the on-chain exchange…");
  const [listings,setListings]=useState<ChainListing[]>([]);
  const [verified,setVerified]=useState(false);
  const [tab,setTab]=useState<"book"|"sell"|"mine">("book");
  const [price,setPrice]=useState("0.1");
  const [inventory,setInventory]=useState<ChainWeapon[]>([]);
  const [selectedMint,setSelectedMint]=useState<string|null>(null);
  const requestId=useRef(0),walletRef=useRef<string|null>(null);

  async function refreshInventory(owner: string | null) {
    const id=++requestId.current;setLoadingInv(true);
    try {
      const [market,owned]=await Promise.all([readListings(),owner?readInventory(owner):Promise.resolve([])]);
      if(id!==requestId.current)return;
      setListings(market);setInventory(owned);setVerified(true);
      setSelectedMint(current=>owned.some(w=>w.mintId===current&&!w.locked)?current:null);
      setNote("Listings, ownership and weapon ratings verified on Solana Devnet.");
    } catch(err) {if(id===requestId.current){setVerified(false);setListings([]);setInventory([]);setNote(err instanceof Error?err.message:String(err));}}
    finally {if(id===requestId.current)setLoadingInv(false);}
  }
  useEffect(()=>{
    const phantom=getPhantom();
    const changed=(key:unknown)=>{const next=key&&typeof key==='object'&&'toString' in key?String(key):null;requestId.current++;walletRef.current=next;setWallet(next);setInventory([]);setSelectedMint(null);void refreshInventory(next);};
    changed(phantom?.publicKey||null);phantom?.on?.('accountChanged',changed);
    const disconnected=()=>changed(null);phantom?.on?.('disconnect',disconnected);
    const visible=()=>{if(!document.hidden)void refreshInventory(walletRef.current);};document.addEventListener('visibilitychange',visible);
    return()=>{requestId.current++;phantom?.off?.('accountChanged',changed);phantom?.off?.('disconnect',disconnected);document.removeEventListener('visibilitychange',visible);};
  },[]);
  const split=useMemo(()=>quoteSol(price),[price]);
  const live=listings.filter(l=>l.status==='active');
  const mine=listings.filter(l=>wallet&&(l.seller===wallet||l.buyer===wallet));
  const sellable=inventory.filter(w=>!w.locked);
  const selected=sellable.find(w=>w.mintId===selectedMint)||null;
  async function onConnect(){setBusy(true);try{const pk=await connectPhantom();walletRef.current=pk;setWallet(pk);await refreshInventory(pk);}catch(err){setNote(err instanceof Error?err.message:String(err));}finally{setBusy(false);}}
  async function transact(action:()=>Promise<{signature:string}>,message:string){
    if(!wallet){setNote('Connect Phantom first.');return false;}if(busy)return false;
    const signingWallet=wallet;
    setBusy(true);setNote(message);
    try {const result=await action();await refreshInventory(walletRef.current);if(walletRef.current!==signingWallet)return false;setNote('Confirmed on Solana: '+result.signature);return true;}
    catch(err){if(walletRef.current===signingWallet)setNote(err instanceof Error?err.message:String(err));return false;}finally{setBusy(false);}
  }
  async function onSell(){if(!wallet||!selected||!split.valid){setNote('Select a weapon and enter a positive SOL price.');return;}if(await transact(()=>listWeapon(wallet,selected.mintId,price),'Approve listing. The weapon enters escrow and your wallet receives a non-transferable receipt.')){setSelectedMint(null);setTab('book');}}
  async function onCancel(id:string){if(!wallet)return;await transact(()=>cancelListing(wallet,id),'Approve cancellation to redeem your receipt and return the weapon.');}
  async function onBuy(row:ChainListing){if(!wallet){setNote('Connect Phantom first.');return;}await transact(()=>buyListing(wallet,row),'Approve one transaction for SOL payment, the 10% treasury fee, and NFT delivery.');}

  return (
    <div className="mx-auto w-[min(1180px,calc(100%-40px))] pb-24 pt-28">
      <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
        Silo Exchange · Devnet
      </p>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(2.4rem,6vw,5.2rem)] font-semibold uppercase leading-[0.95]">
            Trade Silo NFTs.
            <br />
            Nowhere else.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Trade in SOL. Sellers receive 90% of the sale price; 10% goes to the Silo treasury. Payment and weapon delivery happen together in one Solana transaction.
          </p>
        </div>
        <div className="border border-line bg-surface px-5 py-4">
          <p className="font-display text-[11px] uppercase tracking-[0.16em] text-muted">Wallet</p>
          <p className="mt-1 font-display text-xl">{wallet ? shortPk(wallet) : "Not connected"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={onConnect} disabled={busy}>
              {wallet ? "Reconnect" : "Connect wallet"}
            </Button>
            <Button asChild variant="ghost">
              <a href={GAME_ORIGIN} target="_blank" rel="noopener noreferrer">
                Open Strike Force
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-hair pb-4">
        {(
          [
            ["book", `Book (${live.length})`],
            ["sell", "Inventory"],
            ["mine", "My trades"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "border border-gold bg-gold px-4 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] text-gold-fg"
                : "border border-hair px-4 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] hover:border-gold hover:text-gold"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <p role="status" className="mb-8 break-words text-sm text-muted">{note}</p>

      {tab === "book" ? (
        live.length === 0 ? (
          <div className="border border-hair bg-surface px-6 py-16 text-center">
            <p className="font-display text-2xl uppercase">{loadingInv?'Checking the exchange…':verified?'The book is empty.':'Exchange unavailable'}</p>
            <p className="mt-2 text-muted">{verified?'Escrow a weapon from Inventory to open a listing.':'Listings appear here once their on-chain state can be verified.'}</p>
            {!loadingInv&&<Button type="button" variant="ghost" className="mt-4" onClick={()=>void refreshInventory(walletRef.current)}>Refresh exchange</Button>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {live.map((listing) => {
              const cut = quoteSol(listing.priceSol);
              return (
                <article key={listing.id} className="flex flex-col border border-hair bg-surface">
                  <div className="flex items-center justify-between border-b border-hair px-5 py-3">
                    <span className="font-display text-[11px] uppercase tracking-[0.16em] text-gold">
                      {CLASS_LABEL[listing.classId]}
                    </span>
                    <span className="font-display text-[11px] uppercase tracking-[0.16em] text-muted">Escrowed</span>
                  </div>
                  <div className="flex-1 px-5 py-5">
                    <div className="mb-4 text-gold">
                      <WeaponGlyph classId={listing.classId} />
                    </div>
                    <h3 className="font-display text-[28px] font-semibold uppercase leading-none">{listing.name}</h3>
                    <div className="mt-2">
                      <MintLine mint={listing.mintId} />
                    </div>
                    <p className="text-sm text-muted">Seller {shortPk(listing.seller)}</p>
                    <div className="mt-4">
                      <StatBars ratings={listing.ratings} compact />
                    </div>
                    <p className="mt-5 font-display text-3xl">{listing.priceSol} SOL</p>
                    <p className="text-sm text-muted">
                      {cut.seller} SOL to seller · {cut.fee} SOL to treasury
                    </p>
                  </div>
                  <div className="border-t border-hair p-4">
                    {wallet && listing.seller === wallet ? (
                      <Button type="button" variant="ghost" width="full" disabled={busy} onClick={() => onCancel(listing.id)}>
                        Cancel and return NFT
                      </Button>
                    ) : (
                      <Button type="button" width="full" disabled={busy} onClick={() => onBuy(listing)}>
                        Buy with SOL
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "sell" ? (
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="border border-hair bg-surface px-6 py-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold uppercase">Inventory</h2>
                <p className="mt-2 text-sm text-muted">
                  Verified Silo v2 weapons in this wallet. Hover for Strike Force ratings. Click to select.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={!wallet || loadingInv || busy}
                onClick={() => wallet && refreshInventory(wallet)}
              >
                {loadingInv ? "Scanning…" : "Refresh"}
              </Button>
            </div>
            {!wallet ? (
              <p className="text-sm text-muted">Connect Phantom to scan Devnet inventory.</p>
            ) : sellable.length === 0 ? (
              <p className="text-sm text-muted">
                {loadingInv ? "Reading token accounts…" : "No unlisted weapon NFTs on this wallet."}
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-3 overflow-visible sm:grid-cols-4 md:grid-cols-5">
                {sellable.map((item) => {
                  const active = selectedMint === item.mintId;
                  return (
                    <li key={item.mintId} className="relative">
                      <button
                        type="button"
                        onClick={() => setSelectedMint(item.mintId)}
                        className={
                          "group flex aspect-square w-full flex-col items-center justify-center gap-2 border px-2 text-gold transition-colors " +
                          (active ? "border-gold bg-gold/10" : "border-hair hover:border-gold")
                        }
                      >
                        <WeaponGlyph classId={item.classId} />
                        <span className="font-display text-[10px] uppercase tracking-[0.12em] text-fg">
                          {CLASS_LABEL[item.classId]}
                        </span>
                        <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 hidden w-56 -translate-x-1/2 border border-line bg-bg p-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)] group-hover:block">
                          <p className="mb-2 font-display text-xs uppercase tracking-[0.14em] text-gold">
                            {CLASS_LABEL[item.classId]}
                          </p>
                          <StatBars ratings={item.ratings} compact />
                          <p className="mt-2 break-all font-mono text-[10px] text-muted">{item.mintId}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="border border-line bg-surface px-6 py-8">
            <h2 className="font-display text-2xl font-semibold uppercase">Sell</h2>
            {selected ? (
              <>
                <div className="mt-5 text-gold">
                  <WeaponGlyph classId={selected.classId} />
                </div>
                <p className="mt-3 font-display text-xl uppercase">{CLASS_LABEL[selected.classId]}</p>
                <div className="mt-1">
                  <MintLine mint={selected.mintId} />
                </div>
                <div className="mt-4">
                  <StatBars ratings={selected.ratings} />
                </div>
                <div className="mt-6">
                  <Label htmlFor="price">Price (SOL)</Label>
                  <Input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  <p className="mt-2 text-sm text-muted">
                    Buyer pays {split.price || 0} SOL · you receive {split.seller} SOL · treasury receives {split.fee} SOL (10%)
                  </p>
                </div>
                <Button type="button" width="full" className="mt-5" disabled={busy || !split.valid} onClick={onSell}>
                  Sell
                </Button>
                <p className="mt-3 text-sm text-muted">
                  Listing has no marketplace fee. Your on-chain receipt allows only your wallet to cancel an unsold listing. Solana network fees and rent apply.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted">Select a weapon icon, set a price, then sell.</p>
            )}
          </aside>
        </div>
      ) : null}

      {tab === "mine" ? (
        mine.length === 0 ? (
          <p className="text-muted">No listings or fills for this wallet yet.</p>
        ) : (
          <div className="overflow-x-auto border border-hair">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-hair font-display text-[11px] uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Weapon</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Counterparty</th>
                  <th className="px-4 py-3">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((row) => (
                  <tr key={row.id} className="border-b border-hair last:border-0">
                    <td className="px-4 py-3 uppercase text-gold">{row.status}</td>
                    <td className="px-4 py-3">
                      {row.name}
                      <MintLine mint={row.mintId} />
                    </td>
                    <td className="px-4 py-3">{row.priceSol} SOL</td>
                    <td className="px-4 py-3">{shortPk(row.buyer || row.seller)}</td>
                    <td className="px-4 py-3">
                      <a className="text-gold hover:underline" href={explorerAddress(row.receiptMint)} target="_blank" rel="noopener noreferrer">Receipt {shortPk(row.receiptMint)}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
