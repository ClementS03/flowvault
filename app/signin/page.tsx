"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Provider } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import config from "@/config";

export default function Login() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const handleSignup = async (
    e: any,
    options: { type: string; provider?: Provider }
  ) => {
    e?.preventDefault();
    setIsLoading(true);
    try {
      const { type, provider } = options;
      const redirectURL = window.location.origin + "/api/auth/callback";

      if (type === "oauth") {
        await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: redirectURL },
        });
      } else if (type === "magic_link") {
        await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectURL },
        });
        toast.success("Check your emails!");
        setIsDisabled(true);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h1 className="font-heading text-2xl font-bold text-ink mb-1">
                Welcome to {config.appName}
              </h1>
              <p className="text-sm text-ink-2">Sign in or create your account</p>
            </div>

            {/* Google */}
            <button
              onClick={(e) => handleSignup(e, { type: "oauth", provider: "google" })}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-bg hover:bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin text-ink-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-ink-3 font-medium">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Magic link form */}
            <form
              onSubmit={(e) => handleSignup(e, { type: "magic_link" })}
              className="flex flex-col gap-4"
            >
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  required
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || isDisabled}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-h text-white font-medium px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {isLoading && (
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isDisabled ? "Email sent — check your inbox" : "Send Magic Link"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-ink-3">
              By continuing, you agree to our{" "}
              <a href="/tos" className="underline hover:text-ink-2">Terms</a>{" "}
              and{" "}
              <a href="/privacy-policy" className="underline hover:text-ink-2">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
