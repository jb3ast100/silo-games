export type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction: (tx: unknown) => Promise<{ signature?: string } | string>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
  const provider = anyWindow.solana?.isPhantom ? anyWindow.solana : anyWindow.phantom?.solana;
  return provider || null;
}

export async function connectPhantom(): Promise<string> {
  const provider = getPhantom();
  if (!provider) {
    throw new Error("Phantom not found. Install Phantom and set it to Devnet.");
  }
  const resp = await provider.connect({ onlyIfTrusted: false });
  const pk = resp?.publicKey?.toString() || provider.publicKey?.toString();
  if (!pk) throw new Error("Phantom did not return a public key.");
  return pk;
}

export async function loadWeb3(): Promise<typeof window & { solanaWeb3: SolanaWeb3 }> {
  if (typeof window === "undefined") throw new Error("wallet helpers are browser-only");
  const w = window as unknown as { solanaWeb3?: SolanaWeb3 };
  if (w.solanaWeb3) return window as unknown as typeof window & { solanaWeb3: SolanaWeb3 };
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@solana/web3.js@1.95.8/lib/index.iife.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load @solana/web3.js"));
    document.head.appendChild(s);
  });
  const loaded = (window as unknown as { solanaWeb3?: SolanaWeb3 }).solanaWeb3;
  if (!loaded) throw new Error("solanaWeb3 missing after script load");
  return window as unknown as typeof window & { solanaWeb3: SolanaWeb3 };
}

export type SolanaWeb3 = {
  Connection: new (url: string, commitment: string) => {
    getLatestBlockhash: () => Promise<{ blockhash: string }>;
    confirmTransaction: (sig: string, commitment: string) => Promise<unknown>;
    getBalance: (pk: unknown) => Promise<number>;
  };
  PublicKey: new (s: string) => { toString(): string };
  Transaction: new () => {
    add: (...ix: unknown[]) => unknown;
    feePayer: unknown;
    recentBlockhash: string;
  };
  SystemProgram: {
    transfer: (opts: { fromPubkey: unknown; toPubkey: unknown; lamports: number | bigint }) => unknown;
  };
};
