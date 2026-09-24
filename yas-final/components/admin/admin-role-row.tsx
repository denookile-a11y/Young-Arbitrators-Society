"use client";

import { useTransition } from "react";
import type { Admin, AdminRole } from "@/types/database";
import { updateAdminRoleAction, deactivateAdminAction } from "@/lib/actions/settings";

export function AdminRoleRow({ admin, isSelf }: { admin: Admin; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-[1fr_180px_auto] items-center gap-6 border-b border-hairline py-4">
      <div>
        <div className="text-sm font-semibold text-ink">{admin.full_name}</div>
        {!admin.is_active && <div className="text-xs text-red-600">Deactivated</div>}
      </div>
      <select
        defaultValue={admin.role}
        disabled={isPending || isSelf}
        onChange={(e) => {
          const newRole = e.target.value as AdminRole;
          startTransition(() => updateAdminRoleAction(admin.id, newRole));
        }}
        className="w-full rounded-[2px] border border-hairline bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
      >
        <option value="super_admin">Super Admin</option>
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="department_admin">Department Admin</option>
      </select>
      {admin.is_active && !isSelf ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deactivateAdminAction(admin.id))}
          className="rounded-[2px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-400 disabled:opacity-60"
        >
          Deactivate
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
