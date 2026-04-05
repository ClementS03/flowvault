import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Roadmap — FlowVault',
  description: 'What we shipped and what is coming.',
  robots: { index: false, follow: false },
};

type Item = {
  label: string;
  done: boolean;
  note?: string;
};

type Phase = {
  id: string;
  title: string;
  subtitle: string;
  status: 'done' | 'in-progress' | 'upcoming';
  items: Item[];
};

const phases: Phase[] = [
  {
    id: 'phase-1',
    title: 'Phase 1 — MVP',
    subtitle: 'Core product: upload, share, copy.',
    status: 'done',
    items: [
      { label: 'Google OAuth + Magic Link auth', done: true },
      { label: 'Paste Webflow component JSON from clipboard', done: true },
      { label: 'Store components in Supabase Storage (private bucket)', done: true },
      { label: 'Unique shareable link — /c/[slug]', done: true },
      { label: 'Copy to Webflow Designer in one click', done: true },
      { label: 'Dashboard — my components library', done: true },
      { label: 'Public browse page (marketplace grid)', done: true },
      { label: 'Guest access control (10-component limit on browse)', done: true },
      { label: 'Username uniqueness live check with debounce', done: true },
      { label: 'Category + tags on upload form', done: true },
      { label: 'Free plan limit — 10 stored components', done: true },
      { label: 'JSON size limit (5 MB)', done: true },
      { label: 'Security headers (CSP, X-Frame-Options, etc.)', done: true },
    ],
  },
  {
    id: 'phase-1b',
    title: 'Phase 1b — Profile UX + Admin',
    subtitle: 'Profiles, moderation, and email flows.',
    status: 'done',
    items: [
      { label: 'Public profile pages — /u/[username]', done: true },
      { label: 'Custom avatar upload', done: true },
      { label: 'Private profile toggle', done: true },
      { label: 'Admin moderation panel — /admin', done: true },
      { label: 'Unpublish with reason + optional author email', done: true },
      { label: 'Pending review flow — re-publish after rejection', done: true },
      { label: 'Welcome email on first signup', done: true },
      { label: 'Moderation approved / rejected transactional emails', done: true },
      { label: 'Rejection notice shown in dashboard', done: true },
      { label: 'Vercel Analytics (cookieless, GDPR-compliant)', done: true },
      { label: 'OG images for component pages', done: true },
    ],
  },
  {
    id: 'phase-2',
    title: 'Phase 2 — Marketplace & Discovery',
    subtitle: 'Make it easy to find great components.',
    status: 'in-progress',
    items: [
      { label: 'Category filters', done: true },
      { label: 'Sort by trending (most copied) and newest', done: true },
      { label: 'Full-text search across name, description, tags', done: false },
      { label: 'Favorites / saved components', done: false },
      { label: 'Visual preview of component (screenshot)', done: false },
      { label: 'Related components on component page', done: false },
    ],
  },
  {
    id: 'phase-2b',
    title: 'Phase 2b — Social Graph',
    subtitle: 'Follow creators, curate your feed.',
    status: 'upcoming',
    items: [
      { label: 'Follow / unfollow users', done: false },
      { label: 'Followers & following counts on profile', done: false },
      { label: 'Saved components list', done: false },
      { label: 'Following feed — components from people you follow', done: false },
      { label: 'Privacy enforcement — private profiles hidden from browse', done: false },
    ],
  },
  {
    id: 'phase-3',
    title: 'Phase 3 — Pro Plan',
    subtitle: 'Unlimited everything for power users.',
    status: 'done',
    items: [
      { label: 'Stripe checkout — monthly / yearly billing', done: true },
      { label: 'Webhook: plan activated on payment, revoked on cancellation', done: true },
      { label: 'Pro plan: unlimited stored components', done: true },
      { label: 'Upgrade prompt when free limit is reached (dashboard banner)', done: true },
      { label: 'Customer billing portal', done: true },
    ],
  },
  {
    id: 'phase-4',
    title: 'Phase 4 — Polish & Growth',
    subtitle: 'Delight creators and drive distribution.',
    status: 'upcoming',
    items: [
      { label: 'Component collections', done: false },
      { label: 'Creator analytics dashboard (copies, views)', done: false },
      { label: 'Embed widget for external sites', done: false },
      { label: 'Public API', done: false },
      { label: 'Changelog page', done: false },
    ],
  },
  {
    id: 'phase-5',
    title: 'Phase 5 — Rewards',
    subtitle: 'Give back to active contributors.',
    status: 'upcoming',
    items: [
      { label: 'Creator badges (milestones: 10, 100, 1k copies)', done: false },
      { label: 'Boosted storage limits for top contributors', done: false },
      { label: 'Featured creator spotlight', done: false },
    ],
  },
  {
    id: 'phase-6',
    title: 'Phase 6 — HTML → Webflow Converter',
    subtitle: 'Far future. Convert HTML/CSS/JS to Webflow JSON.',
    status: 'upcoming',
    items: [
      { label: '/convert page with HTML · CSS · JS tabs', done: false },
      { label: 'HTML+CSS → XscpData engine', done: false },
      { label: 'One-click export to Webflow Designer', done: false },
    ],
  },
];

