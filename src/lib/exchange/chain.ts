import { getPhantom } from './wallet';
import { CLASS_LABEL, GAME_ORIGIN, WEAPON_CLASSES, type WeaponClass } from './constants';
import type { WeaponRatings } from './store';

export type ChainWeapon = { mintId: string; classId: WeaponClass; ratings: WeaponRatings; sum: number; locked: boolean };
export type ChainListing = ChainWeapon & { id: string; seller: string; buyer: string; priceRaw: string; priceSol: string; receiptMint: string; status: 'active' | 'sold' | 'cancelled'; name: string };
type RawWeapon = { mint: string; classId: number; ratings: number[]; listed: boolean; lockedLife: string };
type RawListing = { address: string; seller: string; buyer: string; price: bigint; receiptMint: string; status: number; weapon: RawWeapon };
type Client = {
  readWallet(owner: string): Promise<{ weapons: RawWeapon[] }>;
  listMarket(): Promise<RawListing[]>;
  listWeapon(mint: string, price: string): Promise<{ signature: string; receiptMint: string }>;
  cancelListing(id: string): Promise<{ signature: string }>;
  buyListing(id: string, expectedPrice: bigint): Promise<{ signature: string }>;
};
type Library = { SiloEconomyClient: new (opts: { rpcUrl: string; programId: string; wallet: unknown }) => Client };
let loaded: Promise<Library> | null = null;
let settings: { rpcUrl: string; programId: string | null } | null = null;

async function library(): Promise<Library> {
  const global = window as unknown as { SiloEconomy?: Library };
  if (global.SiloEconomy) return global.SiloEconomy;
  if (!loaded) loaded = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/economy/silo-economy.js?v=20260918-sol-exchange-2';
    script.onload = () => global.SiloEconomy ? resolve(global.SiloEconomy) : reject(new Error('Wallet library did not load.'));
    script.onerror = () => { loaded = null; reject(new Error('Unable to load the wallet library.')); };
    document.head.appendChild(script);
  });
  return loaded;
}
async function client(): Promise<Client> {
  if (!settings) {
    const response = await fetch(new URL('/economy/config', import.meta.env.VITE_ECONOMY_API_ORIGIN || GAME_ORIGIN), { cache: 'no-store', signal: AbortSignal.timeout(12000) }).catch(()=>{throw new Error('The exchange could not reach Solana services. Please refresh in a moment.');});
    if (!response.ok) throw new Error('The economy service is temporarily unavailable.');
    settings = await response.json() as typeof settings;
  }
  if (!settings?.programId) { settings = null; throw new Error('The new SILO Devnet exchange is awaiting contract deployment.'); }
  const lib = await library();
  return new lib.SiloEconomyClient({ ...settings, programId: settings.programId, wallet: getPhantom() });
}
function weapon(row: RawWeapon): ChainWeapon {
  if (!WEAPON_CLASSES[row.classId] || row.ratings.length !== 5 || row.ratings.some(n => !Number.isInteger(n) || n < 1 || n > 10)) throw new Error('Invalid on-chain weapon.');
  const [damage, accuracy, range, handling, recoil] = row.ratings;
  return { mintId: row.mint, classId: WEAPON_CLASSES[row.classId], ratings: { damage, accuracy, range, handling, recoil }, sum: row.ratings.reduce((a,b)=>a+b,0), locked: row.lockedLife !== '11111111111111111111111111111111' };
}
export function formatSol(raw: bigint): string { return `${raw / 1_000_000_000n}${raw % 1_000_000_000n ? '.' + (raw % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '') : ''}`; }
export function parseSol(value: string): bigint {
  if (!/^\d+(?:\.\d{1,9})?$/.test(value)) throw new Error('Use a SOL amount with at most nine decimal places.');
  const [whole, fraction = ''] = value.split('.'); const raw = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9,'0'));
  if (raw < 10n || raw > 18_446_744_073_709_551_615n) throw new Error('Enter a valid positive price.'); return raw;
}
export function quoteSol(value: string) {
  try { const price = parseSol(value), fee = price / 10n;return { valid: true, price: formatSol(price), fee: formatSol(fee), seller: formatSol(price-fee) }; }
  catch { return { valid: false, price: '0', fee: '0', seller: '0' }; }
}
export async function readInventory(owner: string): Promise<ChainWeapon[]> { const result=await (await client()).readWallet(owner);return result.weapons.filter(w=>!w.listed).map(weapon); }
export async function readListings(): Promise<ChainListing[]> {
  return (await (await client()).listMarket()).map(row=>{const item=weapon(row.weapon);return {...item,id:row.address,seller:row.seller,buyer:row.buyer,priceRaw:row.price.toString(),priceSol:formatSol(row.price),receiptMint:row.receiptMint,status:(['active','sold','cancelled'] as const)[row.status],name:`SF ${CLASS_LABEL[item.classId]}`};});
}
function assertWallet(owner: string) { if(getPhantom()?.publicKey?.toString()!==owner)throw new Error('Wallet changed. Refresh before continuing.'); }
export async function listWeapon(owner: string, mint: string, price: string) { parseSol(price);const c=await client();assertWallet(owner);return c.listWeapon(mint,price); }
export async function cancelListing(owner: string, id: string) { const c=await client();assertWallet(owner);return c.cancelListing(id); }
export async function buyListing(owner: string, row: ChainListing) { const c=await client();assertWallet(owner);return c.buyListing(row.id,BigInt(row.priceRaw)); }
