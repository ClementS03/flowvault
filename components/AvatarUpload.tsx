/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { updateAvatarUrl } from '@/app/actions/updateAvatar';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  onAvatarChange: (url: string | null) => void;
}

export default function AvatarUpload({
  userId,
  avatarUrl,
  displayName,
  onAvatarChange,
}: AvatarUploadProps) {
  const supabase = createClientComponentClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const initials = (displayName || 'U').charAt(0).toUpperCase();

  async function handleFile(file: File) {
    setUploadError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPG, PNG, WebP accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError('File too large. Max 2 MB.');
      return;
    }

    setUploading(true);

    const path = `${userId}/avatar`;

    const { error: storageError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (storageError) {
      setUploadError('Upload failed. Please try again.');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    const result = await updateAvatarUrl(publicUrl);
    setUploading(false);

    if ('error' in result) {
      setUploadError(result.error);
      return;
    }

    onAvatarChange(publicUrl);
    toast.success('Avatar updated');
  }

  async function handleRemove() {
    setUploadError(null);
    const result = await updateAvatarUrl(null);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    onAvatarChange(null);
    toast.success('Avatar removed');
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar with camera overlay on hover */}
      <div
        className="relative flex-shrink-0 group cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <div className="w-16 h-16 rounded-full overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl">
              {initials}
            </div>
          )}
        </div>

        {/* Camera overlay */}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
          </div>
        )}

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <svg
              className="animate-spin w-5 h-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info + buttons */}
      <div className="flex-1">
        <p className="text-xs text-ink-3 mb-2">JPG, PNG or WebP · Max 2 MB</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium text-accent border border-accent rounded-lg px-3 py-1.5 hover:bg-accent-bg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          {avatarUrl && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-ink-3 hover:text-ink transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        {uploadError && (
          <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
