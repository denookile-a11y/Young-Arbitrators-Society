"use client";

import { useActionState } from "react";
import type { Edition, Profile, Department, LeadershipRole } from "@/types/database";
import { TextField, SelectField, CheckboxField, FormActions } from "@/components/admin/form-fields";
import type { LeadershipRoleFormState } from "@/lib/actions/leadership";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export function LeadershipRoleForm({
  role,
  editions,
  profiles,
  departments,
  lockedDepartment,
  action,
}: {
  role?: LeadershipRole;
  editions: Edition[];
  profiles: Profile[];
  departments: Department[];
  /**
   * When set, the viewer is a department_admin: the department is fixed to
   * their own and not selectable, matching the server action which
   * ignores any submitted department_id for this role and always uses
   * the authenticated admin's own department (see
   * lib/auth/department-scope.ts's resolveWriteDepartmentId). Shown as
   * read-only context, not a disabled-but-spoofable form field.
   */
  lockedDepartment?: { id: string; name: string } | null;
  action: (prev: LeadershipRoleFormState, formData: FormData) => Promise<LeadershipRoleFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-[640px]">
      {state.error && (
        <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <SelectField
        label="Person"
        name="profile_id"
        defaultValue={role?.profile_id ?? ""}
        error={state.fieldErrors?.profile_id}
        options={[
          { label: profiles.length ? "Select a person" : "No people yet — add one first", value: "" },
          ...profiles.map((p) => ({ label: p.full_name, value: p.id })),
        ]}
      />
      <SelectField
        label="Edition"
        name="edition_id"
        defaultValue={role?.edition_id ?? ""}
        error={state.fieldErrors?.edition_id}
        options={[
          { label: editions.length ? "Select an edition" : "No editions yet — add one first", value: "" },
          ...editions.map((e) => ({ label: e.label + (e.is_current ? " (current)" : ""), value: e.id })),
        ]}
      />
      <TextField
        label="Role Title"
        name="role_title"
        defaultValue={role?.role_title}
        error={state.fieldErrors?.role_title}
        placeholder="President, Head of Moot, Deputy..."
      />
      {lockedDepartment ? (
        <div className="mb-5">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Department</span>
          <p className="rounded-[2px] border border-hairline bg-off-white px-3.5 py-2.5 text-sm text-ink-soft">
            {lockedDepartment.name} — fixed to your own department
          </p>
          {/* The server action ignores this value for a department_admin and
              always uses their own department_id, but a hidden field keeps
              the form's shape consistent with the unlocked case. */}
          <input type="hidden" name="department_id" value={lockedDepartment.id} />
        </div>
      ) : (
        <SelectField
          label="Department"
          name="department_id"
          defaultValue={role?.department_id ?? ""}
          options={[
            { label: "None (executive / general role)", value: "" },
            ...departments.map((d) => ({ label: d.name, value: d.id })),
          ]}
        />
      )}
      <CheckboxField
        label="Executive role (President/VP level — shown first in Leadership)"
        name="is_executive"
        defaultChecked={role?.is_executive}
      />
      <SelectField label="Status" name="status" defaultValue={role?.status ?? "draft"} options={STATUS_OPTIONS} />
      <TextField label="Order" name="order_index" type="number" defaultValue={role?.order_index ?? 0} />

      <FormActions isPending={isPending} cancelHref="/admin/leadership" />
    </form>
  );
}
