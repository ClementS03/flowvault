import Link from 'next/link';

interface Props {
  count: number;
  max?: number;
}

export default function UpgradeBanner({ count, max = 10 }: Props) {
  const pct = Math.round((count / max) * 100);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-amber-900">
            {count}/{max} free components used
          </p>
          <span className="text-xs text-amber-700 font-medium">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-amber-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 rounded-lg bg-accent hover:bg-accent-h text-white text-xs font-semibold px-3 py-2 transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}
