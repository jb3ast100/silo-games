"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "silo-force";

export function JoinForm() {
  const [note, setNote] = useState("Get briefings on ranked seasons and the next titles in the silo.");
  const [ok, setOk] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const callsign = String(data.get("callsign") || "").trim();
    const email = String(data.get("email") || "").trim();

    if (!callsign || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOk(false);
      setNote("Enter a callsign and a valid email.");
      return;
    }

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Array<{
      callsign: string;
      email: string;
      at: string;
    }>;
    existing.push({ callsign, email, at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    event.currentTarget.reset();
    setOk(true);
    setNote(`You're in, ${callsign}. We'll be in touch.`);
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      <div>
        <Label htmlFor="callsign">Callsign</Label>
        <Input id="callsign" name="callsign" placeholder="GHOST-7" maxLength={32} required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@domain.com" required />
      </div>
      <Button type="submit" width="full">
        Join the Force
      </Button>
      <p className={cn("text-sm", ok ? "text-gold" : "text-muted")}>{note}</p>
    </form>
  );
}
