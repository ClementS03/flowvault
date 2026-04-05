'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { rejectComponent, approveComponent } from '@/app/actions/moderateComponent';

interface Props {
  componentId: string;
  componentName: string;
  status: string | null;
}

export default function ModerationActions({ componentId, componentName, status }: Props) {
  const router = useRouter();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');
  const [sendNotif, setSendNotif] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleReject() {
    if (!reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    setLoading(true);
    const result = await rejectComponent(componentId, reason.trim(), sendNotif);
    setLoading(false);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Component unpublished');
      router.push('/admin');
    }
  }

  async function handleApprove() {
    setLoading(true);
    const result = await approveComponent(componentId);
    setLoading(false);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Component approved and published');
      router.push('/admin');
    }
  }

  if (status === 'pending_review') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => setShowRejectForm(!showRejectForm)}
          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Reject
        </button>
        {showRejectForm && (
          <RejectForm reason={reason} setReason={setReason} sendNotif={sendNotif} setSendNotif={setSendNotif} onSubmit={handleReject} onCancel={() => setShowRejectForm(false)} loading={loading} />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!showRejectForm ? (
        <button
          onClick={() => setShowRejectForm(true)}
          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Unpublish
        </button>
      ) : (
        <RejectForm reason={reason} setReason={setReason} sendNotif={sendNotif} setSendNotif={setSendNotif} onSubmit={handleReject} onCancel={() => setShowRejectForm(false)} loading={loading} />
      )}
    </div>
  );
}

function RejectForm({ reason, setReason, sendNotif, setSendNotif, onSubmit, onCancel, loading }: {
  reason: string;
  setReason: (v: string) => void;
  sendNotif: boolean;
  setSendNotif: (v: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-md bg-bg rounded-2xl shadow-2xl border border-border p-6 flex flex-col gap-4">
        <h3 className="font-heading font-bold text-ink">Unpublish reason</h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. This doesn't appear to be a Webflow component."
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm text-ink bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
        <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
          <input type="checkbox" checked={sendNotif} onChange={(e) => setSendNotif(e.target.checked)} className="rounded" />
          Notify the author by email
        </label>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-ink-2 hover:text-ink transition-colors">Cancel</button>
          <button
            onClick={onSubmit}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Unpublish'}
          </button>
        </div>
      </div>
    </div>
  );
}
