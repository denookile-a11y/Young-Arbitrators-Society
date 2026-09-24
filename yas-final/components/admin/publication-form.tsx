"use client";

import { useActionState } from "react";
import type { Publication, Department } from "@/types/database";
import { TextField, TextAreaField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { GenericFormState } from "@/lib/actions/make-content-actions";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const CATEGORY_OPTIONS = [
  { label: "News", value: "News" },
  { label: "Insight", value: "Insight" },
  { label: "Announcement", value: "Announcement" },
  { label: "Opinion", value: "Opinion" },
];

export function PublicationForm({
  publication,
  departments,
  lockedDepartment,
  action,
}: {
  publication?: Publication;
  departments: Department[];
  /**
   * When set, the viewer is a department_admin: the department is fixed
   * to their own and not selectable — the server action ignores any
   * submitted department_id for this role and always uses the
   * authenticated admin's own department (see
   * lib/auth/department-scope.ts's resolveWriteDepartmentId).
   */
  lockedDepartment?: { id: string; name: string } | null;
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
      <TextField label="Title" name="title" defaultValue={publication?.title} error={state.fieldErrors?.title} />
      <TextField label="Slug" name="slug" defaultValue={publication?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /publications/[slug]" />
      <TextAreaField label="Excerpt" name="excerpt" defaultValue={publication?.excerpt ?? ""} rows={3} />
      <TextAreaField label="Body" name="body" defaultValue={publication?.body ?? ""} rows={8} />
      <SelectField label="Category" name="category" defaultValue={publication?.category ?? ""} options={[{ label: "Select category", value: "" }, ...CATEGORY_OPTIONS]} />
      {lockedDepartment ? (
        <div className="mb-5">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Department</span>
          <p className="rounded-[2px] border border-hairline bg-off-white px-3.5 py-2.5 text-sm text-ink-soft">
            {lockedDepartment.name} — fixed to your own department
          </p>
          <input type="hidden" name="department_id" value={lockedDepartment.id} />
        </div>
      ) : (
        <SelectField
          label="Department"
          name="department_id"
          defaultValue={publication?.department_id ?? ""}
          options={[
            { label: "None (cross-departmental)", value: "" },
            ...departments.map((d) => ({ label: d.name, value: d.id })),
          ]}
        />
      )}
      <TextField label="Published On" name="published_on" type="date" defaultValue={publication?.published_on ?? ""} />
      <FileUploadField name="cover_image_url" label="Cover Image" bucket="images" defaultValue={publication?.cover_image_url ?? ""} />
      <SelectField label="Status" name="status" defaultValue={publication?.status ?? "draft"} options={STATUS_OPTIONS} />
      <CheckboxField label="Featured on homepage" name="featured" defaultChecked={publication?.featured} />
      <TextField label="Order" name="order_index" type="number" defaultValue={publication?.order_index ?? 0} />
      <FormActions isPending={isPending} cancelHref="/admin/publications" />
    </form>
  );
}
