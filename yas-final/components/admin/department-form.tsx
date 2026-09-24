"use client";

import { useActionState } from "react";
import type { Department } from "@/types/database";
import { TextField, TextAreaField, SelectField, FormActions } from "@/components/admin/form-fields";
import type { DepartmentFormState } from "@/lib/actions/departments";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export function DepartmentForm({
  department,
  action,
}: {
  department?: Department;
  action: (prev: DepartmentFormState, formData: FormData) => Promise<DepartmentFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-[640px]">
      {state.error && (
        <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <TextField
        label="Name"
        name="name"
        defaultValue={department?.name}
        error={state.fieldErrors?.name}
        placeholder="Moot"
      />
      <TextField
        label="Slug"
        name="slug"
        defaultValue={department?.slug}
        error={state.fieldErrors?.slug}
        placeholder="moot"
        hint="Used in the URL: /departments/[slug]"
      />
      <TextField
        label="Tagline"
        name="tagline"
        defaultValue={department?.tagline ?? ""}
        error={state.fieldErrors?.tagline}
        placeholder="Advocacy training through competitive arbitration moots."
      />
      <TextAreaField
        label="Mandate"
        name="mandate"
        defaultValue={department?.mandate ?? ""}
        error={state.fieldErrors?.mandate}
        rows={5}
      />
      <SelectField
        label="Status"
        name="status"
        defaultValue={department?.status ?? "draft"}
        options={STATUS_OPTIONS}
      />
      <TextField
        label="Order"
        name="order_index"
        type="number"
        defaultValue={department?.order_index ?? 0}
        hint="Lower numbers appear first."
      />

      <FormActions isPending={isPending} cancelHref="/admin/departments" />
    </form>
  );
}
