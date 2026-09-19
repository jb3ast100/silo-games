export function SiteFooter() {
  return (
    <footer className="border-t border-hair py-9 pb-12">
      <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] gap-3">
        <a href="/" className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.22em]">
          <img
            src="/images/mark.jpg"
            alt=""
            className="h-10 w-7 object-cover object-[center_38%]"
          />
          SILO GAMES
        </a>
        <p className="text-sm text-muted">Web3 Gaming Studio. Proof of Skill. May the best man win.</p>
        <p className="flex flex-wrap gap-4 text-sm text-muted">
          <a href="/exchange" className="hover:text-gold">
            NFT Exchange
          </a>
          <a href="https://strike-force.pages.dev/" className="hover:text-gold">
            Strike Force
          </a>
        </p>
        <p className="text-sm text-muted">© 2026 Silo Games. All rights reserved.</p>
      </div>
    </footer>
  );
}
