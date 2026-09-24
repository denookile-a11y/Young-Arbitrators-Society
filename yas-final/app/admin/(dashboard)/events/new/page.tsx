import { EventForm } from "@/components/admin/event-form";
import { createEventAction } from "@/lib/actions/events";

export default function NewEventPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Events</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Event</h1>
      <EventForm action={createEventAction} />
    </div>
  );
}
