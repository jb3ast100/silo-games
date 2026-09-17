"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLASS_LABEL,
  EXCHANGE_CLUSTER,
  EXCHANGE_FEE_BPS,
  GAME_ORIGIN,
  TREASURY_SOL,
  WEAPON_CLASSES,
  feeSplit,
  shortPk,
  type WeaponClass,
} from "@/lib/exchange/constants";
import {
  defaultRatings,
  loadListings,
  loadSales,
  saveListings,
  saveSales,
  uid,
  type ExchangeListing,
  type WeaponRatings,
} from "@/lib/exchange/store";
import { connectPhantom, getPhantom } from "@/lib/exchange/wallet";
import { payListing } from "@/lib/exchange/pay";

const STATS: Array<keyof WeaponRatings> = ["damage", "accuracy", "range", "handling", "recoil"];

function loadInventoryFor(wallet: string) {
  try {
    const raw = localStorage.getItem("sf_weapon_nfts_v1_" + wallet);
    if (!raw) return [] as Array<{ mintId: string; classId: WeaponClass; ratings: WeaponRatings }>;
    const data = JSON.parse(raw) as {
      weapons?: Array<{ mintId: string; classId: WeaponClass; ratings: WeaponRatings; owner?: string }>;
    };
    return (data.weapons || []).filter((w) => w && (!w.owner || w.owner === wallet));
  } catch {
    return [];
  }
}

