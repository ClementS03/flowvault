'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { updatePrivacy } from '@/app/actions/updatePrivacy';

interface PrivacyToggleProps {
  initialIsPrivate: boolean;
}

export default function PrivacyToggle({ initialIsPrivate }: PrivacyToggleProps) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !isPrivate;
    setIsPrivate(next);
    startTransition(async () => {
      const result = await updatePrivacy(next);
      if ('error' in result) {
        setIsPrivate(!next); // revert optimistic update
        toast.error(result.error);
      } else {
        toast.success(next ? 'Profile set to private' : 'Profile set to public');
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Private profile</p>
        <p className="text-xs text-ink-3 mt-0.5">
          Hide your profile page from other users. Your public component links still work.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPrivate}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 cursor-pointer ${
          isPrivate ? 'bg-accent' : 'bg-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
            isPrivate ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
