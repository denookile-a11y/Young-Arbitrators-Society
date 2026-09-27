"use client";

import { useActionState } from "react";
import type { Partner } from "@/types/database";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { GenericFormState } from "@/lib/actions/make-content-actions";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const TIER_OPTIONS = [
  { label: "Institutional", value: "institutional" },
  { label: "Sponsor", value: "sponsor" },
  { label: "In-kind", value: "in-kind" },
];

export function PartnerForm({
  partner,
  action,
}: {
  partner?: Partner;
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
      <TextField label="Name" name="name" defaultValue={partner?.name} error={state.fieldErrors?.name} />
      <TextField label="Slug" name="slug" defaultValue={partner?.slug} error={state.fieldErrors?.slug} />
      <TextAreaField label="Description" name="description" defaultValue={partner?.description ?? ""} rows={3} />
      <FileUploadField name="logo_url" label="Logo" bucket="images" defaultValue={partner?.logo_url ?? ""} />
      <TextField label="Website URL" name="website_url" defaultValue={partner?.website_url ?? ""} error={state.fieldErrors?.website_url} placeholder="https://..." />
      <SelectField label="Tier" name="tier" defaultValue={partner?.tier ?? ""} options={[{ label: "Select tier", value: "" }, ...TIER_OPTIONS]} />
      <SelectField label="Status" name="status" defaultValue={partner?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured" name="featured" defaultChecked={partner?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={partner?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/partners" />
    </form>
  );
}
