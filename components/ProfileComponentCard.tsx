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
      className="group rounded-xl border border-border bg-surface overflow-hidden hover:border-accent/30 hover:shadow-sm transition-all"
    >
      {/* Thumbnail — 80px tall */}
      <div className="h-20 bg-accent-bg overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-accent/40"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm text-ink truncate group-hover:text-accent transition-colors mb-1.5">
          {name}
        </p>
        <div className="flex items-center gap-2">
          {category && (
            <span className="text-xs text-accent bg-accent-bg px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
          <span className="text-xs text-ink-3 ml-auto">
            {copyCount} {copyCount === 1 ? 'copy' : 'copies'}
          </span>
        </div>
      </div>
    </Link>
  );
}
