"use client";

import { useActionState } from "react";
import type { Announcement } from "@/types/database";
import { utcIsoToNairobiLocal } from "@/lib/time/nairobi";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import type { GenericFormState } from "@/lib/actions/make-content-actions";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export function AnnouncementForm({
  announcement,
  action,
  departments = [],
  canNotify = false,
}: {
  announcement?: Announcement;
  departments?: { id: string; name: string }[];
  /** Only administrators may email subscribers. */
  canNotify?: boolean;
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
      <TextField label="Publish At" name="publish_at" type="datetime-local" defaultValue={utcIsoToNairobiLocal(announcement?.publish_at)} error={state.fieldErrors?.publish_at} hint="Nairobi time (EAT). Leave blank to publish immediately once status is set to Published." />
      <TextField label="Expires At" name="expires_at" type="datetime-local" defaultValue={utcIsoToNairobiLocal(announcement?.expires_at)} error={state.fieldErrors?.expires_at} hint="Nairobi time (EAT). The announcement disappears from the public site after this time; the record is kept." />
      <SelectField
        label="Department"
        name="department_id"
        defaultValue={announcement?.department_id ?? ""}
        error={state.fieldErrors?.department_id}
        hint="Global announcements appear on the homepage. A department announcement appears only on that department's page."
        options={[{ label: "Global (homepage)", value: "" }, ...departments.map((d) => ({ label: d.name, value: d.id }))]}
      />
      <SelectField label="Status" name="status" defaultValue={announcement?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured (shown in ticker)" name="featured" defaultChecked={announcement?.featured} />
      <CheckboxField
        label={announcement?.notified_at ? "Email subscribers (already sent)" : "Email confirmed subscribers when published"}
        name="notify_subscribers"
        defaultChecked={announcement?.notify_subscribers}
        disabled={!canNotify || Boolean(announcement?.notified_at)}
      />
      {!canNotify && (
        <p className="-mt-4 mb-6 text-xs text-ink-soft/70">Only administrators can email subscribers.</p>
      )}
      {canNotify && !announcement?.notified_at && (
        <p className="-mt-4 mb-6 text-xs text-ink-soft/70">
          Off by default. When ticked and the announcement is Published and live, it is emailed once to subscribers who confirmed their address and have not unsubscribed.
        </p>
      )}
      <TextField label="Order" name="order_index" type="number" defaultValue={announcement?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/announcements" />
    </form>
  );
}
