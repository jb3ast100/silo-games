import { EXCHANGE_RPC, WEAPON_CLASSES, type WeaponClass } from "./constants";
import type { WeaponRatings } from "./store";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SILO_MINT = "HwahAvFwGfB3Z5pGY1N3i1iWDffJ8N6NmLWMufpnaDMp";

const CLASS_NEEDLES: Array<[string, WeaponClass]> = [
  ["SF WPN Shotgun", "shotgun"],
  ["SF WPN Sniper", "sniper"],
  ["SF WPN Rocket", "rocket"],
  ["SF WPN Pistol", "pistol"],
  ["SF WPN SMG", "smg"],
  ["SF WPN AR", "ar"],
  ["SF Shotgun", "shotgun"],
  ["SF Sniper", "sniper"],
  ["SF Rocket", "rocket"],
  ["SF Pistol", "pistol"],
  ["SF SMG", "smg"],
  ["SF AR", "ar"],
  ["classShotgun", "shotgun"],
  ["classSniper", "sniper"],
  ["classRocket", "rocket"],
  ["classPistol", "pistol"],
  ["classSMG", "smg"],
  ["classAR", "ar"],
];

export type WalletWeapon = {
  mintId: string;
  ata: string;
  classId: WeaponClass;
  ratings: WeaponRatings;
  owner: string;
};

function defaultRatings(): WeaponRatings {
  return { damage: 1, accuracy: 1, range: 1, handling: 1, recoil: 1 };
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(EXCHANGE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "rpc_error");
  return json.result;
}

function decodeB64(b64: string) {
  try {
    return atob(b64);
  } catch {
    return "";
  }
}

function printable(text: string) {
  return String(text || "").replace(/[^\x20-\x7E]+/g, " ");
}

function classFromText(text: string): WeaponClass | null {
  const blob = printable(text);
  for (const [needle, id] of CLASS_NEEDLES) {
    if (blob.includes(needle)) return id;
  }
  const words: Array<[RegExp, WeaponClass]> = [
    [/\bShotgun\b/i, "shotgun"],
    [/\bSniper\b/i, "sniper"],
    [/\bRocket\b/i, "rocket"],
    [/\bPistol\b/i, "pistol"],
    [/\bSMG\b/i, "smg"],
    [/\bAssault Rifle\b/i, "ar"],
  ];
  for (const [re, id] of words) {
    if (re.test(blob)) return id;
  }
  return null;
}

function ratingsFromText(text: string): WeaponRatings {
  const out = defaultRatings();
  const blob = printable(text);
  (Object.keys(out) as Array<keyof WeaponRatings>).forEach((key) => {
    const re = new RegExp("(?:^|\\W)" + key + "[^0-9]{0,16}(10|[1-9])", "i");
    const match = blob.match(re);
    if (match) out[key] = Number(match[1]);
  });
  return out;
}

function localOverlay(owner: string): Map<string, { classId?: WeaponClass; ratings?: WeaponRatings }> {
  const map = new Map<string, { classId?: WeaponClass; ratings?: WeaponRatings }>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem("sf_weapon_nfts_v1_" + owner);
    if (!raw) return map;
    const data = JSON.parse(raw) as {
      weapons?: Array<{ mintId?: string; onchainMint?: string; classId?: WeaponClass; ratings?: WeaponRatings }>;
    };
    for (const w of data.weapons || []) {
      const mint = w.onchainMint || w.mintId;
      if (!mint || String(mint).startsWith("nft_")) continue;
      map.set(mint, { classId: w.classId, ratings: w.ratings });
    }
  } catch {
    /* ignore */
  }
  return map;
}

async function classFromMintHistory(mint: string): Promise<WeaponClass | null> {
  try {
    const sigs = (await rpc("getSignaturesForAddress", [mint, { limit: 6 }])) as Array<{ signature: string }>;
    for (const row of sigs || []) {
      const tx = (await rpc("getTransaction", [
        row.signature,
        { encoding: "json", maxSupportedTransactionVersion: 0 },
      ])) as {
        meta?: { logMessages?: string[] };
        transaction?: { message?: unknown };
      };
      const blob = `${(tx?.meta?.logMessages || []).join("\n")} ${JSON.stringify(tx?.transaction?.message || {})}`;
      const memo = blob.match(/SF WPN ([A-Za-z]+)/i);
      if (memo) {
        const label = memo[1].toLowerCase();
        if (label === "ar") return "ar";
        if ((WEAPON_CLASSES as readonly string[]).includes(label)) return label as WeaponClass;
      }
      const parsed = classFromText(blob);
      if (parsed) return parsed;
    }
  } catch {
    /* keep unknown */
  }
  return null;
}

export async function listWalletWeapons(owner: string): Promise<WalletWeapon[]> {
  if (!owner) return [];
  const result = (await rpc("getTokenAccountsByOwner", [
    owner,
    { programId: TOKEN_2022 },
    { encoding: "jsonParsed" },
  ])) as {
    value?: Array<{
      pubkey: string;
      account: { data: { parsed: { info: { mint: string; tokenAmount: { decimals: number; amount: string } } } } };
    }>;
  };

  const accounts = result?.value || [];
  const overlay = localOverlay(owner);
  const weapons: WalletWeapon[] = [];

  for (const acc of accounts) {
    const info = acc.account?.data?.parsed?.info;
    const ta = info?.tokenAmount;
    if (!ta) continue;
    if (Number(ta.decimals) !== 0) continue;
    if (String(ta.amount) !== "1") continue;
    if (info.mint === SILO_MINT) continue;

    const local = overlay.get(info.mint);
    let parsedClass: WeaponClass | null = null;
    let classId: WeaponClass = local?.classId || "ar";
    let ratings = local?.ratings ? { ...defaultRatings(), ...local.ratings } : defaultRatings();

    try {
      const mintAcc = (await rpc("getAccountInfo", [info.mint, { encoding: "base64" }])) as {
        value?: { data?: [string, string] };
      };
      const raw = mintAcc?.value?.data?.[0] ? decodeB64(mintAcc.value.data[0]) : "";
      parsedClass = classFromText(raw);
      if (parsedClass) classId = parsedClass;
      const parsedRatings = ratingsFromText(raw);
      const hasOnchainStats = Object.values(parsedRatings).some((n) => n > 1) || /damage/i.test(printable(raw));
      if (hasOnchainStats) ratings = parsedRatings;
    } catch {
      /* keep overlay / defaults */
    }

    if (!parsedClass && !local?.classId) {
      classId = (await classFromMintHistory(info.mint)) || classId;
    }

    weapons.push({
      mintId: info.mint,
      ata: acc.pubkey,
      classId,
      ratings,
      owner,
    });
  }

  return weapons;
}
