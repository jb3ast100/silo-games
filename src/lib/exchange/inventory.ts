import { EXCHANGE_RPC, WEAPON_CLASSES, type WeaponClass } from "./constants";
import type { WeaponRatings } from "./store";

const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SILO_MINT = "HwahAvFwGfB3Z5pGY1N3i1iWDffJ8N6NmLWMufpnaDMp";

const CLASS_FROM_LABEL: Record<string, WeaponClass> = {
  Pistol: "pistol",
  AR: "ar",
  SMG: "smg",
  Shotgun: "shotgun",
  Sniper: "sniper",
  Rocket: "rocket",
};

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

function classFromBytes(text: string): WeaponClass {
  for (const [label, id] of Object.entries(CLASS_FROM_LABEL)) {
    if (text.includes("SF " + label) || text.includes("class" + label) || text.includes(label)) {
      return id;
    }
  }
  for (const id of WEAPON_CLASSES) {
    if (text.toLowerCase().includes(id)) return id;
  }
  return "ar";
}

function ratingsFromBytes(text: string): WeaponRatings {
  const out = defaultRatings();
  (Object.keys(out) as Array<keyof WeaponRatings>).forEach((key) => {
    const re = new RegExp(key + "[^0-9]{0,12}(10|[1-9])", "i");
    const match = text.match(re);
    if (match) out[key] = Number(match[1]);
  });
  return out;
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
  const weapons: WalletWeapon[] = [];

  for (const acc of accounts) {
    const info = acc.account?.data?.parsed?.info;
    const ta = info?.tokenAmount;
    if (!ta) continue;
    if (Number(ta.decimals) !== 0) continue;
    if (String(ta.amount) !== "1") continue;
    if (info.mint === SILO_MINT) continue;

    let classId: WeaponClass = "ar";
    let ratings = defaultRatings();
    try {
      const mintAcc = (await rpc("getAccountInfo", [info.mint, { encoding: "base64" }])) as {
        value?: { data?: [string, string] };
      };
      const raw = mintAcc?.value?.data?.[0] ? decodeB64(mintAcc.value.data[0]) : "";
      classId = classFromBytes(raw);
      ratings = ratingsFromBytes(raw);
    } catch {
      /* keep defaults */
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
