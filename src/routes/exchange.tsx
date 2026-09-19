import { createFileRoute } from "@tanstack/react-router";
import { ExchangeApp } from "@/components/exchange-app";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/exchange")({
  head: () => ({
    meta: [
      { title: "Silo Exchange — Silo Games" },
      {
        name: "description",
        content:
          "Official Silo NFT exchange. Trade Strike Force weapon NFTs in SOL. 5% treasury fee. Exclusive-locked assets cannot be sold on third-party marketplaces.",
      },
    ],
  }),
  component: ExchangePage,
});

function ExchangePage() {
  return (
    <>
      <div className="noise-overlay" aria-hidden="true" />
      <SiteHeader />
      <main>
        <ExchangeApp />
      </main>
      <SiteFooter />
    </>
  );
}
