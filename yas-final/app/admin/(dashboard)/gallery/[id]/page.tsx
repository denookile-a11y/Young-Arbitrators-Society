import { notFound } from "next/navigation";
import { getGallery, listGalleryItems } from "@/lib/queries/gallery";
import { updateGalleryAction } from "@/lib/actions/gallery";
import { GalleryForm } from "@/components/admin/gallery-form";
import { GalleryItemManager } from "@/components/admin/gallery-item-manager";

export default async function EditGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [gallery, items] = await Promise.all([getGallery(id), listGalleryItems(id)]);
  if (!gallery) notFound();

  const boundAction = updateGalleryAction.bind(null, id);

  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Galleries</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">Edit — {gallery.title}</h1>

      <div className="mb-14">
        <GalleryForm gallery={gallery} action={boundAction} />
      </div>

      <div className="max-w-[720px] border-t border-hairline pt-10">
        <h2 className="mb-6 font-serif text-xl text-navy-deep">Photos &amp; Videos</h2>
        <GalleryItemManager galleryId={id} items={items} />
      </div>
    </div>
  );
}
