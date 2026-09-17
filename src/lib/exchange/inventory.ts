import { EXCHANGE_RPC, WEAPON_CLASSES, type WeaponClass } from "./constants";
import type { WeaponRatings } from "./store";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SILO_MINT = "HwahAvFwGfB3Z5pGY1N3i1iWDffJ8N6NmLWMufpnaDMp";
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

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

export function ratingsRank(r: WeaponRatings | null | undefined) {
  if (!r) return 0;
  return r.damage + r.accuracy + r.range + r.handling + r.recoil;
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

function clampStat(v: string | number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, n));
}

function ratingsFromMatch(m: RegExpMatchArray): WeaponRatings {
  return {
    damage: clampStat(m[1]),
    accuracy: clampStat(m[2]),
    range: clampStat(m[3]),
    handling: clampStat(m[4]),
    recoil: clampStat(m[5]),
  };
}

function pickBetter(a: WeaponRatings | null, b: WeaponRatings | null) {
  if (!b) return a;
  if (!a) return b;
  return ratingsRank(b) > ratingsRank(a) ? b : a;
}

function ratingsFromText(text: string, mint?: string): WeaponRatings | null {
  const blob = printable(text);
  let best: WeaponRatings | null = null;
  const tagged = /SF STAT\s+([1-9A-HJ-NP-Za-km-z]{32,44})\s+d=(\d+)\s+a=(\d+)\s+r=(\d+)\s+h=(\d+)\s+c=(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = tagged.exec(blob))) {
    if (mint && m[1] !== mint) continue;
    best = pickBetter(best, {
      damage: clampStat(m[2]),
      accuracy: clampStat(m[3]),
      range: clampStat(m[4]),
      handling: clampStat(m[5]),
      recoil: clampStat(m[6]),
    });
  }
  const compact = blob.match(/\bd=(\d+)\s+a=(\d+)\s+r=(\d+)\s+h=(\d+)\s+c=(\d+)/i);
  if (compact && (!mint || blob.includes(mint))) {
    best = pickBetter(best, ratingsFromMatch(compact));
  }
  if (best) return best;
  const out = defaultRatings();
  let hit = false;
  (Object.keys(out) as Array<keyof WeaponRatings>).forEach((key) => {
    const re = new RegExp("(?:^|\\W)" + key + "[^0-9]{0,16}(10|[1-9])", "i");
    const match = blob.match(re);
    if (match) {
      out[key] = clampStat(match[1]);
      hit = true;
    }
  });
  return hit ? out : null;
}

function collectIxs(tx: {
  meta?: { logMessages?: string[]; innerInstructions?: Array<{ instructions?: unknown[] }> };
  transaction?: { message?: { instructions?: unknown[] } };
}) {
  const out: unknown[] = [];
  const top = tx?.transaction?.message?.instructions || [];
  out.push(...top);
  for (const inner of tx?.meta?.innerInstructions || []) {
    out.push(...(inner.instructions || []));
  }
  return out;
}

function txBlob(tx: {
  meta?: { logMessages?: string[]; innerInstructions?: Array<{ instructions?: unknown[] }> };
  transaction?: { message?: { instructions?: unknown[] } };
}) {
  const parts = [(tx?.meta?.logMessages || []).join("\n")];
  for (const ix of collectIxs(tx)) {
    const rec = ix as { parsed?: unknown; programId?: string };
    if (typeof rec.parsed === "string") parts.push(rec.parsed);
    else if (rec.parsed && typeof rec.parsed === "object") parts.push(JSON.stringify(rec.parsed));
    if (rec.programId === MEMO_PROGRAM) parts.push(JSON.stringify(ix));
  }
  parts.push(JSON.stringify(tx?.transaction?.message || {}));
  return parts.join("\n");
}

async function fetchTx(signature: string) {
  return (await rpc("getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
  ])) as {
    meta?: { logMessages?: string[]; innerInstructions?: Array<{ instructions?: unknown[] }> };
    transaction?: { message?: { instructions?: unknown[] } };
  } | null;
}

async function scanAddress(address: string, limit = 40) {
  const sigs = (await rpc("getSignaturesForAddress", [address, { limit }])) as Array<{ signature: string }>;
  const blobs: string[] = [];
  for (const row of sigs || []) {
    try {
      const tx = await fetchTx(row.signature);
      if (tx) blobs.push(txBlob(tx));
    } catch {
      /* skip missing tx */
    }
  }
  return blobs;
}

