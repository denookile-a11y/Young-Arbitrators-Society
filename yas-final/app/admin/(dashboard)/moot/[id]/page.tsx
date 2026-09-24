import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Moot, MootDocument } from "@/types/database";
import { updateMootAction } from "@/lib/actions/moot";
import { MootForm } from "@/components/admin/moot-form";
import { MootDocumentManager } from "@/components/admin/moot-document-manager";
import { createClient } from "@/lib/supabase/server";

export default async function EditMootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const moot = await getContentById<Moot>("moots", id);
  if (!moot) notFound();

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("moot_documents")
    .select("*")
    .eq("moot_id", id)
    .order("order_index", { ascending: true })
    .returns<MootDocument[]>();

  const boundAction = updateMootAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Moot</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {moot.title}</h1>

      <div className="mb-14">
        <MootForm moot={moot} action={boundAction} />
      </div>

      <div className="max-w-[720px] border-t border-hairline pt-10">
        <h2 className="mb-6 font-serif text-xl text-navy-deep">Documents</h2>
        <MootDocumentManager mootId={id} documents={documents ?? []} />
      </div>
    </div>
  );
}
