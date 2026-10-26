"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(true);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={logout} disabled={pending} className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50 ${fullWidth ? "w-full justify-start border-transparent" : ""}`}>
        {pending ? <LoaderCircle size={15} className="animate-spin" /> : <LogOut size={15} />}
        {pending ? "Signing out..." : "Log out"}
      </button>
      {error && <p role="alert" className="px-2 pt-1 text-xs text-destructive">Could not sign out. Please try again.</p>}
    </div>
  );
}
