import { notFound } from "next/navigation";
import { getProfile } from "@/lib/queries/leadership";
import { updateProfileAction } from "@/lib/actions/profiles";
import { ProfileForm } from "@/components/admin/profile-form";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const boundAction = updateProfileAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Leadership</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {profile.full_name}</h1>
      <ProfileForm profile={profile} action={boundAction} />
    </div>
  );
}
