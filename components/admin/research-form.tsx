"use client";

import { useActionState } from "react";
import type { Research } from "@/types/database";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
  FormActions,
} from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { GenericFormState } from "@/lib/actions/make-content-actions";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const CATEGORY_OPTIONS = [
  { label: "Research Paper", value: "Research Paper" },
  { label: "Case Note", value: "Case Note" },
  { label: "Policy Brief", value: "Policy Brief" },
  { label: "Working Paper", value: "Working Paper" },
  { label: "Op-Ed", value: "Op-Ed" },
];

export function ResearchForm({
  research,
  action,
}: {
  research?: Research;
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

      <TextField label="Title" name="title" defaultValue={research?.title} error={state.fieldErrors?.title} />
      <TextField
        label="Slug"
        name="slug"
        defaultValue={research?.slug}
        error={state.fieldErrors?.slug}
        hint="Used in the URL: /research/[slug]"
      />
      <TextAreaField label="Abstract" name="abstract" defaultValue={research?.abstract ?? ""} rows={5} />
      <TextField
        label="Authors"
        name="authors"
        defaultValue={research?.authors?.join(", ") ?? ""}
        hint="Comma-separated, e.g. Jane Doe, John Smith"
      />
      <SelectField label="Category" name="category" defaultValue={research?.category ?? ""} options={[{ label: "Select category", value: "" }, ...CATEGORY_OPTIONS]} />
      <TextField label="Topic" name="topic" defaultValue={research?.topic ?? ""} />
      <TextField
        label="Tags"
        name="tags"
        defaultValue={research?.tags?.join(", ") ?? ""}
        hint="Comma-separated, e.g. Consumer Law, Arbitration, Kenya"
      />
      <FileUploadField name="pdf_url" label="PDF Document" bucket="documents" defaultValue={research?.pdf_url ?? ""} />
      <FileUploadField name="cover_image_url" label="Cover Image" bucket="images" defaultValue={research?.cover_image_url ?? ""} />
      <TextField label="Published On" name="published_on" type="date" defaultValue={research?.published_on ?? ""} />
      <SelectField label="Status" name="status" defaultValue={research?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured on homepage" name="featured" defaultChecked={research?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={research?.order_index ?? 0} />

      <FormActions isPending={isPending} cancelHref="/admin/research" />
    </form>
  );
}
