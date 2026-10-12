import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, PackagePlus, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

const initialForm = {
  title: "",
  description: "",
  price: "",
  condition: "good",
  categoryId: "",
  location: "",
};

function optimizeListingImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxDimension = 1200;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) {
          reject(new Error("Could not optimize this image."));
          return;
        }
        resolve(new File([blob], "listing.webp", { type: "image/webp" }));
      }, "image/webp", 0.8);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image."));
    };
    image.src = objectUrl;
  });
}

function SellItem({ session }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
    if (error) {
      setStatus({ type: "error", message: `Categories could not load: ${error.message}` });
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Load the category options once for this form.
    // eslint-disable-next-line react/set-state-in-effect
    loadCategories();
  }, [loadCategories]);

  const updateField = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
  };

  const handleImageChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please choose an image file." });
      return;
    }
    try {
      const optimizedFile = await optimizeListingImage(file);
      setImageFile(optimizedFile);
      setImagePreview(URL.createObjectURL(optimizedFile));
      setStatus({ type: "", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setIsSaving(true);
    setStatus({ type: "", message: "" });

    let imagePath = "";
    let imageUrl = null;
    if (imageFile) {
      imagePath = `${session.user.id}/${crypto.randomUUID()}.webp`;
      const uploadResult = await supabase.storage.from("listing-images").upload(imagePath, imageFile, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });
      if (uploadResult.error) {
        setIsSaving(false);
        setStatus({ type: "error", message: `Image upload failed: ${uploadResult.error.message}` });
        return;
      }
      imageUrl = supabase.storage.from("listing-images").getPublicUrl(imagePath).data.publicUrl;
    }

    const { error } = await supabase.from("listings").insert({
      seller_id: session.user.id,
      category_id: form.categoryId ? Number(form.categoryId) : null,
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      condition: form.condition,
      location: form.location.trim() || null,
      image_url: imageUrl,
    });

    if (error) {
      if (imagePath) await supabase.storage.from("listing-images").remove([imagePath]);
      setIsSaving(false);
      setStatus({ type: "error", message: `Listing could not be created: ${error.message}` });
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"><ArrowLeft size={16} />Back to dashboard</Link>
        <div className="mt-8 border-b border-zinc-800 pb-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Marketplace</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Sell an item</h1><p className="mt-2 text-sm text-zinc-400">Give another student enough detail to make a confident decision.</p></div>
        {status.message && <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-900 bg-red-950/30 text-red-200" : "border-emerald-900 bg-emerald-950/30 text-emerald-200"}`} role="status">{status.message}</div>}
        {isLoading ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center text-sm text-zinc-500">Loading categories...</div> : <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="flex items-center gap-3"><PackagePlus size={18} /><div><h2 className="font-bold">Item details</h2><p className="mt-1 text-xs text-zinc-500">Describe what you are selling.</p></div></div><div className="mt-6 space-y-5"><label className="block text-sm font-semibold text-zinc-300">Title<input name="title" value={form.title} onChange={updateField} required maxLength={100} placeholder="Scientific calculator" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none placeholder:text-zinc-700 focus:border-white" /></label><label className="block text-sm font-semibold text-zinc-300">Description<textarea name="description" value={form.description} onChange={updateField} required maxLength={2000} rows={5} placeholder="Describe condition, included items, and anything a buyer should know." className="mt-2 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none placeholder:text-zinc-700 focus:border-white" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-zinc-300">Price<input name="price" value={form.price} onChange={updateField} required type="number" min="0" step="1" placeholder="700" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none placeholder:text-zinc-700 focus:border-white" /></label><label className="text-sm font-semibold text-zinc-300">Condition<select name="condition" value={form.condition} onChange={updateField} className="mt-2 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none focus:border-white"><option value="new">New</option><option value="like_new">Like new</option><option value="good">Good</option><option value="fair">Fair</option></select></label><label className="text-sm font-semibold text-zinc-300">Category<select name="categoryId" value={form.categoryId} onChange={updateField} className="mt-2 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none focus:border-white"><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm font-semibold text-zinc-300">Pickup location<input name="location" value={form.location} onChange={updateField} maxLength={120} placeholder="Hostel Block A" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none placeholder:text-zinc-700 focus:border-white" /></label></div></div></section>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="flex items-center gap-3"><ImagePlus size={18} /><div><h2 className="font-bold">Item photo</h2><p className="mt-1 text-xs text-zinc-500">One clear photo is enough to start.</p></div></div><div className="mt-5 flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-5 text-center">{imagePreview ? <img src={imagePreview} alt="Listing preview" className="max-h-56 max-w-full rounded-lg object-contain" /> : <Upload className="text-zinc-600" size={28} />}<label className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500">{imagePreview ? "Replace photo" : "Choose photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" /></label><p className="text-xs text-zinc-500">Optimized to WebP before upload.</p></div></section>
          <div className="flex justify-end"><button type="submit" disabled={isSaving} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? <><Loader2 size={16} className="animate-spin" /> Publishing...</> : "Publish listing"}</button></div>
        </form>}
      </div>
    </main>
  );
}

export default SellItem;