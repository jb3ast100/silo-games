"use client";

import { useEffect, useMemo, useState } from "react";
import { StatBars } from "@/components/stat-bars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeaponGlyph } from "@/components/weapon-icon";
import {
  CLASS_LABEL,
  EXCHANGE_FEE_BPS,
  GAME_ORIGIN,
  TREASURY_SOL,
  feeSplit,
  shortPk,
} from "@/lib/exchange/constants";
import { listWalletWeapons, type WalletWeapon } from "@/lib/exchange/inventory";
import { payListing } from "@/lib/exchange/pay";
import {
  loadListings,
  loadSales,
  saveListings,
  saveSales,
  uid,
  type ExchangeListing,
} from "@/lib/exchange/store";
import { deliverNft, escrowNft, returnNft } from "@/lib/exchange/token";
import { connectPhantom, getPhantom } from "@/lib/exchange/wallet";

export function ExchangeApp() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);
  const [note, setNote] = useState("Connect Phantom on Devnet to load on-chain Silo weapons.");
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [tab, setTab] = useState<"book" | "sell" | "mine">("sell");
  const [price, setPrice] = useState("0.25");
  const [inventory, setInventory] = useState<WalletWeapon[]>([]);
  const [selectedMint, setSelectedMint] = useState<string | null>(null);

  useEffect(() => {
    setListings(loadListings());
    const phantom = getPhantom();
    if (phantom?.publicKey) setWallet(phantom.publicKey.toString());
    phantom?.on?.("accountChanged", (key) => {
      const next =
        key && typeof (key as { toString?: () => string }).toString === "function"
          ? (key as { toString: () => string }).toString()
          : null;
      setWallet(next);
    });
  }, []);

  async function refreshInventory(owner: string) {
    setLoadingInv(true);
    try {
      const weapons = await listWalletWeapons(owner);
      setInventory(weapons);
      if (weapons.length === 0) {
        setNote("No Token-2022 weapon NFTs found on this Devnet wallet.");
      } else {
        setNote(
          `Loaded ${weapons.length} on-chain weapon${weapons.length === 1 ? "" : "s"}. Click one, set a price, sell.`,
        );
      }
    } catch (err) {
      setInventory([]);
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingInv(false);
    }
  }

  useEffect(() => {
    if (!wallet) {
      setInventory([]);
      setSelectedMint(null);
      return;
    }
    void refreshInventory(wallet);
  }, [wallet]);

  const split = useMemo(() => feeSplit(Number(price) || 0), [price]);
  const live = listings.filter((l) => l.status === "active");
  const mine = listings.filter((l) => wallet && (l.seller === wallet || l.buyer === wallet));
  const listedMints = new Set(live.map((l) => l.mintId));
  const sellable = inventory.filter((w) => !listedMints.has(w.mintId));
  const selected = sellable.find((w) => w.mintId === selectedMint) || null;

  async function onConnect() {
    setBusy(true);
    try {
      const pk = await connectPhantom();
      setWallet(pk);
      setTab("sell");
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function persist(next: ExchangeListing[]) {
    setListings(next);
    saveListings(next);
  }

  async function onSell() {
    if (!wallet) {
      setNote("Connect a wallet first.");
      return;
    }
    if (!selected) {
      setNote("Select a weapon icon from inventory.");
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      setNote("Set a price in SOL greater than 0.");
      return;
    }
    setBusy(true);
    try {
      setNote("Approve the listing transfer in Phantom. The NFT moves to exchange escrow.");
      const escrowed = await escrowNft({
        mint: selected.mintId,
        sellerAta: selected.ata,
        seller: wallet,
      });
      const listing: ExchangeListing = {
        id: uid("list_"),
        mintId: selected.mintId,
        classId: selected.classId,
        name: `SF ${CLASS_LABEL[selected.classId]}`,
        ratings: { ...selected.ratings },
        seller: wallet,
        priceSol: Number(price),
        status: "active",
        createdAt: Date.now(),
        escrowPk: escrowed.escrowPk,
        escrowAta: escrowed.escrowAta,
        sellerAta: selected.ata,
        escrowSecret: escrowed.escrowSecret,
        listTx: escrowed.signature,
        attributes: {
          silo_exclusive: true,
          marketplace: "silo-exchange",
          trade_lock: "silo-games-only",
          royalty_fee_bps: 1000,
        },
      };
      persist([listing, ...listings]);
      setSelectedMint(null);
      setTab("book");
      setNote(`Listed ${listing.name} at ${listing.priceSol} SOL. NFT is in escrow until it sells or you cancel.`);
      await refreshInventory(wallet);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(id: string) {
    const listing = listings.find((l) => l.id === id);
    if (!listing || !wallet || listing.seller !== wallet || listing.status !== "active") return;
    setBusy(true);
    try {
      if (listing.escrowAta && listing.escrowPk && listing.escrowSecret) {
        setNote("Approve the return transfer in Phantom.");
        const returned = await returnNft({
          mint: listing.mintId,
          seller: wallet,
          escrowPk: listing.escrowPk,
          escrowAta: listing.escrowAta,
          escrowSecret: listing.escrowSecret,
        });
        persist(
          listings.map((l) =>
            l.id === id ? { ...l, status: "cancelled", cancelTx: returned.signature, escrowSecret: undefined } : l,
          ),
        );
        setNote("Listing cancelled. NFT returned to your wallet.");
      } else {
        persist(listings.map((l) => (l.id === id ? { ...l, status: "cancelled" } : l)));
        setNote("Listing pulled from the book.");
      }
      await refreshInventory(wallet);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onBuy(listing: ExchangeListing) {
    if (!wallet) {
      setNote("Connect Phantom to buy.");
      return;
    }
    if (listing.seller === wallet) {
      setNote("You cannot buy your own listing.");
      return;
    }
    setBusy(true);
    try {
      setNote("Approve the SOL payment in Phantom.");
      const paid = await payListing({ seller: listing.seller, priceSol: listing.priceSol });
      let deliverTx = paid.signature;
      if (listing.escrowAta && listing.escrowSecret) {
        setNote("Approve the NFT delivery transfer.");
        const delivered = await deliverNft({
          mint: listing.mintId,
          buyer: paid.buyer,
          escrowAta: listing.escrowAta,
          escrowSecret: listing.escrowSecret,
        });
        deliverTx = delivered.signature;
      }
      persist(
        listings.map((l) =>
          l.id === listing.id
            ? {
                ...l,
                status: "sold",
                buyer: paid.buyer,
                soldAt: Date.now(),
                saleTx: deliverTx,
                escrowSecret: undefined,
              }
            : l,
        ),
      );
      const sales = loadSales();
      sales.unshift({
        listingId: listing.id,
        mintId: listing.mintId,
        seller: listing.seller,
        buyer: paid.buyer,
        priceSol: paid.split.price,
        treasurySol: paid.split.treasury,
        sellerSol: paid.split.seller,
        tx: deliverTx,
        at: Date.now(),
      });
      saveSales(sales);
      setNote(
        `Filled. ${paid.split.seller} SOL to seller, ${paid.split.treasury} SOL treasury. NFT delivered to your wallet.`,
      );
      setTab("mine");
      await refreshInventory(wallet);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

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
            Listing escrows the weapon on-chain. Cancel returns it. A sale sends 90% SOL to you and{" "}
            {EXCHANGE_FEE_BPS / 100}% to treasury ({shortPk(TREASURY_SOL)}).
          </p>
        </div>
        <div className="border border-line bg-surface px-5 py-4">
          <p className="font-display text-[11px] uppercase tracking-[0.16em] text-muted">Wallet</p>
          <p className="mt-1 font-display text-xl">{wallet ? shortPk(wallet) : "Not connected"}</p>
          <div className="mt-3 flex gap-2">
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

      <p className="mb-8 text-sm text-muted">{note}</p>

      {tab === "book" ? (
        live.length === 0 ? (
          <div className="border border-hair bg-surface px-6 py-16 text-center">
            <p className="font-display text-2xl uppercase">The book is empty.</p>
            <p className="mt-2 text-muted">Escrow a weapon from Inventory to open a listing.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {live.map((listing) => {
              const cut = feeSplit(listing.priceSol);
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
                    <p className="mt-2 text-sm text-muted">Mint {shortPk(listing.mintId)}</p>
                    <p className="text-sm text-muted">Seller {shortPk(listing.seller)}</p>
                    <div className="mt-4">
                      <StatBars ratings={listing.ratings} compact />
                    </div>
                    <p className="mt-5 font-display text-3xl">{listing.priceSol} SOL</p>
                    <p className="text-sm text-muted">
                      {cut.seller} to seller · {cut.treasury} treasury
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
          <section className="overflow-visible border border-hair bg-surface px-6 py-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold uppercase">Inventory</h2>
                <p className="mt-2 text-sm text-muted">
                  On-chain Token-2022 weapons in this wallet. Hover for Strike Force ratings. Click to select.
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
                          <p className="mt-2 text-[11px] text-muted">{shortPk(item.mintId)}</p>
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
                <p className="text-sm text-muted">{shortPk(selected.mintId)}</p>
                <div className="mt-4">
                  <StatBars ratings={selected.ratings} />
                </div>
                <div className="mt-6">
                  <Label htmlFor="price">Price (SOL)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0.001}
                    step="0.001"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  <p className="mt-2 text-sm text-muted">
                    Buyer pays {split.price || 0} · you get {split.seller} · treasury {split.treasury}
                  </p>
                </div>
                <Button type="button" width="full" className="mt-5" disabled={busy} onClick={onSell}>
                  Sell
                </Button>
                <p className="mt-3 text-sm text-muted">
                  Phantom will transfer this NFT into exchange escrow. Cancel anytime before it sells to get it back.
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
                  <th className="px-4 py-3">Tx</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((row) => (
                  <tr key={row.id} className="border-b border-hair last:border-0">
                    <td className="px-4 py-3 uppercase text-gold">{row.status}</td>
                    <td className="px-4 py-3">
                      {row.name}
                      <span className="block text-muted">{shortPk(row.mintId)}</span>
                    </td>
                    <td className="px-4 py-3">{row.priceSol} SOL</td>
                    <td className="px-4 py-3">{shortPk(row.buyer || row.seller)}</td>
                    <td className="px-4 py-3">{shortPk(row.saleTx || row.cancelTx || row.listTx || "—")}</td>
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
