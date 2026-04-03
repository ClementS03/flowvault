/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import config from "@/config";

// A simple button to sign in with our providers (Google & Magic Links).
// It automatically redirects user to callbackUrl (config.auth.callbackUrl) after login, which is normally a private page for users to manage their accounts.
// If the user is already logged in, it will show their profile picture & redirect them to callbackUrl immediately.
const ButtonSignin = ({
  text = "Get started",
  extraStyle,
}: {
  text?: string;
  extraStyle?: string;
}) => {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();

      setUser(data.user);
    };

    getUser();
  }, [supabase]);

  if (user) {
    const fullName = user?.user_metadata?.name || "";
    const firstName = fullName.split(" ")[0] || user?.email?.split("@")[0] || "Account";

    return (
      <Link
        href={config.auth.callbackUrl}
        className={`flex items-center gap-2 ${extraStyle ? extraStyle : ""}`}
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user?.user_metadata?.avatar_url}
            alt={firstName}
            className="w-6 h-6 rounded-full shrink-0"
            referrerPolicy="no-referrer"
            width={24}
            height={24}
          />
        ) : (
          <span className="w-6 h-6 bg-accent-bg text-accent text-xs font-medium flex items-center justify-center rounded-full shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-medium text-ink truncate max-w-[100px]">{firstName}</span>
      </Link>
    );
  }

  return (
    <Link
      className={`btn ${extraStyle ? extraStyle : ""}`}
      href={config.auth.loginUrl}
    >
      {text}
    </Link>
  );
};

export default ButtonSignin;
