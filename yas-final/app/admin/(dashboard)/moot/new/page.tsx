import { MootForm } from "@/components/admin/moot-form";
import { createMootAction } from "@/lib/actions/moot";

export default function NewMootPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Moot</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Moot</h1>
      <MootForm action={createMootAction} />
    </div>
  );
}
