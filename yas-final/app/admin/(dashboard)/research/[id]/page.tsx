import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Research } from "@/types/database";
import { updateResearchAction } from "@/lib/actions/research";
import { ResearchForm } from "@/components/admin/research-form";

export default async function EditResearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const research = await getContentById<Research>("research", id);
  if (!research) notFound();

  const boundAction = updateResearchAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Research</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {research.title}</h1>
      <ResearchForm research={research} action={boundAction} />
    </div>
  );
}
