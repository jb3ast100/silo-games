import { type WeaponClass } from "./constants";
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
  ["Assault Rifle", "ar"],
];

export type WalletWeapon = {
  mintId: string;
  ata: string;
  classId: WeaponClass;
  ratings: WeaponRatings;
  owner: string;
  onMint: boolean;
};

function defaultRatings(): WeaponRatings {
  return { damage: 1, accuracy: 1, range: 1, handling: 1, recoil: 1 };
}

export function ratingsRank(r: WeaponRatings | null | undefined) {
  if (!r) return 0;
  return r.damage + r.accuracy + r.range + r.handling + r.recoil;
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(EXCHANGE_RPC_URL(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || "rpc_error");
  return json.result;
}

function EXCHANGE_RPC_URL() {
  return "https://api.devnet.solana.com";
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

function ratingsFromText(text: string): WeaponRatings | null {
  const blob = printable(text);
  let best: WeaponRatings | null = null;
  const compact = blob.match(/\bd=(\d+)\s+a=(\d+)\s+r=(\d+)\s+h=(\d+)\s+c=(\d+)/i);
  if (compact) best = pickBetter(best, ratingsFromMatch(compact));
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

type TokenMetadataState = {
  name?: string;
  symbol?: string;
  uri?: string;
  additionalMetadata?: unknown;
};

function pairsFromAdditional(raw: unknown): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (!raw) return out;
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (Array.isArray(row) && row.length >= 2) out.push([String(row[0]), String(row[1])]);
      else if (row && typeof row === "object") {
        const rec = row as { key?: string; value?: string };
        if (rec.key != null) out.push([String(rec.key), String(rec.value ?? "")]);
      }
    }
  }
  return out;
}

function ratingsFromMetadata(meta: TokenMetadataState | null | undefined) {
  if (!meta) return { classId: null as WeaponClass | null, ratings: null as WeaponRatings | null };
  const blob = [meta.name, meta.symbol, meta.uri].concat(pairsFromAdditional(meta.additionalMetadata).flat()).join(" ");
  const classId = classFromText(blob);
  const fromPairs = defaultRatings();
  let pairHit = false;
  for (const [k, v] of pairsFromAdditional(meta.additionalMetadata)) {
    const key = k.toLowerCase();
    if (key === "sf") {
      const compact = ratingsFromText(v);
      if (compact) return { classId: classId || classFromText(v), ratings: compact };
    }
    if (key in fromPairs) {
      fromPairs[key as keyof WeaponRatings] = clampStat(v);
      pairHit = true;
    }
  }
  return { classId, ratings: ratingsFromText(blob) || (pairHit ? fromPairs : null) };
}

function extractTokenMetadata(parsed: unknown): TokenMetadataState | null {
  const info = parsed as {
    info?: { extensions?: Array<{ extension?: string; state?: TokenMetadataState }> };
    extensions?: Array<{ extension?: string; state?: TokenMetadataState }>;
  };
  const exts = info?.info?.extensions || info?.extensions || [];
  for (const ext of exts) {
    const name = String(ext?.extension || "").toLowerCase();
    if (name === "tokenmetadata" || name === "token_metadata") return ext.state || null;
  }
  return null;
}

export async function ratingsFromChain(
  mint: string,
  _ownerHint?: string,
): Promise<{ classId: WeaponClass | null; ratings: WeaponRatings | null; onMint: boolean }> {
  try {
    const parsedAcc = (await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }])) as {
      value?: { data?: { parsed?: unknown } | [string, string] };
    };
    const parsed = parsedAcc?.value?.data && !Array.isArray(parsedAcc.value.data) ? parsedAcc.value.data.parsed : null;
    const fromParsed = ratingsFromMetadata(extractTokenMetadata(parsed));
    if (fromParsed.ratings) return { ...fromParsed, onMint: true };
    const rawAcc = (await rpc("getAccountInfo", [mint, { encoding: "base64" }])) as {
      value?: { data?: [string, string] };
    };
    const raw = rawAcc?.value?.data?.[0] ? decodeB64(rawAcc.value.data[0]) : "";
    const fromRaw = ratingsFromText(raw);
    const classId = fromParsed.classId || classFromText(raw);
    if (fromRaw || classId) return { classId, ratings: fromRaw, onMint: !!fromRaw };
  } catch {
    /* mint missing */
  }
  return { classId: null, ratings: null, onMint: false };
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
  const weapons: WalletWeapon[] = [];
  for (const acc of result?.value || []) {
    const info = acc.account?.data?.parsed?.info;
    const ta = info?.tokenAmount;
    if (!ta) continue;
    if (Number(ta.decimals) !== 0) continue;
    if (String(ta.amount) !== "1") continue;
    if (info.mint === SILO_MINT) continue;
    const live = await ratingsFromChain(info.mint, owner);
    weapons.push({
      mintId: info.mint,
      ata: acc.pubkey,
      classId: live.classId || "ar",
      ratings: live.ratings || defaultRatings(),
      owner,
      onMint: !!live.onMint,
    });
  }
  return weapons;
}
