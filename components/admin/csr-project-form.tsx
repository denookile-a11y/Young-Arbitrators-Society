"use client";

import { useActionState } from "react";
import type { CsrProject } from "@/types/database";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { GenericFormState } from "@/lib/actions/make-content-actions";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export function CsrProjectForm({
  project,
  action,
}: {
  project?: CsrProject;
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
      <TextField label="Title" name="title" defaultValue={project?.title} error={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" defaultValue={project?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /csr/[slug]" />
      <TextAreaField label="Description" name="description" defaultValue={project?.description ?? ""} rows={4} />
      <TextField label="Location" name="location" defaultValue={project?.location ?? ""} placeholder="Kirinyaga County" />
      <TextField label="Partner Organisation" name="partner_org" defaultValue={project?.partner_org ?? ""} placeholder="Elimu Legal Aid Clinic" />
      <FileUploadField name="cover_image_url" label="Cover Image" bucket="images" defaultValue={project?.cover_image_url ?? ""} />
      <SelectField label="Status" name="status" defaultValue={project?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured" name="featured" defaultChecked={project?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={project?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/csr" />
    </form>
  );
}
