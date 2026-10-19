# Wallpaper register

Single source of truth in code: `lib/wallpapers.ts`. Guarded by `lib/wallpapers.test.ts`
(one image = one destination; no byte-identical copies; existing wallpapers frozen by hash and by reference).

**To add a wallpaper:** copy the file to `public/img/` under a new descriptive name, add ONE entry to
`WALLPAPERS` for ONE destination, call `heroImage("<key>")` on that page's `<PageHero>`, and add a row below.
Never reuse an image or substitute an existing one; if nothing suitable exists, leave the page on the branded
navy hero and list it under "Awaiting a wallpaper".

## New wallpapers (9 rows here: 8 public assignments and 1 held; the 10th public assignment, Media & Communications, is under "Individual department pages"; plus 2 admin backgrounds below)

| Wallpaper asset | Existing or new | Assigned route | Intended section | Symbolic and design rationale | Status |
|---|---|---|---|---|---|
| `wallpaper-moot-evidence-gavel.jpg` | New | `/moot/[slug]` | Individual moot competition page hero | A gavel on an open volume of procedural rules beside a treatise titled *Evidence*: the actual materials of courtroom practice, i.e. mooting. Warm dark browns sit well under the navy overlay; desktop crop (`center 80%`) shows the rules text and gavel, mobile shows the *Evidence* spine. | Implemented, verified in headless Chromium |
| `wallpaper-terms-lady-justice.jpg` | New | `/terms` | Terms of Use hero (via `LegalDocument`; `/privacy` deliberately not given this image) | Lady Justice with scales and sword: governing rules, impartial authority. Overcast grey sky is neutral and takes the navy overlay without clashing; scales stay visible beside the title panel on desktop. | Implemented, verified in headless Chromium |
| `wallpaper-conferences-africa-map.jpg` | New | `/conferences/[slug]` | Individual conference page hero | Textured artwork of a line of figures moving toward a map of Africa: continental gathering and shared purpose, which is what a conference is. Landscape, so it crops best of all eight; the deep orange-red reads as dusk under the overlay and complements the gold accents. | Implemented, verified in headless Chromium |
| `wallpaper-events-maasai-procession.jpg` | New | `/events/[slug]` | Individual event page hero | People walking single file through grassland: community and collective movement, grounded in a Kenyan setting. Used for gatherings, not as a claim about leadership or any specific people. Strong on mobile; soft on desktop (see limitations). | Implemented, verified in headless Chromium |
| `wallpaper-research-light-rays.jpg` | New | `/research/[slug]` | Individual research article hero | Shafts of light breaking through dark cloud: illumination and clarity, the conventional metaphor for scholarship. Charcoal and champagne-gold palette matches the site's own. | Implemented, verified in headless Chromium |
| `wallpaper-announcements-light-bird.jpg` | New | `/announcements` | Announcements listing hero | A single bird rising through a column of light: a message going out. Very dark with a narrow bright core; focus set high (`center 12%`) so the lit cloud shows in the wide desktop crop. | Implemented, verified in headless Chromium |
| `wallpaper-leadership-cafe-rain.jpg` | New | `/leadership` | Leadership index page hero | Supplied by the Society: a steaming cup beside a rain-streaked window with warm pendant lamps and a wet city street. Replaces `wallpaper-justice-statue.jpg` on this page (that file is unchanged and now unassigned). `focus` is `center 30%`. | Implemented |
| `wallpaper-leadership-profile-cafe-lights.jpg` | New | `/leadership/[slug]` | Individual leadership profile page hero (behind the bio) | Supplied by the Society: a café table for two beneath hanging amber lanterns on a rainy street. Replaces `wallpaper-leadership-profile-maasai-seated.jpg` (file kept, now unassigned). `focus` is `center 24%`. | Implemented |
| `wallpaper-partnerships-city-street.jpg` | New | `/departments/partnerships` | Partnerships department page hero (selected in `lib/department-wallpapers.ts`) | A street between glass office towers: the firms and institutions the department builds relationships with. Strong crimson reads as burgundy under the navy overlay, echoing the site's burgundy accent. Approved for this use by the site owner. | Implemented, verified in headless Chromium |
| `wallpaper-leadership-profile-sculptor.jpg` | New, **unassigned (held)** | none | none | Previously on `/leadership/[slug]`; withdrawn when the seated-figure image was approved for that page. The file remains in `public/img/` but nothing references it. | Held, awaiting approval |

