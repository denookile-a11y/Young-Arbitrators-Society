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
      {state.success && (
        <p role="status" className="mb-6 rounded-[2px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Settings saved. The public site now shows the new values.
        </p>
      )}
      <TextField label="Site Title" name="site_title" defaultValue={defaults.site_title} error={state.fieldErrors?.site_title} hint="Stored for future use; not currently shown on the public site." />
      <TextField label="Contact Email" name="contact_email" type="email" defaultValue={defaults.contact_email} error={state.fieldErrors?.contact_email} />
      <TextField label="Instagram Handle" name="instagram_handle" defaultValue={defaults.instagram_handle} error={state.fieldErrors?.instagram_handle} hint="Leave empty to hide it from the site." />
      <TextField label="LinkedIn URL" name="linkedin_url" defaultValue={defaults.linkedin_url} error={state.fieldErrors?.linkedin_url} hint="Leave empty to hide it from the site." placeholder="https://linkedin.com/company/..." />
      <FormActions isPending={isPending} cancelHref="/admin" submitLabel="Save Settings" />
    </form>
  );
}
