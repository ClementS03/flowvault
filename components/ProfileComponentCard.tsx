import Link from 'next/link';

interface ProfileComponentCardProps {
  name: string;
  slug: string;
  category: string | null;
  imageUrl: string | null;
  copyCount: number;
}

export default function ProfileComponentCard({
  name,
  slug,
  category,
  imageUrl,
  copyCount,
}: ProfileComponentCardProps) {
  return (
    <Link
      href={`/c/${slug}`}
      className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-surface transition-colors group"
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-surface border border-border flex-shrink-0 overflow-hidden group-hover:border-accent/30 transition-colors">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-ink-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-ink text-sm truncate group-hover:text-accent transition-colors">{name}</span>
          {category && (
            <span className="text-xs text-accent bg-accent-bg px-2 py-0.5 rounded-full">{category}</span>
          )}
        </div>
        <p className="text-xs text-ink-3 mt-0.5">
          {copyCount} {copyCount === 1 ? 'copy' : 'copies'}
        </p>
      </div>

      {/* Arrow */}
      <span className="text-ink-3 group-hover:text-accent transition-colors text-sm flex-shrink-0">→</span>
    </Link>
  );
}
