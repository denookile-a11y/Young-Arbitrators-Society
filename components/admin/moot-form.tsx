"use client";

import { useActionState } from "react";
import type { Moot } from "@/types/database";
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

export function MootForm({
  moot,
  action,
}: {
  moot?: Moot;
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
      <TextField label="Title" name="title" defaultValue={moot?.title} error={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" defaultValue={moot?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /moot/[slug]" />
      <TextField label="Year" name="year" type="number" defaultValue={moot?.year} error={state.fieldErrors?.year} />
      <TextField label="Theme" name="theme" defaultValue={moot?.theme ?? ""} />
      <TextAreaField label="Description" name="description" defaultValue={moot?.description ?? ""} rows={4} />
      <TextAreaField label="Problem Summary" name="problem_summary" defaultValue={moot?.problem_summary ?? ""} rows={4} />
      <TextField label="Registration Opens At" name="registration_opens_at" type="datetime-local" defaultValue={toDatetimeLocal(moot?.registration_opens_at)} />
      <TextField label="Competition Starts At" name="competition_starts_at" type="datetime-local" defaultValue={toDatetimeLocal(moot?.competition_starts_at)} />
      <TextField label="Winning Team" name="winning_team" defaultValue={moot?.winning_team ?? ""} hint="Fill in once results are final." />
      <SelectField label="Status" name="status" defaultValue={moot?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured on homepage" name="featured" defaultChecked={moot?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={moot?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/moot" />
    </form>
  );
}
