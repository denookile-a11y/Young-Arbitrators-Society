import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { listSiteSettings, listAdmins } from "@/lib/queries/settings";
import { getCurrentAdmin, hasRole } from "@/lib/auth/current-admin";
import { CmsListHeader, CmsConnectionGate } from "@/components/admin/cms-list";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminRoleRow } from "@/components/admin/admin-role-row";

function settingValue(settings: { key: string; value: unknown }[], key: string): string {
  const found = settings.find((s) => s.key === key);
  return typeof found?.value === "string" ? found.value : "";
}

export default async function SettingsPage() {
  const configured = isSupabaseConfigured();
  const currentAdmin = configured ? await getCurrentAdmin() : null;
  const settings = configured ? await listSiteSettings() : [];
  const admins = configured && hasRole(currentAdmin, "super_admin") ? await listAdmins() : [];

  return (
    <div>
      <CmsListHeader eyebrow="Site" title="Settings" />

      <CmsConnectionGate configured={configured}>
        <div className="mb-16">
          <h2 className="mb-6 font-serif text-xl text-navy-deep">General</h2>
          <SettingsForm
            defaults={{
              site_title: settingValue(settings, "site_title") || "Young Arbitrators Society",
              contact_email: settingValue(settings, "contact_email") || "info@yas-ku.org",
              instagram_handle: settingValue(settings, "instagram_handle") || "yas_kusol",
              linkedin_url: settingValue(settings, "linkedin_url"),
            }}
          />
        </div>

        {hasRole(currentAdmin, "super_admin") && (
          <div>
            <h2 className="mb-2 font-serif text-xl text-navy-deep">Team</h2>
            <p className="mb-6 text-sm text-ink-soft">
              Super admin only. New admin accounts still require the manual
              bootstrap step in <code className="text-ink">supabase/seed.sql</code> —
              creating the underlying auth user isn&apos;t exposed here since
              it requires the service-role key.
            </p>
            <div className="border-t border-hairline">
              {admins.map((admin) => (
                <AdminRoleRow key={admin.id} admin={admin} isSelf={admin.id === currentAdmin?.id} />
              ))}
            </div>
          </div>
        )}
      </CmsConnectionGate>
    </div>
  );
}
