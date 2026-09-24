import { PartnerForm } from "@/components/admin/partner-form";
import { createPartnerAction } from "@/lib/actions/partners";

export default function NewPartnerPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Partners</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Partner</h1>
      <PartnerForm action={createPartnerAction} />
    </div>
  );
}
