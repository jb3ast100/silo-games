import { LISTINGS_KEY, SALES_KEY } from "./constants";

export type ListingStatus = "active" | "sold" | "cancelled";

export type WeaponRatings = {
  damage: number;
  accuracy: number;
  range: number;
  handling: number;
  recoil: number;
};

export type ExchangeListing = {
  id: string;
  mintId: string;
  classId: import("./constants").WeaponClass;
  name: string;
  ratings: WeaponRatings;
  seller: string;
  priceSol: number;
  status: ListingStatus;
  createdAt: number;
  soldAt?: number;
  buyer?: string;
  saleTx?: string;
  attributes: {
    silo_exclusive: true;
    marketplace: "silo-exchange";
    trade_lock: "silo-games-only";
    royalty_fee_bps: 1000;
  };
};

export type ExchangeSale = {
  listingId: string;
  mintId: string;
  seller: string;
  buyer: string;
  priceSol: number;
  treasurySol: number;
  sellerSol: number;
  tx: string;
  at: number;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadListings(): ExchangeListing[] {
  return readJson<ExchangeListing[]>(LISTINGS_KEY, []);
}

export function saveListings(listings: ExchangeListing[]) {
  writeJson(LISTINGS_KEY, listings);
}

export function loadSales(): ExchangeSale[] {
  return readJson<ExchangeSale[]>(SALES_KEY, []);
}

export function saveSales(sales: ExchangeSale[]) {
  writeJson(SALES_KEY, sales);
}

export function uid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultRatings(): WeaponRatings {
  return { damage: 1, accuracy: 1, range: 1, handling: 1, recoil: 1 };
}
