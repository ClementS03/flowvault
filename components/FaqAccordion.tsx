'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. Cancel from your billing portal and you keep Pro access until the end of the billing period. No questions asked.',
  },
  {
    q: 'What happens to my components if I downgrade?',
    a: "All your existing components stay safe. You just can't upload new ones beyond the 10-component free limit until you upgrade again.",
  },
  {
    q: 'Is there a free trial?',
    a: 'The free plan is your trial — no time limit, no credit card required. Upgrade when you need unlimited storage.',
  },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-xl mx-auto mt-16">
      <h2 className="font-heading font-semibold text-xl text-ink text-center mb-8">
        Common questions
      </h2>
      <div className="divide-y divide-border">
        {FAQS.map(({ q, a }, i) => (
          <div key={q}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
            >
              <span className="font-medium text-ink text-sm group-hover:text-accent transition-colors">
                {q}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 text-ink-3 shrink-0 transition-transform duration-300 ${
                  open === i ? 'rotate-180 text-accent' : ''
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                open === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <p className="pb-5 text-sm text-ink-2 leading-relaxed">{a}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
