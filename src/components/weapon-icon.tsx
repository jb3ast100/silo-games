import type { WeaponClass } from "@/lib/exchange/constants";

export function WeaponGlyph({ classId }: { classId: WeaponClass }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (classId === "pistol") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M14 30h28l4 6H42l-2 12H28l2-12H18z" {...common} />
        <path d="M18 30V24h10v6" {...common} />
      </svg>
    );
  }
  if (classId === "smg") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M10 28h34l6 4H48v8H28l-2 10H18l2-10H14z" {...common} />
        <path d="M16 28V22h8" {...common} />
      </svg>
    );
  }
  if (classId === "shotgun") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M6 30h40l8 4v4H48l-3 10H33l3-10H20z" {...common} />
        <path d="M12 30V24h16v6" {...common} />
      </svg>
    );
  }
  if (classId === "sniper") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M4 32h46l8 3v2H50l-2 8H38l2-8H22z" {...common} />
        <circle cx="22" cy="26" r="5" {...common} />
        <path d="M22 21v-4" {...common} />
      </svg>
    );
  }
  if (classId === "rocket") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
        <path d="M10 34l36-10 4 14-36 6z" {...common} />
        <path d="M14 36l-6 10 12-2" {...common} />
        <path d="M46 24l8-6" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-10 w-10">
      <path d="M6 30h38l10 5H50l-3 11H36l3-11H20z" {...common} />
      <path d="M14 30V22h12v8" {...common} />
      <path d="M24 22h10" {...common} />
    </svg>
  );
}
