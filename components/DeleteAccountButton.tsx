'use client';

import { useState } from 'react';
import { deleteAccount } from '@/app/actions/deleteAccount';

export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 font-medium px-4 py-2 text-sm transition-colors"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-red-900">
        Are you sure? This will permanently delete all your components, data, and cancel your subscription.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Yes, delete everything'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-border bg-white text-ink font-medium px-4 py-2 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
