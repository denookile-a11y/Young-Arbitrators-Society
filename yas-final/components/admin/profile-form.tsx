"use client";

import { useActionState } from "react";
import type { Profile } from "@/types/database";
import { TextField, TextAreaField, SelectField, FormActions } from "@/components/admin/form-fields";
import { FileUploadField } from "@/components/admin/file-upload-field";
import type { ProfileFormState } from "@/lib/actions/profiles";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "In Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

export function ProfileForm({
  profile,
  action,
}: {
  profile?: Profile;
  action: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-[640px]">
      {state.error && (
        <p className="mb-6 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}
      <TextField label="Full Name" name="full_name" defaultValue={profile?.full_name} error={state.fieldErrors?.full_name} />
      <TextField label="Slug" name="slug" defaultValue={profile?.slug} error={state.fieldErrors?.slug} hint="Used in the URL: /leadership/[slug]" />
      <FileUploadField name="portrait_url" label="Portrait" bucket="images" defaultValue={profile?.portrait_url ?? ""} />
      <TextAreaField label="Bio" name="bio" defaultValue={profile?.bio ?? ""} rows={4} />
      <TextField label="Email" name="email" type="email" defaultValue={profile?.email ?? ""} error={state.fieldErrors?.email} />
      <TextField label="LinkedIn URL" name="linkedin_url" defaultValue={profile?.linkedin_url ?? ""} error={state.fieldErrors?.linkedin_url} placeholder="https://linkedin.com/in/..." />
      <TextField label="Twitter/X URL" name="twitter_url" defaultValue={profile?.twitter_url ?? ""} error={state.fieldErrors?.twitter_url} placeholder="https://x.com/..." />
      <SelectField label="Status" name="status" defaultValue={profile?.status ?? "draft"} options={STATUS_OPTIONS} />
      <FormActions isPending={isPending} cancelHref="/admin/leadership/people" />
    </form>
  );
}
