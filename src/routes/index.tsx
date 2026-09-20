import { createFileRoute } from "@tanstack/react-router";
import { JoinForm } from "@/components/join-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <SiteHeader />
      <main id="top">
        <Hero />
        <Problem />
        <Proof />
        <Strike />
        <Portfolio />
        <Studio />
        <Join />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative grid min-h-dvh items-end px-5 pb-20 pt-36 md:px-7">
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero.jpg"
          alt="Two squads clash across a ruined industrial silo complex at night."
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-bg/85 via-bg/35 to-bg/70" />
        <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent" />
      </div>
      <div className="relative z-1 mx-auto w-[min(1180px,100%)]">
        <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
          Web3 Gaming Studio
        </p>
        <h1 className="font-display text-[clamp(3.25rem,9vw,6.75rem)] font-semibold uppercase leading-[0.95] tracking-wide">
          Earn by being
          <br />
          <em className="not-italic text-gold">good</em> at the game.
        </h1>
        <p className="mt-5 mb-7 max-w-prose text-lg text-fg/90">
          Silo Games builds fun, economically sustainable Web3 games. Proof of Skill. PvP. May the
          best man win.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href="https://play.silogames.org/" target="_blank" rel="noopener noreferrer">Enter Strike Force</a>
          </Button>
          <Button asChild variant="ghost">
            <a href="#proof">Read the doctrine</a>
          </Button>
        </div>
        <dl className="mt-14 grid max-w-xl grid-cols-2 gap-6 border-t border-hair pt-6 sm:grid-cols-3">
          <div>
            <dt className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">Protocol</dt>
            <dd className="mt-1 font-display text-[22px]">Proof of Skill</dd>
          </div>
          <div>
            <dt className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">First Title</dt>
            <dd className="mt-1 font-display text-[22px]">Strike Force</dd>
          </div>
          <div>
            <dt className="font-display text-[11px] uppercase tracking-[0.18em] text-muted">Mode</dt>
            <dd className="mt-1 font-display text-[22px]">Competitive PvP</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-t border-hair py-20 md:py-28" id="problem">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        <div className="mb-14 grid gap-8 md:grid-cols-2 md:items-end">
          <div>
            <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
              The record so far
            </p>
            <h2 className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-semibold uppercase leading-[0.95]">
              Most Web3 games die the moment playing stops paying.
            </h2>
          </div>
          <p className="text-lg text-muted">
            Web3 games have a poor track record of unsustainable economics. When the faucet dries
            up, players leave. When players leave, the game dies. Silo Games exists to break that
            loop — by making skill the scarce resource, not inflation.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="border border-hair bg-surface px-6 py-8">
            <span className="font-display tracking-[0.16em] text-gold">01</span>
            <h3 className="mt-4 mb-3 font-display text-[28px] font-semibold uppercase">Extract, don't play</h3>
            <p className="text-muted">
              Economies designed around emission schedules instead of competition. The meta becomes
              farming, not winning.
            </p>
          </article>
          <article className="border border-hair bg-surface px-6 py-8">
            <span className="font-display tracking-[0.16em] text-gold">02</span>
            <h3 className="mt-4 mb-3 font-display text-[28px] font-semibold uppercase">Pay to print</h3>
            <p className="text-muted">
              When anyone can mint value without proving ability, the floor collapses and the good
              players walk.
            </p>
          </article>
          <article className="border border-hair bg-surface px-6 py-8">
            <span className="font-display tracking-[0.16em] text-gold">03</span>
            <h3 className="mt-4 mb-3 font-display text-[28px] font-semibold uppercase">Empty servers</h3>
            <p className="text-muted">
              Once rewards taper, matchmaking dies. A game without opponents is not a game.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Proof() {
  return (
    <section id="proof" className="grid min-h-[720px] lg:grid-cols-2">
      <img
        src="/images/proof-of-skill.jpg"
        alt="Two figures stand in a circular amber-lit arena."
        className="h-full min-h-[420px] w-full object-cover"
      />
      <div className="flex flex-col justify-center border-y border-hair bg-surface px-6 py-16 md:px-14">
        <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
          The protocol
        </p>
        <h2 className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-semibold uppercase leading-[0.95]">
          Proof of Skill
        </h2>
        <p className="mt-4 max-w-prose text-lg text-muted">
          Earn by being good at playing games. Not by showing up. Not by grinding a faucet. By
          winning.
        </p>
        <ul className="my-8 grid gap-5">
          <li className="border-l-2 border-gold pl-4 text-muted">
            <strong className="mb-1 block font-semibold text-fg">Skill is the stake.</strong>
            Outcomes are decided in PvP. Rank, reward, and reputation follow the match — not a token
            emission calendar.
          </li>
          <li className="border-l-2 border-gold pl-4 text-muted">
            <strong className="mb-1 block font-semibold text-fg">Sustainable by design.</strong>
            Value flows to the players who can take it. That keeps competition alive after the launch
            window closes.
          </li>
          <li className="border-l-2 border-gold pl-4 text-muted">
            <strong className="mb-1 block font-semibold text-fg">May the best man win.</strong>
            No soft landings. No participation trophies dressed as yield. The scoreboard is the
            contract.
          </li>
        </ul>
        <div>
          <Button asChild>
            <a href="https://play.silogames.org/" target="_blank" rel="noopener noreferrer">Play Strike Force</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Strike() {
  return (
    <section id="strike" className="pt-20 md:pt-28">
      <div className="mx-auto mb-9 w-[min(1180px,calc(100%-40px))]">
        <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
          First title
        </p>
        <h2 className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-semibold uppercase leading-[0.95]">
          Strike Force
        </h2>
        <p className="mt-4 max-w-prose text-lg text-muted">
          The first game in the Silo Games portfolio. Tactical PvP built on Proof of Skill — where
          outplay your opponents and earn your rewards.
        </p>
      </div>
      <div className="relative mx-auto w-[min(1280px,100%)]">
        <img
          src="/images/strike-force.jpg"
          alt="Strike Force operator standing in the mouth of a concrete silo."
          className="h-[min(86vh,920px)] w-full object-cover object-[center_20%]"
        />
        <div className="border border-line bg-bg/90 p-7 backdrop-blur-md md:absolute md:right-9 md:bottom-9 md:w-[min(420px,calc(100%-48px))]">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            Live now
          </p>
          <h3 className="mt-2.5 mb-3 font-display text-[26px] font-semibold uppercase">
            Close quarters. No inflation.
          </h3>
          <p className="text-muted">
            Strike Force is a competitive shooter designed so the economy only moves when someone
            actually wins. Load in. Prove it. Extract.
          </p>
          <ul className="my-5 list-disc space-y-1.5 pl-5">
            <li>Free-for-all PvP</li>
            <li>Skill-gated rewards</li>
            <li>Seasonal ranked ladder</li>
            <li>Owned loadouts, earned not printed</li>
          </ul>
          <Button asChild>
            <a href="https://play.silogames.org/" target="_blank" rel="noopener noreferrer">Play Strike Force</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Portfolio() {
  return (
    <section id="portfolio" className="py-24">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        <div className="mb-10">
          <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
            The silo
          </p>
          <h2 className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-semibold uppercase leading-[0.95]">
            A portfolio, not a one-drop.
          </h2>
          <p className="mt-4 max-w-prose text-lg text-muted">
            Strike Force is first. More titles will come online under the same doctrine: fun first,
            economics that survive contact with skilled players.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
          <article className="border border-hair bg-surface">
            <div className="h-70 overflow-hidden">
              <img
                src="/images/strike-force.jpg"
                alt=""
                className="h-full w-full object-cover object-[center_18%]"
              />
            </div>
            <div className="px-5 pt-5 pb-6">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                Live
              </span>
              <h3 className="mt-2 mb-2 font-display text-[28px] font-semibold uppercase">Strike Force</h3>
              <p className="text-muted">Tactical PvP shooter. Proof of Skill native.</p>
            </div>
          </article>
          <article className="border border-hair bg-surface">
            <div className="grid h-70 place-items-center bg-[repeating-linear-gradient(135deg,transparent_0_12px,rgb(236_231_220/0.03)_12px_13px)]">
              <span className="font-display text-6xl text-gold/45">02</span>
            </div>
            <div className="px-5 pt-5 pb-6">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Classified
              </span>
              <h3 className="mt-2 mb-2 font-display text-[28px] font-semibold uppercase">Silo-02</h3>
              <p className="text-muted">Next title in the pipeline. Briefing pending.</p>
            </div>
          </article>
          <article className="border border-hair bg-surface">
            <div className="grid h-70 place-items-center bg-[repeating-linear-gradient(135deg,transparent_0_12px,rgb(236_231_220/0.03)_12px_13px)]">
              <span className="font-display text-6xl text-gold/45">03</span>
            </div>
            <div className="px-5 pt-5 pb-6">
              <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Classified
              </span>
              <h3 className="mt-2 mb-2 font-display text-[28px] font-semibold uppercase">Silo-03</h3>
              <p className="text-muted">Future addition to the portfolio.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Studio() {
  return (
    <section id="studio" className="pb-24">
      <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
        <div className="grid gap-10 border-b border-hair pb-12 md:grid-cols-2">
          <div>
            <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
              The studio
            </p>
            <h2 className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-semibold uppercase leading-[0.95]">
              Built to further the boundaries of Web3 gaming.
            </h2>
          </div>
          <blockquote className="text-2xl leading-snug text-fg/90">
            We exist to make games people still want to play after the rewards chart stops going up
            and to the right. Fun first. Skill second. Token last — and only if it serves the match.
          </blockquote>
        </div>
        <div className="grid gap-8 pt-10 md:grid-cols-3">
          <article>
            <h3 className="mb-2.5 font-display text-2xl font-semibold uppercase">Fun is non-negotiable</h3>
            <p className="text-muted">
              If the loop isn't worth running without a payout, it isn't a game. It's a
              spreadsheet with skins.
            </p>
          </article>
          <article>
            <h3 className="mb-2.5 font-display text-2xl font-semibold uppercase">Skill is the filter</h3>
            <p className="text-muted">
              Proof of Skill routes rewards to players who can take them. That is how economies stay
              honest.
            </p>
          </article>
          <article>
            <h3 className="mb-2.5 font-display text-2xl font-semibold uppercase">A lasting portfolio</h3>
            <p className="text-muted">
              Strike Force opens the silo. The studio is built to ship many games under one doctrine.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Join() {
  return (
    <section id="join" className="pb-28">
      <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] gap-12 border border-line bg-surface px-6 py-10 md:grid-cols-2 md:px-14 md:py-14">
        <div>
          <p className="mb-3.5 font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold">
            Recruitment
          </p>
          <h2 className="font-display text-[clamp(2.1rem,5.4vw,4rem)] font-semibold uppercase leading-[0.95]">
            Join the Force.
          </h2>
          <p className="mt-4 max-w-prose text-lg text-muted">
            Leave a callsign and an email. Get briefings on ranked seasons and the next
            titles in the silo.
          </p>
        </div>
        <JoinForm />
      </div>
    </section>
  );
}
