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
  explorerAddress,
  explorerTx,
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
