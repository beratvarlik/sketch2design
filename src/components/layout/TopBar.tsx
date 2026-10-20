"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NETWORK_NAME, WALLET_ADDRESS, shortAddress } from "@/lib/placeholders";
import s from "./topbar.module.css";

type WalletState = "idle" | "connecting" | "connected";

const NAV = [
  { href: "/studio", label: "Stüdyo" },
  { href: "#", label: "Tasarımlarım" },
  { href: "#", label: "Doğrula" },
];

export default function TopBar({ wide = false }: { wide?: boolean }) {
  const pathname = usePathname();
  const [wallet, setWallet] = useState<WalletState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function connect() {
    setWallet("connecting");
    timer.current = setTimeout(() => setWallet("connected"), 900);
  }

  const addr = shortAddress(WALLET_ADDRESS);

  return (
    <header className={s.topbar}>
      <div className={`container ${s.inner} ${wide ? s.wide : ""}`}>
        <Link className={s.logo} href="/" aria-label="Sketch2Design ana sayfa">
          <svg aria-hidden="true" width="46" height="36" viewBox="0 0 46 36">
            <path d="M3 28 Q6 21 9.5 25 T16 22.5" fill="none" stroke="var(--chalk)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M27.5 8.5 C31 8 33.5 13 35 18 C36.5 23.5 37 28 36 30 C35 31.6 32 31.8 27.5 31.6 C23 31.8 20 31.6 19.2 30 C18.4 28 19 23.5 20.6 18 C22.2 13 24 8.8 27.5 8.5 Z" fill="none" stroke="var(--chalk)" strokeWidth="1.8" strokeDasharray="3 2.6" strokeLinecap="round" />
            <path d="M32 6 C35.5 6 37.5 11 39 16 C40.6 21.5 41.5 26 40.5 28 C39.5 29.6 36.6 29.8 32 29.8 C27.4 29.8 24.5 29.6 23.5 28 C22.5 26 23.4 21.5 25 16 C26.5 11 28.5 6 32 6 Z" fill="var(--text)" stroke="var(--ink)" strokeWidth="2" />
            <path d="M32 6 Q31 3 33 1.6" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="29.6" cy="17.5" r="2.4" fill="var(--ink)" />
            <circle cx="34.6" cy="17.5" r="2.4" fill="var(--ink)" />
          </svg>
          <span className={s.logoWord}>Sketch2Design</span>
        </Link>

        <nav className={s.nav} aria-label="Ana menü">
          {NAV.map((item) => {
            const on = item.href !== "#" && pathname === item.href;
            return (
              <Link key={item.label} href={item.href} className={on ? s.on : undefined} aria-current={on ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={s.wallet}>
          {wallet === "idle" && (
            <button type="button" className={s.btn} onClick={connect}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7.2 Q11 6.4 19.6 7 Q20.4 12 19.8 18.4 Q12 19.2 4.4 18.6 Q3.6 13 4 7.2 Z" />
                <path d="M15.6 12.8 h1.6 M4.2 9.6 Q10 9.1 16.8 9.4 L16.6 5.2" />
              </svg>
              Cüzdan Bağla
            </button>
          )}
          {wallet === "connecting" && (
            <button type="button" className={s.btn} disabled aria-busy="true">
              <span className={s.spin} aria-hidden="true" />
              Bağlanıyor…
            </button>
          )}
          {wallet === "connected" && (
            <>
              <span className={s.net}>{NETWORK_NAME}</span>
              <button
                type="button"
                className={s.addr}
                onClick={() => setWallet("idle")}
                aria-label={`Cüzdan bağlı: ${addr}. Bağlantıyı kesmek için tıkla`}
              >
                <span className={s.dotOk} aria-hidden="true" />
                {addr}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
