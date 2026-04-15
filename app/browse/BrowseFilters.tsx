'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const TABS = [
  { value: 'components', label: 'Components' },
  { value: 'pages', label: 'Pages' },
  { value: 'kits', label: 'Kits' },
];

const COMPONENT_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'hero', label: 'Hero' },
  { value: 'navbar', label: 'Navbar' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'footer', label: 'Footer' },
  { value: 'feature', label: 'Feature' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const PAGE_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'landing', label: 'Landing' },
  { value: 'pricing-page', label: 'Pricing page' },
  { value: 'blog', label: 'Blog' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'saas', label: 'SaaS' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
];

export default function BrowseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'components';
  const activeCategory = searchParams.get('category') ?? '';
  const activeTag = searchParams.get('tag') ?? '';

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/browse?${params.toString()}`);
    },
    [router, searchParams]
  );

  const switchTab = useCallback(
    (tab: string) => {
      router.push(`/browse?tab=${tab}`);
    },
    [router]
  );

  const categories = activeTab === 'pages' ? PAGE_CATEGORIES : COMPONENT_CATEGORIES;
  const showCategoryFilter = activeTab !== 'kits';

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Tab pills */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => switchTab(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.value
                ? 'bg-ink text-white'
                : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category + tag filters — hidden on Kits tab */}
      {showCategoryFilter && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => updateParam('category', c.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === c.value
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border text-ink-2 hover:border-accent/40 hover:text-ink'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative sm:ml-auto w-full sm:w-56 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <input
              type="text"
              placeholder="Filter by tag…"
              defaultValue={activeTag}
              className="w-full rounded-full border border-border bg-surface pl-9 pr-4 py-1.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateParam('tag', (e.target as HTMLInputElement).value.trim());
                }
              }}
              onBlur={(e) => updateParam('tag', e.target.value.trim())}
            />
            {activeTag && (
              <button
                onClick={() => updateParam('tag', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                aria-label="Clear tag filter"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
