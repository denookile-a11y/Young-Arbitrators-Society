"use client";

import { useActionState } from "react";
import type { Event } from "@/types/database";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { GenericFormState } from "@/lib/actions/make-content-actions";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function EventForm({
  event,
  action,
}: {
  event?: Event;
  action: (prev: GenericFormState, formData: FormData) => Promise<GenericFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-[640px]">
      {state.error && (
        <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <TextField label="Title" name="title" defaultValue={event?.title} error={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" defaultValue={event?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /events/[slug]" />
      <TextAreaField label="Description" name="description" defaultValue={event?.description ?? ""} rows={4} />
      <TextField label="Starts At" name="starts_at" type="datetime-local" defaultValue={toDatetimeLocal(event?.starts_at)} error={state.fieldErrors?.starts_at} />
      <TextField label="Ends At" name="ends_at" type="datetime-local" defaultValue={toDatetimeLocal(event?.ends_at)} />
      <TextField label="Venue" name="venue" defaultValue={event?.venue ?? ""} placeholder="KU Parklands Campus" />
      <TextField label="Registration URL" name="registration_url" defaultValue={event?.registration_url ?? ""} error={state.fieldErrors?.registration_url} placeholder="https://..." />
      <FileUploadField name="cover_image_url" label="Cover Image" bucket="images" defaultValue={event?.cover_image_url ?? ""} />
      <SelectField label="Status" name="status" defaultValue={event?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured on homepage" name="featured" defaultChecked={event?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={event?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/events" />
    </form>
  );
}