function absorbBlobs(
  blobs: string[],
  mint: string,
  state: { classId: WeaponClass | null; ratings: WeaponRatings | null },
) {
  for (const blob of blobs) {
    if (!state.classId) {
      const memo = blob.match(/SF WPN ([A-Za-z]+)/i);
      if (memo) {
        const label = memo[1].toLowerCase();
        if (label === "ar") state.classId = "ar";
        else if ((WEAPON_CLASSES as readonly string[]).includes(label)) state.classId = label as WeaponClass;
      }
      state.classId = state.classId || classFromText(blob);
    }
    state.ratings = pickBetter(state.ratings, ratingsFromText(blob, mint));
  }
  return state;
}

export async function ratingsFromChain(
  mint: string,
  ownerHint?: string,
): Promise<{ classId: WeaponClass | null; ratings: WeaponRatings | null }> {
  const state: { classId: WeaponClass | null; ratings: WeaponRatings | null } = {
    classId: null,
    ratings: null,
  };
  try {
    absorbBlobs(await scanAddress(mint, 30), mint, state);
  } catch {
    /* mint history may be empty for memo-only upgrades */
  }
  if (ownerHint && ratingsRank(state.ratings) <= 5) {
    try {
      absorbBlobs(await scanAddress(ownerHint, 50), mint, state);
    } catch {
      /* keep what we have */
    }
  }
  return state;
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

async function ownerStatIndex(owner: string) {
  const map = new Map<string, { classId: WeaponClass | null; ratings: WeaponRatings | null }>();
  try {
    const blobs = await scanAddress(owner, 50);
    const tagged =
      /SF STAT\s+([1-9A-HJ-NP-Za-km-z]{32,44})\s+d=(\d+)\s+a=(\d+)\s+r=(\d+)\s+h=(\d+)\s+c=(\d+)/gi;
    for (const blob of blobs) {
      tagged.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = tagged.exec(blob))) {
        const mint = m[1];
        const ratings = {
          damage: clampStat(m[2]),
          accuracy: clampStat(m[3]),
          range: clampStat(m[4]),
          handling: clampStat(m[5]),
          recoil: clampStat(m[6]),
        };
        const prev = map.get(mint) || { classId: classFromText(blob), ratings: null };
        prev.classId = prev.classId || classFromText(blob);
        prev.ratings = pickBetter(prev.ratings, ratings);
        map.set(mint, prev);
      }
    }
  } catch {
    /* ignore */
  }
  return map;
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
  const ownerIndex = await ownerStatIndex(owner);
  const weapons: WalletWeapon[] = [];

  for (const acc of accounts) {
    const info = acc.account?.data?.parsed?.info;
    const ta = info?.tokenAmount;
    if (!ta) continue;
    if (Number(ta.decimals) !== 0) continue;
    if (String(ta.amount) !== "1") continue;
    if (info.mint === SILO_MINT) continue;

    const local = overlay.get(info.mint);
    const indexed = ownerIndex.get(info.mint);
    let parsedClass: WeaponClass | null = indexed?.classId || null;
    let classId: WeaponClass = parsedClass || local?.classId || "ar";
    let ratings = pickBetter(indexed?.ratings || null, local?.ratings || null) || defaultRatings();

    try {
      const mintAcc = (await rpc("getAccountInfo", [info.mint, { encoding: "base64" }])) as {
        value?: { data?: [string, string] };
      };
      const raw = mintAcc?.value?.data?.[0] ? decodeB64(mintAcc.value.data[0]) : "";
      parsedClass = classFromText(raw) || parsedClass;
      if (parsedClass) classId = parsedClass;
      ratings = pickBetter(ratingsFromText(raw, info.mint), ratings) || ratings;
    } catch {
      /* keep overlay / owner index */
    }

    if (!parsedClass || ratingsRank(ratings) <= 5) {
      const hist = await ratingsFromChain(info.mint, owner);
      if (!parsedClass && (hist.classId || local?.classId)) classId = hist.classId || local?.classId || classId;
      ratings = pickBetter(hist.ratings, ratings) || ratings;
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