export function ExchangeApp() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(
    "Silo-exclusive weapons only. Open-market transfers are rejected by the game.",
  );
  const [listings, setListings] = useState<ExchangeListing[]>([]);
  const [tab, setTab] = useState<"book" | "sell" | "mine">("book");
  const [price, setPrice] = useState("0.25");
  const [mintId, setMintId] = useState("");
  const [classId, setClassId] = useState<WeaponClass>("ar");
  const [ratings, setRatings] = useState<WeaponRatings>(defaultRatings());
  const [inventory, setInventory] = useState<
    Array<{ mintId: string; classId: WeaponClass; ratings: WeaponRatings }>
  >([]);

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

  useEffect(() => {
    if (!wallet) {
      setInventory([]);
      return;
    }
    setInventory(loadInventoryFor(wallet));
  }, [wallet]);

  const split = useMemo(() => feeSplit(Number(price) || 0), [price]);
  const live = listings.filter((l) => l.status === "active");
  const mine = listings.filter((l) => wallet && (l.seller === wallet || l.buyer === wallet));

  async function onConnect() {
    setBusy(true);
    try {
      const pk = await connectPhantom();
      setWallet(pk);
      setNote("Wallet connected on Devnet. List a Silo NFT or buy from the book.");
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

  function fillFromInventory(item: { mintId: string; classId: WeaponClass; ratings: WeaponRatings }) {
    setMintId(item.mintId);
    setClassId(item.classId);
    setRatings({ ...defaultRatings(), ...item.ratings });
    setTab("sell");
  }

  function onList() {
    if (!wallet) {
      setNote("Connect a wallet before listing.");
      return;
    }
    const id = mintId.trim();
    if (!id) {
      setNote("Enter the weapon mint / NFT id from Strike Force.");
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      setNote("Set a price in SOL greater than 0.");
      return;
    }
    if (listings.some((l) => l.status === "active" && l.mintId === id)) {
      setNote("That mint is already listed.");
      return;
    }
    const listing: ExchangeListing = {
      id: uid("list_"),
      mintId: id,
      classId,
      name: `SF ${CLASS_LABEL[classId]}`,
      ratings: { ...ratings },
      seller: wallet,
      priceSol: Number(price),
      status: "active",
      createdAt: Date.now(),
      attributes: {
        silo_exclusive: true,
        marketplace: "silo-exchange",
        trade_lock: "silo-games-only",
        royalty_fee_bps: 1000,
      },
    };
    persist([listing, ...listings]);
    setNote(`Listed ${listing.name} at ${listing.priceSol} SOL. 10% routes to the Silo treasury on sale.`);
    setTab("book");
  }

  function onCancel(id: string) {
    persist(
      listings.map((l) =>
        l.id === id && l.seller === wallet && l.status === "active" ? { ...l, status: "cancelled" } : l,
      ),
    );
    setNote("Listing pulled from the book.");
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
      const paid = await payListing({ seller: listing.seller, priceSol: listing.priceSol });
      const next = listings.map((l) =>
        l.id === listing.id
          ? { ...l, status: "sold" as const, buyer: paid.buyer, soldAt: Date.now(), saleTx: paid.signature }
          : l,
      );
      persist(next);
      const sales = loadSales();
      sales.unshift({
        listingId: listing.id,
        mintId: listing.mintId,
        seller: listing.seller,
        buyer: paid.buyer,
        priceSol: paid.split.price,
        treasurySol: paid.split.treasury,
        sellerSol: paid.split.seller,
        tx: paid.signature,
        at: Date.now(),
      });
      saveSales(sales);
      setNote(
        `Filled. ${paid.split.seller} SOL to seller, ${paid.split.treasury} SOL treasury fee. Tx ${shortPk(paid.signature)}. Open Strike Force with this wallet to load the NFT.`,
      );
      setTab("mine");
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
            Every Strike Force weapon carries a <em className="text-fg not-italic">silo_exclusive</em> lock.
            Listings settle in SOL. The house takes {EXCHANGE_FEE_BPS / 100}% to treasury{" "}
            ({shortPk(TREASURY_SOL)}).
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
            ["sell", "List a weapon"],
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
            <p className="mt-2 text-muted">Connect a wallet and list a Silo-exclusive weapon to open the market.</p>
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
                    <span className="font-display text-[11px] uppercase tracking-[0.16em] text-muted">Exclusive</span>
                  </div>
                  <div className="flex-1 px-5 py-5">
                    <h3 className="font-display text-[28px] font-semibold uppercase leading-none">{listing.name}</h3>
                    <p className="mt-2 text-sm text-muted">Mint {shortPk(listing.mintId)}</p>
                    <p className="text-sm text-muted">Seller {shortPk(listing.seller)}</p>
                    <dl className="mt-4 grid grid-cols-5 gap-2 text-center">
                      {STATS.map((stat) => (
                        <div key={stat} className="border border-hair px-1 py-2">
                          <dt className="font-display text-[10px] uppercase tracking-[0.12em] text-muted">
                            {stat.slice(0, 3)}
                          </dt>
                          <dd className="font-display text-lg">{listing.ratings[stat]}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-5 font-display text-3xl">{listing.priceSol} SOL</p>
                    <p className="text-sm text-muted">
                      {cut.seller} to seller · {cut.treasury} treasury
                    </p>
                  </div>
                  <div className="border-t border-hair p-4">
                    {wallet && listing.seller === wallet ? (
                      <Button type="button" variant="ghost" width="full" onClick={() => onCancel(listing.id)}>
                        Cancel listing
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
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            className="grid gap-4 border border-line bg-surface px-6 py-8"
            onSubmit={(event) => {
              event.preventDefault();
              onList();
            }}
          >
            <div>
              <Label htmlFor="mint">Weapon mint / NFT id</Label>
              <Input
                id="mint"
                value={mintId}
                onChange={(event) => setMintId(event.target.value)}
                placeholder="nft_… or on-chain mint"
                required
              />
            </div>
            <div>
              <Label htmlFor="class">Class</Label>
              <select
                id="class"
                value={classId}
                onChange={(event) => setClassId(event.target.value as WeaponClass)}
                className="h-12 w-full border border-hair bg-bg px-3.5 text-fg focus-visible:border-gold focus-visible:outline-none"
              >
                {WEAPON_CLASSES.map((id) => (
                  <option key={id} value={id}>
                    {CLASS_LABEL[id]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {STATS.map((stat) => (
                <div key={stat}>
                  <Label htmlFor={stat}>{stat.slice(0, 3)}</Label>
                  <Input
                    id={stat}
                    type="number"
                    min={1}
                    max={10}
                    value={ratings[stat]}
                    onChange={(event) =>
                      setRatings((prev) => ({
                        ...prev,
                        [stat]: Math.max(1, Math.min(10, Number(event.target.value) || 1)),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="price">Price (SOL)</Label>
              <Input
                id="price"
                type="number"
                min={0.001}
                step="0.001"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
              <p className="mt-2 text-sm text-muted">
                Buyer pays {split.price || 0} SOL · you receive {split.seller} SOL · treasury {split.treasury} SOL
                ({EXCHANGE_FEE_BPS / 100}%).
              </p>
            </div>
            <Button type="submit" width="full" disabled={busy || !wallet}>
              List on Silo Exchange
            </Button>
            <p className="text-sm text-muted">
              Listing asserts the {EXCHANGE_CLUSTER} mint is Silo-exclusive. Magic Eden / Tensor transfers will not
              update Strike Force ownership.
            </p>
          </form>
          <aside className="border border-hair bg-surface px-6 py-8">
            <h2 className="font-display text-2xl font-semibold uppercase">Inventory</h2>
            <p className="mt-2 text-sm text-muted">
              Weapons minted in this browser on the Silo site appear here. Otherwise paste the mint id from Strike
              Force — the exclusive trait travels with the NFT either way.
            </p>
            <ul className="mt-6 grid gap-3">
              {inventory.length === 0 ? (
                <li className="text-sm text-muted">No local Strike Force inventory for this wallet on this origin.</li>
              ) : (
                inventory.map((item) => (
                  <li key={item.mintId}>
                    <button
                      type="button"
                      className="w-full border border-hair px-4 py-3 text-left hover:border-gold"
                      onClick={() => fillFromInventory(item)}
                    >
                      <span className="block font-display uppercase">{CLASS_LABEL[item.classId]}</span>
                      <span className="text-sm text-muted">{shortPk(item.mintId)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
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
                    <td className="px-4 py-3">{row.saleTx ? shortPk(row.saleTx) : "—"}</td>
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
