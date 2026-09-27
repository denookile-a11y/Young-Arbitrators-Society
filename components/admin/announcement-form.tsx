"use client";

import { useActionState } from "react";
import type { Announcement } from "@/types/database";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
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

export function AnnouncementForm({
  announcement,
  action,
}: {
  announcement?: Announcement;
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
      <TextField label="Title" name="title" defaultValue={announcement?.title} error={state.fieldErrors?.title} hint="Shown in the homepage ticker." />
      <TextField label="Slug" name="slug" defaultValue={announcement?.slug} error={state.fieldErrors?.slug} />
      <TextAreaField label="Body" name="body" defaultValue={announcement?.body ?? ""} rows={3} />
      <TextField label="Category Tag" name="category" defaultValue={announcement?.category ?? ""} placeholder="Moot, Research, Leadership..." />
      <TextField label="Publish At" name="publish_at" type="datetime-local" defaultValue={toDatetimeLocal(announcement?.publish_at)} hint="Leave blank to publish immediately once status is set to Published." />
      <TextField label="Expires At" name="expires_at" type="datetime-local" defaultValue={toDatetimeLocal(announcement?.expires_at)} hint="Automatically drops from the ticker after this time, without deleting the record." />
      <SelectField label="Status" name="status" defaultValue={announcement?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured (shown in ticker)" name="featured" defaultChecked={announcement?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={announcement?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/announcements" />
    </form>
  );
}
