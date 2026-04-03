"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ButtonSignin from "./ButtonSignin";
import config from "@/config";

const navLinks = [
  { href: "/browse", label: "Browse" },
  { href: "/upload", label: "Upload" },
];

const Header = () => {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  return (
    <header
      style={{ height: "var(--nav-height)" }}
      className="sticky top-0 z-50 w-full bg-bg border-b border-border"
    >
      <nav
        className="mx-auto flex h-full items-center justify-between px-[var(--px-site)]"
        style={{ maxWidth: "var(--max-width)" }}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-heading font-bold text-lg text-ink"
          title={`${config.appName} homepage`}
        >
          <span className="text-accent">Flow</span>
          <span>Vault</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
          >
            Dashboard
          </Link>
          <ButtonSignin extraStyle="!bg-accent hover:!bg-accent-h !text-white !border-0 !rounded-lg !px-4 !py-2 !text-sm !font-medium" />
        </div>

        {/* Mobile burger */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-md text-ink-2 hover:text-ink"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-bg shadow-xl px-6 py-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="font-heading font-bold text-lg" onClick={() => setIsOpen(false)}>
                <span className="text-accent">Flow</span>Vault
              </Link>
              <button
                type="button"
                className="p-2 rounded-md text-ink-2"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-ink-2 hover:text-ink"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/dashboard" className="text-base font-medium text-ink-2 hover:text-ink" onClick={() => setIsOpen(false)}>
                Dashboard
              </Link>
              <div className="pt-2">
                <ButtonSignin extraStyle="w-full !bg-accent !text-white !border-0 !rounded-lg !px-4 !py-2 !text-sm !font-medium" />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
