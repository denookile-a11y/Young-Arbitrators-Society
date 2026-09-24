"use client";

import { useActionState } from "react";
import { TextField, FormActions } from "@/components/admin/form-fields";
import { createEditionAction, type EditionFormState } from "@/lib/actions/leadership";

const initialState: EditionFormState = {};

export default function NewEditionPage() {
  const [state, formAction, isPending] = useActionState(createEditionAction, initialState);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Leadership</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Edition</h1>
      <form action={formAction} className="max-w-[640px]">
        {state.error && (
          <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.error}
          </p>
        )}
        <TextField
          label="Label"
          name="label"
          placeholder="2026/27"
          error={state.fieldErrors?.label}
          hint="The institutional container this administration's leadership, members, and department assignments belong to."
        />
        <TextField
          label="Starts On"
          name="starts_on"
          type="date"
          error={state.fieldErrors?.starts_on}
        />
        <p className="mb-6 rounded-[2px] border border-hairline bg-off-white px-4 py-3 text-xs text-ink-soft">
          New editions are created as not-current by default. Set it as
          current from the Leadership page once its roles are assigned, so
          the public site never shows a half-populated administration.
        </p>
        <FormActions isPending={isPending} cancelHref="/admin/leadership" submitLabel="Create Edition" />
      </form>
    </div>
  );
}