## Existing wallpapers (24 protected files, all listed below; `yas-atmosphere.jpg` is referenced from the stylesheet, not assigned to a route)

| Wallpaper asset | Existing or new | Current route / file | Status | Verification |
|---|---|---|---|---|
| `departments/conferences.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/csr.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/executive-committee.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/mooting.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/neutral-balance.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/neutral-globe.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/publications.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/research.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `departments/training.jpg` | Existing | `lib/department-visuals.ts` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-digital-law.jpg` | Existing | `/publications` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-gavel-scales.jpg` | Existing | `/conferences`, `/events`, `/moot`, `/research` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-justice-statue.jpg` | Existing | none | Protected file, unassigned | File byte-identical. Removed from `/leadership` at the Society's request when the café image was supplied for that page. |
| `wallpaper-media-communications-signal.jpg` | Existing (protected by instruction) | none | Protected file, unassigned | The champagne-gold sound-wave graphic on navy. Superseded on `/departments/media` by `wallpaper-media-communications-network.jpg` at the Society's request. The file was removed from the working tree by mistake during an earlier session and was restored byte-for-byte from the supplied `yas-nextjs-fixed36` package during the final audit; it is not tracked in Git at HEAD or on `origin/main`, so it needs adding to a publication deliberately if it is to be kept in the repository. |
| `wallpaper-ku-amphitheatre.jpg` | Existing | `/departments` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-ku-fountain.jpg` | Existing | `/about` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-ku-gate.jpg` | Existing | `/archive` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-nairobi-night.jpg` | Existing | `/partners` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-nairobi-sunset-1.jpg` | Existing | `/join` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-nairobi-sunset-2.jpg` | Existing | `/contact` | Protected | Unchanged (byte-identical, same references) |
| `wallpaper-scales-document.jpg` | Existing | `/csr`, `/gallery` | Protected | Unchanged (byte-identical, same references) |
| `yas-atmosphere.jpg` | Existing | `app/globals.css` (the `.atmosphere` background used by the admin login and public pages) | Protected | Unchanged (byte-identical, same references) |
| `yas-live-poster-portrait.jpg` | Existing | `components/hero/video-hero.tsx` | Protected | Unchanged (byte-identical, same references) |
| `yas-live-poster.jpg` | Existing | `components/hero/video-hero.tsx` | Protected | Unchanged (byte-identical, same references) |
| `yas-logo-web.jpg` | Existing | `/admin/(dashboard)/layout.tsx`, `components/admin/admin-mobile-nav.tsx`, `components/hero/yas-seal.tsx`, `components/navigation/site-footer.tsx`, `components/navigation/site-nav.tsx` | Protected | Unchanged (byte-identical, same references) |

Existing wallpapers also include the `public/img/departments/*` images (hashes frozen in the test).
`public/img/yas-hero-poster.jpg` is a tracked file that no source references and which image tools cannot
decode; it is documented here, not modified.

## Routes still awaiting a wallpaper (branded navy hero is used; nothing borrowed)

`/announcements/[slug]`, `/publications/[slug]`, `/gallery/[slug]`, `/search`, `/privacy`, `/newsletter/confirm`,
`/newsletter/unsubscribe`. The newsletter pages are transactional and plain by
design. A single image on the shared department template would repeat across departments, so each department needs its own image.

## Technical limitations

- All eight supplied images are small (610 to 736 px wide) against existing wallpapers of 933 to 1800 px. On a wide
  desktop hero they are upscaled about 2 to 2.5 times and look soft, especially the Maasai photograph. The navy
  overlay masks most of it, but 1600 px or wider originals would be better.
- Seven of eight are portrait photographs shown in a wide band; `focus` values were chosen from real browser renders.

## Individual department pages (`/departments/[slug]`)

Selected per department by `departmentWallpaper()` in `lib/department-wallpapers.ts`, which reuses the existing
`lib/department-visuals.ts` mapping (the same one behind the hub cards and showcase). The department list is read
from the real sources (`supabase/seed.sql` plus the in-code fallback list). Every department uses a different
photograph; the existing image files and the hub/showcase mapping are unchanged. Checked in headless Chromium at
1440, 820 and 390 px: all nine pages return 200 with no horizontal overflow.

| Department | Route | Wallpaper | Rationale | Status |
|---|---|---|---|---|
| Moot | `/departments/moot` | `departments/mooting.jpg` | Moot courtroom with a brass balance scale on the bench and open case books. | Implemented, verified in headless Chromium |
| Research | `/departments/research` | `departments/research.jpg` | Scholar's desk in a library with an open atlas of Africa and a globe. | Implemented, verified in headless Chromium |
| CSR | `/departments/csr` | `departments/csr.jpg` | Volunteers planting trees together in the Kenyan countryside (community outreach). | Implemented, verified in headless Chromium |
| Conferences | `/departments/conferences` | `departments/conferences.jpg` | Conference table set with papers and laptops in a boardroom over Nairobi. | Implemented, verified in headless Chromium |
| Training | `/departments/training` | `departments/training.jpg` | Open legal volumes, magnifier and map on a library study table. | Implemented, verified in headless Chromium |
| Publications | `/departments/publications` | `departments/publications.jpg` | Manuscripts, bound volumes and reading glasses on a writing desk. | Implemented, verified in headless Chromium |
| Executive Committee | `/departments/executive-committee` | `departments/executive-committee.jpg` | Committee in discussion at a boardroom table beneath a map of Africa. | Implemented, verified in headless Chromium |
| Partnerships | `/departments/partnerships` | `wallpaper-partnerships-city-street.jpg` | City street between office towers: the firms and institutions the department works with. Registered in `lib/wallpapers.ts`. | Implemented, verified in headless Chromium |
| Media & Communications | `/departments/media` | `wallpaper-media-communications-network.jpg` | Photograph supplied by the Society: a glowing dotted map of Africa with amber light trails radiating to connected hubs, symbolising the department as the Society's public voice and reach. Replaces the earlier generated sound-wave graphic (`wallpaper-media-communications-signal.jpg`, removed). Source is 736×1104 portrait; `focus` is `center 58%` to keep the African continent and its brightest hubs inside the wide desktop crop. | Implemented |

Any department not listed here gets the branded navy hero; it never borrows the neutral images or
another department's photograph. Departments not in this list (for example a new one added in the admin) behave
the same way until an image is added to `lib/department-visuals.ts`.

## Admin backgrounds (2)

| Wallpaper asset | Existing or new | Route | Intended section | Rationale | Status |
|---|---|---|---|---|---|
| `admin-login-clock.jpg` | New | `/admin/login` | Full-page login background | A dark, calm image of a wall clock in low light: time and discipline, and very legible behind the glass sign-in card. It sits between the existing atmosphere photograph and that photograph's own overlay gradient, so the original atmosphere remains underneath as the fallback and the original contrast treatment is unchanged. | Implemented, verified in headless Chromium |
| `admin-dashboard-laptop.jpg` | New | `/admin` (Dashboard Overview) | Header banner behind the page title only (never behind tables or forms) | A workspace at sunrise: the working surface of the admin. Heavy navy overlay keeps the white title readable. The full photograph shows legible magazine titles on book spines, so the crop is set high (`center 32%`) on the sunrise skyline, above the books, and no spine titles appear in the banner. | Implemented; the dashboard needs a sign-in, so it was verified as an isolated render, not in the live app |

## Note on the latest upload
Only the seated Maasai figure was a genuinely new image. The other seven files were byte-identical to images from
earlier uploads. Four of those (Africa map, Maasai procession, Lady Justice, gavel and books) were already placed
(`/conferences/[slug]`, `/events/[slug]`, `/terms`, `/moot/[slug]`) and were not copied again. The clock, the laptop
and the red city street had not been placed before and are now used once each, as listed above.
