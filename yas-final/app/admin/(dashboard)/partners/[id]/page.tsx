import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Partner } from "@/types/database";
import { updatePartnerAction } from "@/lib/actions/partners";
import { PartnerForm } from "@/components/admin/partner-form";

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await getContentById<Partner>("partners", id);
  if (!partner) notFound();

  const boundAction = updatePartnerAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Partners</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {partner.name}</h1>
      <PartnerForm partner={partner} action={boundAction} />
    </div>
  );
}
