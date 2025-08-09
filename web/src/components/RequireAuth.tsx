"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    client.auth.getSession().then(({ data }) => {
      const authed = Boolean(data.session);
      setIsAuthed(authed);
      setReady(true);
      if (!authed) {
        const next = encodeURIComponent(pathname || "/");
        router.replace(`/login?next=${next}`);
      }
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => {
      const authed = Boolean(session);
      setIsAuthed(authed);
      if (!authed) {
        const next = encodeURIComponent(pathname || "/");
        router.replace(`/login?next=${next}`);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) return null;
  if (!isAuthed) return null;
  return <>{children}</>;
}


