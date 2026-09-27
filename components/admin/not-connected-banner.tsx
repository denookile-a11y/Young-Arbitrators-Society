export function NotConnectedBanner() {
  return (
    <div className="mb-8 rounded-[2px] border border-gold/40 bg-gold/10 px-6 py-5">
      <p className="text-sm font-semibold text-navy-deep">
        No Supabase project connected yet
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        This page is wired to real queries against the schema in{" "}
        <code className="text-ink">supabase/migrations/</code>, but{" "}
        <code className="text-ink">.env.local</code> doesn&apos;t have real
        project credentials yet. Copy{" "}
        <code className="text-ink">.env.local.example</code>, fill in your
        project&apos;s URL and anon key, run the migrations, then reload —
        this banner disappears once data starts flowing.
      </p>
    </div>
  );
}
