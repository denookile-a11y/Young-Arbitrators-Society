import { ConferenceForm } from "@/components/admin/conference-form";
import { createConferenceAction } from "@/lib/actions/conferences";

export default function NewConferencePage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Conferences</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Conference</h1>
      <ConferenceForm action={createConferenceAction} />
    </div>
  );
}
