"use client";

import { useActionState } from "react";
import type { Gallery } from "@/types/database";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { GalleryFormState } from "@/lib/actions/gallery";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const CATEGORY_OPTIONS = [
  { label: "Moot", value: "Moot" },
  { label: "Conferences", value: "Conferences" },
  { label: "CSR", value: "CSR" },
  { label: "Events", value: "Events" },
];

export function GalleryForm({
  gallery,
  action,
}: {
  gallery?: Gallery;
  action: (prev: GalleryFormState, formData: FormData) => Promise<GalleryFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-[640px]">
      {state.error && (
        <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <TextField label="Title" name="title" defaultValue={gallery?.title} error={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" defaultValue={gallery?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /gallery/[slug]" />
      <TextAreaField label="Description" name="description" defaultValue={gallery?.description ?? ""} rows={3} />
      <SelectField label="Category" name="category" defaultValue={gallery?.category ?? ""} options={[{ label: "Select category", value: "" }, ...CATEGORY_OPTIONS]} />
      <FileUploadField name="cover_image_url" label="Cover Image" bucket="images" defaultValue={gallery?.cover_image_url ?? ""} />
      <SelectField label="Status" name="status" defaultValue={gallery?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured" name="featured" defaultChecked={gallery?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={gallery?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/gallery" submitLabel={gallery ? "Save" : "Create & Add Photos"} />
    </form>
  );
}
