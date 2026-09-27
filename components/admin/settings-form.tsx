"use client";

import { useActionState } from "react";
import { TextField, FormActions } from "@/components/admin/form-fields";
import { updateSiteSettingsAction, type SettingsFormState } from "@/lib/actions/settings";

const initialState: SettingsFormState = {};

export function SettingsForm({
  defaults,
}: {
  defaults: { site_title: string; contact_email: string; instagram_handle: string; linkedin_url: string };
}) {
  const [state, formAction, isPending] = useActionState(updateSiteSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-[560px]">
      {state.error && (
        <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <TextField label="Site Title" name="site_title" defaultValue={defaults.site_title} />
      <TextField label="Contact Email" name="contact_email" type="email" defaultValue={defaults.contact_email} />
      <TextField label="Instagram Handle" name="instagram_handle" defaultValue={defaults.instagram_handle} />
      <TextField label="LinkedIn URL" name="linkedin_url" defaultValue={defaults.linkedin_url} placeholder="https://linkedin.com/company/..." />
      <FormActions isPending={isPending} cancelHref="/admin" submitLabel="Save Settings" />
    </form>
  );
}
