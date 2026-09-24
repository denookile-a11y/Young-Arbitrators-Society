import { ResearchForm } from "@/components/admin/research-form";
import { createResearchAction } from "@/lib/actions/research";

export default function NewResearchPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Research</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Research Entry</h1>
      <ResearchForm action={createResearchAction} />
    </div>
  );
}