const statusConfig = {
  done: {
    badge: 'Shipped',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ring: 'border-emerald-200',
  },
  'in-progress': {
    badge: 'In progress',
    badgeClass: 'bg-accent-bg text-accent border border-accent/20',
    ring: 'border-accent/30',
  },
  upcoming: {
    badge: 'Upcoming',
    badgeClass: 'bg-surface text-ink-3 border border-border',
    ring: 'border-border',
  },
};

export default function RoadmapPage() {
  return (
    <>
      <Header />
      <main className="mx-auto px-[var(--px-site)] py-16" style={{ maxWidth: 'var(--max-width)' }}>
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-bg px-4 py-1.5 text-sm font-medium text-accent mb-5">
            🗺️ You found the roadmap
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-ink leading-tight mb-4">
            What we&apos;re building
          </h1>
          <p className="text-base sm:text-lg text-ink-2 max-w-xl mx-auto">
            This page isn&apos;t linked anywhere — you found it. Here&apos;s everything
            shipped and everything coming to FlowVault.
          </p>
        </div>

        {/* Phases */}
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
          {phases.map((phase) => {
            const cfg = statusConfig[phase.status];
            const doneCount = phase.items.filter((i) => i.done).length;
            const total = phase.items.length;

            return (
              <div
                key={phase.id}
                className={`rounded-xl border bg-white p-6 ${cfg.ring}`}
              >
                {/* Phase header */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="font-heading text-base font-semibold text-ink leading-snug">
                    {phase.title}
                  </h2>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.badgeClass}`}>
                    {cfg.badge}
                  </span>
                </div>
                <p className="text-sm text-ink-3 mb-4">{phase.subtitle}</p>

                {/* Progress bar (only for done/in-progress phases with mixed items) */}
                {phase.status !== 'upcoming' && (
                  <div className="mb-4">
                    <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${(doneCount / total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-3 mt-1.5">{doneCount}/{total} shipped</p>
                  </div>
                )}

                {/* Items */}
                <ul className="space-y-2">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      {item.done ? (
                        <span className="mt-0.5 shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      ) : (
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 border-border" />
                      )}
                      <span className={`text-sm leading-snug ${item.done ? 'text-ink' : 'text-ink-3'}`}>
                        {item.label}
                        {item.note && (
                          <span className="ml-1.5 text-xs text-ink-3 italic">{item.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-ink-3 mt-12">
          Built in public by{' '}
          <a href="https://clement-seguin.fr" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-2 transition-colors">
            @clembuild
          </a>
          {' '}— roadmap subject to change as we learn.
        </p>
      </main>
      <Footer />
    </>
  );
}
