import { Suspense } from "react";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listProfiles } from "@/lib/queries/leadership";
import { CmsListHeader, CmsConnectionGate, CmsEmptyState } from "@/components/admin/cms-list";
import { CmsTableRow } from "@/components/admin/cms-table-row";
import { Toast } from "@/components/admin/toast";
import { deleteProfileAction } from "@/lib/actions/profiles";

export default async function PeopleListPage() {
  const configured = isSupabaseConfigured();
  const profiles = configured ? await listProfiles() : [];

  return (
    <div>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      <CmsListHeader
        eyebrow="Leadership"
        title="People"
        newHref="/admin/leadership/people/new"
        newLabel="New Person"
      />
      <p className="mb-6 max-w-[560px] text-sm text-ink-soft">
        A person&apos;s profile (name, portrait, bio) is separate from their{" "}
        <span className="font-semibold text-ink">role</span> — the same
        person can hold roles across multiple editions. Add the person here
        first, then{" "}
        <Link href="/admin/leadership" className="underline">
          assign their role
        </Link>{" "}
        for a specific edition.
      </p>
      <CmsConnectionGate configured={configured}>
        {profiles.length === 0 ? (
          <CmsEmptyState
            title="No people yet"
            description="Add each committee member as a person, then assign their role and edition."
          />
        ) : (
          <div className="border-t border-hairline">
            {profiles.map((profile) => (
              <CmsTableRow
                key={profile.id}
                title={profile.full_name}
                meta={profile.email ?? undefined}
                status={profile.status}
                editHref={`/admin/leadership/people/${profile.id}`}
                previewHref={`/leadership/${profile.slug}`}
                actions={[
                  {
                    label: "Delete",
                    variant: "danger",
                    formAction: async () => {
                      "use server";
                      await deleteProfileAction(profile.id);
                    },
                  },
                ]}
              />
            ))}
          </div>
        )}
      </CmsConnectionGate>
    </div>
  );
}
