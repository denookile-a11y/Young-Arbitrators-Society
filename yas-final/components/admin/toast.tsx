/**
 * Deliberately simple: Server Actions redirect with a `?toast=` query param
 * on success, and this component reads it once on mount and clears the URL.
 * Avoids pulling in a toast library for one feature; the visual is still a
 * real premium toast, not a browser alert().
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function Toast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const toast = searchParams.get("toast");
    if (toast) {
      // Intentional: this effect exists specifically to read a one-time
      // signal from an external system (the URL) on mount/navigation and
      // then immediately clear it — not to derive render state from props.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(toast);
      const params = new URLSearchParams(searchParams);
      params.delete("toast");
      const next = params.toString();
      router.replace(next ? `?${next}` : window.location.pathname, { scroll: false });
      const timer = setTimeout(() => setMessage(null), 3500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] rounded-[2px] bg-navy-deep px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(10,26,60,0.25)]">
      {message}
    </div>
  );
}
