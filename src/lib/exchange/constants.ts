export const EXCHANGE_CLUSTER = "devnet" as const;
export const EXCHANGE_RPC = "https://api.devnet.solana.com";
export const EXCHANGE_FEE_BPS = 500;
export const EXCHANGE_NAME = "Silo Exchange";
export const EXCHANGE_MARKETPLACE_ID = "silo-exchange";

export const SILO_EXCLUSIVE_TRAIT = {
  trait_type: "silo_exclusive",
  value: "true",
} as const;

export const TRADE_LOCK_TRAIT = {
  trait_type: "trade_lock",
  value: "silo-games-only",
} as const;

export const MARKETPLACE_TRAIT = {
  trait_type: "marketplace",
  value: EXCHANGE_MARKETPLACE_ID,
} as const;

export const WEAPON_CLASSES = ["pistol", "ar", "smg", "shotgun", "sniper", "rocket"] as const;
export type WeaponClass = (typeof WEAPON_CLASSES)[number];

export const CLASS_LABEL: Record<WeaponClass, string> = {
  pistol: "Pistol",
  ar: "Assault Rifle",
  smg: "SMG",
  shotgun: "Shotgun",
  sniper: "Sniper",
  rocket: "Rocket",
};

export const STAT_LABELS: Record<string, string> = {
  damage: "Damage",
  accuracy: "Accuracy",
  range: "Range",
  handling: "Handling",
  recoil: "Recoil",
};

export const GAME_ORIGIN = "https://game-server-production-4b94.up.railway.app/";
export const SITE_ORIGIN = "https://silo-games.vercel.app";

export function shortPk(id: string) {
  const s = String(id || "");
  if (s.length <= 12) return s || "—";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function explorerAddress(pk: string) {
  return `https://explorer.solana.com/address/${encodeURIComponent(pk)}?cluster=${EXCHANGE_CLUSTER}`;
}

export function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${encodeURIComponent(sig)}?cluster=${EXCHANGE_CLUSTER}`;
}

