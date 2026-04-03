'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { updateProfile } from '@/app/actions/updateProfile';
import AvatarUpload from '@/components/AvatarUpload';
import PrivacyToggle from '@/components/PrivacyToggle';

interface SettingsFormProps {
  userId: string;
  email: string;
  plan: string;
  initialDisplayName: string;
  initialUsername: string;
  initialBio: string;
  initialWebsite: string;
  avatarUrl: string | null;
  initialIsPrivate: boolean;
}

export default function SettingsForm({
  userId,
  email,
  plan,
  initialDisplayName,
  initialUsername,
  initialBio,
  initialWebsite,
  avatarUrl,
  initialIsPrivate,
}: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  // Live avatar URL — updated immediately after upload without page reload
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [website, setWebsite] = useState(initialWebsite);
  const usernameChanged = username !== initialUsername && initialUsername !== '';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Profile saved!');
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  const initials = (displayName || email).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Profile section */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-semibold text-ink">Profile</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium text-accent hover:text-accent-h transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Avatar upload */}
            <AvatarUpload
              userId={userId}
              avatarUrl={currentAvatarUrl}
              displayName={displayName || email}
              onAvatarChange={setCurrentAvatarUrl}
            />

            {/* Display name */}
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-ink mb-1.5">
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Your name"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1">{displayName.length} / 50</p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                maxLength={30}
                placeholder="your-username"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1">
                flowvault.io/u/{username || 'your-username'}
              </p>
              {usernameChanged && (
                <p className="text-xs text-amber-600 mt-1">
                  Changing your username will break existing links to your profile.
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-ink mb-1.5">
                Bio <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="Tell the community about yourself…"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors resize-none"
              />
              <p className="text-xs text-ink-3 mt-1">{bio.length} / 160</p>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-ink mb-1.5">
                Website <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                id="website"
                name="website"
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDisplayName(initialDisplayName);
                  setUsername(initialUsername);
                  setBio(initialBio);
                  setWebsite(initialWebsite);
                  setIsEditing(false);
                }}
                className="text-sm font-medium text-ink-2 hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {/* Avatar preview — uses live currentAvatarUrl */}
              {currentAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatarUrl}
                  alt={displayName || email}
                  className="w-16 h-16 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-bg flex items-center justify-center text-accent font-heading font-bold text-xl">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-medium text-ink">
                  {displayName || <span className="text-ink-3">No display name set</span>}
                </p>
                {username && (
                  <p className="text-sm text-ink-3 mt-0.5">@{username}</p>
                )}
              </div>
            </div>

            {bio && (
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-1">Bio</p>
                <p className="text-sm text-ink-2">{bio}</p>
              </div>
            )}

            {website && (
              <div>
                <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-1">Website</p>
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:text-accent-h transition-colors"
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            {!username && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Set a username to get your public profile at{' '}
                <span className="font-medium">flowvault.io/u/your-username</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Account section */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="font-heading font-semibold text-ink mb-6">Account</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Email</span>
            <span className="text-sm text-ink font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Plan</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink capitalize">{plan}</span>
              {plan === 'free' && (
                <a
                  href="/pricing"
                  className="text-xs text-accent hover:text-accent-h font-medium transition-colors"
                >
                  Upgrade →
                </a>
              )}
            </div>
          </div>

          {/* Privacy toggle */}
          <div className="pt-2 border-t border-border">
            <PrivacyToggle initialIsPrivate={initialIsPrivate} />
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-ink-2 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
