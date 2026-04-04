import Link from "next/link";
import config from "@/config";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface">
      <div
        className="mx-auto px-[var(--px-site)] py-12 flex flex-col md:flex-row justify-between gap-8"
        style={{ maxWidth: "var(--max-width)" }}
      >
        {/* Brand */}
        <div className="flex flex-col gap-2">
          <Link href="/" className="font-heading font-bold text-lg text-ink">
            <span className="text-accent">Flow</span>Vault
          </Link>
          <p className="text-sm text-ink-2 max-w-xs">{config.appDescription}</p>
          <p className="text-xs text-ink-3 mt-2">
            &copy; {new Date().getFullYear()} FlowVault. All rights reserved.
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-12">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-3">Product</span>
            <Link href="/browse" className="text-sm text-ink-2 hover:text-ink transition-colors">Browse</Link>
            <Link href="/upload" className="text-sm text-ink-2 hover:text-ink transition-colors">Upload</Link>
            <Link href="/dashboard" className="text-sm text-ink-2 hover:text-ink transition-colors">Dashboard</Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-3">Legal</span>
            <Link href="/tos" className="text-sm text-ink-2 hover:text-ink transition-colors">Terms</Link>
            <Link href="/privacy-policy" className="text-sm text-ink-2 hover:text-ink transition-colors">Privacy</Link>
            <Link href="/legal" className="text-sm text-ink-2 hover:text-ink transition-colors">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
