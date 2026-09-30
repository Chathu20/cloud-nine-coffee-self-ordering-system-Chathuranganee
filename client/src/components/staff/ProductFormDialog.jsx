import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import ProductImage from "../customer/ProductImage";

// Must match the server's CATEGORIES and price limits
const CATEGORIES = ["Hot Coffee", "Iced Coffee", "Other Drinks", "Food"];
const MIN_PRICE = 200;
const MAX_PRICE = 100000;
const IMAGE_PATTERN = /^(\/[\w\-./]+|https?:\/\/\S+)$/i;

// Photos chosen from the computer are shrunk in the browser before upload:
// faster upload, smaller files, and the kiosk loads them quickly.
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_WIDTH = 1000; // px – plenty for the menu cards
const JPEG_QUALITY = 0.82;

// Resize (keeping the shape) and convert to JPEG. A white background fills any transparent parts.
const shrinkPhoto = async (file) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not read the photo"))), "image/jpeg", JPEG_QUALITY)
  );
};

const EMPTY = { name: "", description: "", category: "Hot Coffee", basePrice: "", image: "", optionGroupIds: [] };

// Quick checks in the browser for fast feedback – the server checks everything again
const validate = (form) => {
  const name = form.name.trim();
  if (!name || name.length > 60) return "Name must be 1–60 characters.";
  if (form.description.trim().length > 300) return "Description must be at most 300 characters.";
  const price = Number(form.basePrice);
  if (!Number.isInteger(price) || price < MIN_PRICE || price > MAX_PRICE) {
    return `Price must be a whole number between ${MIN_PRICE} and ${MAX_PRICE}.`;
  }
  const image = form.image.trim();
  if (image && !IMAGE_PATTERN.test(image)) return "Image must be a path like /images/latte.jpg or an https:// link.";
  return "";
};

// Add a new product (product = null) or edit an existing one
export default function ProductFormDialog({ product, optionGroups, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? "",
          category: product.category,
          basePrice: String(product.basePrice),
          image: product.image ?? "",
          optionGroupIds: product.optionGroupIds ?? [],
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  // Close with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError(""); // hide the old message once they start fixing it
  };

  // "Upload from computer": shrink the photo, send it to the server, then use the returned link
  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again later
    if (!file) return;

    if (!UPLOAD_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP photo.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const photo = await shrinkPhoto(file);
      const upload = new FormData();
      upload.append("image", photo, "photo.jpg");
      const { data } = await api.post("/admin/uploads", upload);
      setForm((f) => ({ ...f, image: data.url }));
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't upload the photo. Please try another image.");
    } finally {
      setUploading(false);
    }
  };

  const toggleGroup = (id) =>
    setForm((f) => ({
      ...f,
      optionGroupIds: f.optionGroupIds.includes(id) ? f.optionGroupIds.filter((g) => g !== id) : [...f.optionGroupIds, id],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || uploading) return;

    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      basePrice: Number(form.basePrice),
      image: form.image.trim(),
      optionGroupIds: form.optionGroupIds,
    };

    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await api.patch(`/admin/products/${product.id}`, body)
        : await api.post("/admin/products", body);
      onSaved(data.product, isEdit ? "updated" : "added");
    } catch (err) {
      setError(err.response?.data?.message ?? "Couldn't save. Please check the connection and try again.");
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border-2 border-latte/60 bg-white px-3 py-2.5 outline-none focus:border-forest";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/50 sm:items-center sm:p-6" onClick={() => !saving && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-latte/40 px-6 py-4">
          <h2 id="product-form-title" className="font-display text-2xl uppercase tracking-wide text-coffee">
            {isEdit ? "Edit item" : "Add menu item"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-latte text-xl text-espresso hover:bg-latte/20"
          >
            ×
          </button>
        </header>

        <div className="grid gap-5 overflow-y-auto p-6 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="font-semibold text-espresso">Name *</span>
              <input value={form.name} onChange={set("name")} maxLength={60} className={inputClass} autoFocus />
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-espresso">Description</span>
              <textarea
                value={form.description}
                onChange={set("description")}
                maxLength={300}
                rows={3}
                className={inputClass}
              />
              <span className="block text-right text-xs text-espresso/50">{form.description.length}/300</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="font-semibold text-espresso">Category *</span>
                <select value={form.category} onChange={set("category")} className={inputClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-espresso">Price (LKR) *</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={1}
                  value={form.basePrice}
                  onChange={set("basePrice")}
                  className={inputClass}
                />
                <span className="block text-xs text-espresso/50">Price of the smallest size, whole rupees</span>
              </label>
            </div>

            {/* Image: paste a link OR upload a photo from the computer */}
            <div className="space-y-2">
              <label htmlFor="product-image" className="block font-semibold text-espresso">
                Image
              </label>
              <input
                id="product-image"
                value={form.image}
                onChange={set("image")}
                placeholder="Paste a link: /images/latte.jpg or https://…"
                className={inputClass}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-espresso/50">or</span>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading || saving}
                  className="rounded-xl border-2 border-forest px-4 py-2 text-sm font-semibold text-forest transition hover:bg-forest/5 disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "📁 Upload from computer"}
                </button>
                {form.image && !uploading && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, image: "" }))}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove image
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChosen}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-espresso/50">JPG, PNG or WebP. Photos are resized automatically.</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="font-semibold text-espresso">Customer options</legend>
              <p className="text-xs text-espresso/50">Which choices the customer gets for this item (leave all off for food).</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {optionGroups.map((group) => {
                  const checked = form.optionGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                        checked ? "border-forest bg-forest/5" : "border-latte/50 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                        className="mt-1 h-4 w-4 accent-forest"
                      />
                      <span>
                        <span className="font-semibold text-espresso">
                          {group.name} {group.required && <span className="text-xs font-normal text-espresso/50">(required)</span>}
                        </span>
                        <span className="block text-xs text-espresso/60">{group.options.join(", ")}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Live preview of the photo */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-espresso">Preview</p>
            <ProductImage
              src={form.image.trim()}
              alt={form.name || "New item"}
              category={form.category}
              className="aspect-[4/3] w-full rounded-2xl ring-1 ring-latte/40"
            />
            <p className="text-xs text-espresso/50">If the image can't load, the kiosk shows a friendly icon instead.</p>
          </div>
        </div>

        <footer className="space-y-3 border-t border-latte/40 bg-white px-6 py-4">
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border-2 border-latte px-5 py-2.5 font-semibold text-coffee hover:bg-latte/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-xl bg-forest px-6 py-2.5 font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add to menu"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}