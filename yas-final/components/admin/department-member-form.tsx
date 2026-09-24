"use client";

import { useActionState } from "react";
import type { Edition, Profile, Department, DepartmentMember } from "@/types/database";
import { TextField, SelectField, FormActions } from "@/components/admin/form-fields";
import type { DepartmentMemberFormState } from "@/lib/actions/department-members";

export function DepartmentMemberForm({
  member,
  editions,
  profiles,
  departments,
  lockedDepartment,
  action,
}: {
  member?: DepartmentMember;
  editions: Edition[];
  profiles: Profile[];
  departments: Department[];
  /**
   * When set, the viewer is a department_admin: the department is fixed
   * to their own and not selectable — the server action ignores any
   * submitted department_id for this role and always uses the
   * authenticated admin's own department (see
   * lib/auth/department-scope.ts's resolveWriteDepartmentId).
   */
  lockedDepartment?: { id: string; name: string } | null;
  action: (prev: DepartmentMemberFormState, formData: FormData) => Promise<DepartmentMemberFormState>;
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
        defaultValue={member?.profile_id ?? ""}
        error={state.fieldErrors?.profile_id}
        options={[
          { label: profiles.length ? "Select a person" : "No people yet — add one first", value: "" },
          ...profiles.map((p) => ({ label: p.full_name, value: p.id })),
        ]}
      />
      <SelectField
        label="Edition"
        name="edition_id"
        defaultValue={member?.edition_id ?? ""}
        error={state.fieldErrors?.edition_id}
        options={[
          { label: editions.length ? "Select an edition" : "No editions yet — add one first", value: "" },
          ...editions.map((e) => ({ label: e.label + (e.is_current ? " (current)" : ""), value: e.id })),
        ]}
      />
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
          defaultValue={member?.department_id ?? ""}
          error={state.fieldErrors?.department_id}
          options={[
            { label: "Select a department", value: "" },
            ...departments.map((d) => ({ label: d.name, value: d.id })),
          ]}
        />
      )}
      <TextField
        label="Title (optional)"
        name="title"
        defaultValue={member?.title ?? ""}
        placeholder="Associate, Volunteer, Coordinator..."
      />
      <TextField label="Order" name="order_index" type="number" defaultValue={member?.order_index ?? 0} />

      <FormActions isPending={isPending} cancelHref="/admin/department-members" />
    </form>
  );
}
