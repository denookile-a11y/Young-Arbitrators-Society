import { ProfileForm } from "@/components/admin/profile-form";
import { createProfileAction } from "@/lib/actions/profiles";

export default function NewPersonPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold-on-light">Leadership</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Person</h1>
      <ProfileForm action={createProfileAction} />
    </div>
  );
}
