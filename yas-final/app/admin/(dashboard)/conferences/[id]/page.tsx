import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Conference, ConferenceSpeaker } from "@/types/database";
import { updateConferenceAction } from "@/lib/actions/conferences";
import { ConferenceForm } from "@/components/admin/conference-form";
import { ConferenceSpeakerManager } from "@/components/admin/conference-speaker-manager";
import { ConferenceProgrammeEditor } from "@/components/admin/conference-programme-editor";
import { createClient } from "@/lib/supabase/server";

export default async function EditConferencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conference = await getContentById<Conference>("conferences", id);
  if (!conference) notFound();

  const supabase = await createClient();
  const { data: speakers } = await supabase
    .from("conference_speakers")
    .select("*")
    .eq("conference_id", id)
    .order("order_index", { ascending: true })
    .returns<ConferenceSpeaker[]>();

  const boundAction = updateConferenceAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Conferences</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {conference.title}</h1>

      <div className="mb-14">
        <ConferenceForm conference={conference} action={boundAction} />
      </div>

      <div className="mb-14 max-w-[720px] border-t border-hairline pt-10">
        <h2 className="mb-2 font-serif text-xl text-navy-deep">Programme</h2>
        <p className="mb-6 text-sm text-ink-soft">
          The schedule shown on the public conference page — add sessions in the order they run.
        </p>
        <ConferenceProgrammeEditor conferenceId={id} initialSessions={conference.programme ?? []} />
      </div>

      <div className="max-w-[720px] border-t border-hairline pt-10">
        <h2 className="mb-6 font-serif text-xl text-navy-deep">Speakers</h2>
        <ConferenceSpeakerManager conferenceId={id} speakers={speakers ?? []} />
      </div>
    </div>
  );
}
