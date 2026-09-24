"use client";

import { useActionState } from "react";
import type { Conference } from "@/types/database";
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

export function ConferenceForm({
  conference,
  action,
}: {
  conference?: Conference;
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
      <TextField label="Title" name="title" defaultValue={conference?.title} error={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" defaultValue={conference?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /conferences/[slug]" />
      <TextField label="Theme" name="theme" defaultValue={conference?.theme ?? ""} />
      <TextAreaField label="Description" name="description" defaultValue={conference?.description ?? ""} rows={4} />
      <TextField label="Starts At" name="starts_at" type="datetime-local" defaultValue={toDatetimeLocal(conference?.starts_at)} error={state.fieldErrors?.starts_at} />
      <TextField label="Ends At" name="ends_at" type="datetime-local" defaultValue={toDatetimeLocal(conference?.ends_at)} />
      <TextField label="Venue" name="venue" defaultValue={conference?.venue ?? ""} placeholder="Nairobi" />
      <TextField label="Registration URL" name="registration_url" defaultValue={conference?.registration_url ?? ""} error={state.fieldErrors?.registration_url} placeholder="https://..." />
      <FileUploadField name="report_url" label="Report Document" bucket="documents" defaultValue={conference?.report_url ?? ""} hint="Past edition's report PDF, if any" />
      <FileUploadField name="cover_image_url" label="Cover Image" bucket="images" defaultValue={conference?.cover_image_url ?? ""} />
      <SelectField label="Status" name="status" defaultValue={conference?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured on homepage" name="featured" defaultChecked={conference?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={conference?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/conferences" />
    </form>
  );
}
