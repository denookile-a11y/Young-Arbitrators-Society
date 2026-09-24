import { notFound } from "next/navigation";
import { getContentById } from "@/lib/queries/generic";
import type { Event } from "@/types/database";
import { updateEventAction } from "@/lib/actions/events";
import { EventForm } from "@/components/admin/event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getContentById<Event>("events", id);
  if (!event) notFound();

  const boundAction = updateEventAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Events</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {event.title}</h1>
      <EventForm event={event} action={boundAction} />
    </div>
  );
}
