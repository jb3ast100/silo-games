"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#proof", label: "Proof of Skill" },
  { href: "#strike", label: "Strike Force" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#studio", label: "Studio" },
];

export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 transition-colors duration-200 md:px-7",
        solid || open
          ? "border-b border-hair bg-bg/92 backdrop-blur-md"
          : "bg-linear-to-b from-bg/90 to-transparent",
      )}
    >
      <a href="#top" className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.22em]">
        <img
          src="/images/mark.jpg"
          alt=""
          className="h-10 w-7 object-cover object-[center_38%]"
        />
        SILO GAMES
      </a>

      <nav className="hidden items-center gap-7 font-display text-[13px] font-semibold uppercase tracking-[0.14em] lg:flex">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-gold">
            {link.label}
          </a>
        ))}
        <Button asChild variant="ghost" className="h-11 border-gold text-gold">
          <a href="#strike">Play Strike Force</a>
        </Button>
      </nav>

      <button
        type="button"
        className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-1.5 lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={cn("h-px w-5 bg-fg transition-transform", open && "translate-y-1 rotate-45")} />
        <span className={cn("h-px w-5 bg-fg transition-transform", open && "-translate-y-1 -rotate-45")} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 bg-bg/95 px-7 pt-24 lg:hidden">
          <nav className="flex flex-col gap-6 font-display text-lg font-semibold uppercase tracking-[0.14em]">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <Button asChild>
              <a href="#strike" onClick={() => setOpen(false)}>
                Play Strike Force
              </a>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
