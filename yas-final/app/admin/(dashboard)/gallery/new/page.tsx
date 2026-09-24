import { GalleryForm } from "@/components/admin/gallery-form";
import { createGalleryAction } from "@/lib/actions/gallery";

export default function NewGalleryPage() {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold tracking-wide text-gold">Galleries</span>
      <h1 className="mb-8 font-serif text-3xl font-normal text-navy-deep">New Gallery</h1>
      <GalleryForm action={createGalleryAction} />
    </div>
  );
}
