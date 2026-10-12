import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell, Loader2, LockKeyhole, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

const defaultForm = {
  fullName: "",
  phone: "",
  location: "",
  avatarUrl: "",
  showPhone: false,
  allowMessages: true,
  emailNotifications: true,
  messageNotifications: true,
  orderNotifications: true,
};

function optimizeAvatar(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxDimension = 512;
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
        resolve(new File([blob], "avatar.webp", { type: "image/webp" }));
      }, "image/webp", 0.8);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image."));
    };
    image.src = objectUrl;
  });
}

function SettingsPage({ session }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const loadSettings = useCallback(async () => {
    setStatus({ type: "", message: "" });
    const [profileResult, preferencesResult] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, location, avatar_url, show_phone, allow_messages").eq("id", session.user.id).maybeSingle(),
      supabase.from("user_preferences").select("email_notifications, message_notifications, order_notifications").eq("user_id", session.user.id).maybeSingle(),
    ]);

    if (profileResult.error || preferencesResult.error) {
      setStatus({ type: "error", message: profileResult.error ? `Profile load failed: ${profileResult.error.message}` : `Preferences load failed: ${preferencesResult.error.message}` });
      setIsLoading(false);
      return;
    }

    const profile = profileResult.data || {};
    const preferences = preferencesResult.data || {};
    setForm({
      ...defaultForm,
      fullName: profile.full_name || session.user.user_metadata?.full_name || "",
      phone: profile.phone || "",
      location: profile.location || "",
      avatarUrl: profile.avatar_url || "",
      showPhone: profile.show_phone ?? false,
      allowMessages: profile.allow_messages ?? true,
      emailNotifications: preferences.email_notifications ?? true,
      messageNotifications: preferences.message_notifications ?? true,
      orderNotifications: preferences.order_notifications ?? true,
    });
    setAvatarPreview(profile.avatar_url || "");
    setIsLoading(false);
  }, [session.user.id, session.user.user_metadata]);

  useEffect(() => {
    // Load settings once when the authenticated user changes.
    // eslint-disable-next-line react/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  const updateField = event => {
    const { name, type, checked, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm(current => ({ ...current, [name]: type === "checkbox" ? checked : nextValue }));
  };

  const handleAvatarChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please choose an image file." });
      return;
    }

    try {
      const optimizedFile = await optimizeAvatar(file);
      setAvatarFile(optimizedFile);
      setAvatarPreview(URL.createObjectURL(optimizedFile));
      setStatus({ type: "", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleSave = async event => {
    event.preventDefault();
    if (form.phone && form.phone.length !== 10) {
      setStatus({ type: "error", message: "Phone number must contain exactly 10 digits." });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", message: "" });

    let avatarUrl = form.avatarUrl.trim() || null;
    if (avatarFile) {
      const filePath = `${session.user.id}/avatar.webp`;
      const uploadResult = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: true,
      });

      if (uploadResult.error) {
        setIsSaving(false);
        setStatus({ type: "error", message: `Profile image upload failed: ${uploadResult.error.message}` });
        return;
      }

      avatarUrl = `${supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl}?v=${Date.now()}`;
    }

    const [profileResult, preferencesResult] = await Promise.all([
      supabase.from("profiles").update({
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        avatar_url: avatarUrl,
        show_phone: form.showPhone,
        allow_messages: form.allowMessages,
        updated_at: new Date().toISOString(),
      }).eq("id", session.user.id),
      supabase.from("user_preferences").upsert({
        user_id: session.user.id,
        email_notifications: form.emailNotifications,
        message_notifications: form.messageNotifications,
        order_notifications: form.orderNotifications,
        updated_at: new Date().toISOString(),
      }),
    ]);

    setIsSaving(false);
    if (profileResult.error || preferencesResult.error) {
      setStatus({ type: "error", message: profileResult.error ? `Profile save failed: ${profileResult.error.message}` : `Preferences save failed: ${preferencesResult.error.message}` });
      return;
    }

    setForm(current => ({ ...current, avatarUrl }));
    setAvatarFile(null);
    setStatus({ type: "success", message: "Settings saved." });
  };

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    setStatus(error ? { type: "error", message: error.message } : { type: "success", message: "Password reset instructions sent to your email." });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"><ArrowLeft size={16} />Back to dashboard</Link>
        <div className="mt-8 flex items-end justify-between gap-4 border-b border-zinc-800 pb-6"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Account</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-sm text-zinc-400">Manage your profile, privacy, notifications, and security.</p></div><button form="settings-form" type="submit" disabled={isSaving || isLoading} className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save settings</>}</button></div>

        {status.message && <div className={`mt-6 rounded-xl border px-4 py-3 text-sm ${status.type === "error" ? "border-red-900 bg-red-950/30 text-red-200" : "border-emerald-900 bg-emerald-950/30 text-emerald-200"}`} role="status">{status.message}</div>}

        {isLoading ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center text-sm text-zinc-500">Loading settings...</div> : <form id="settings-form" onSubmit={handleSave} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="flex items-center gap-3"><UserRound size={18} /><div><h2 className="font-bold">Profile</h2><p className="mt-1 text-xs text-zinc-500">This information appears on your marketplace activity.</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><p className="text-sm font-semibold text-zinc-300">Profile picture</p><div className="mt-2 flex items-center gap-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#ddaa82] text-lg font-bold text-white">{avatarPreview ? <img src={avatarPreview} alt="Profile preview" className="size-full object-cover" /> : form.fullName.slice(0, 2).toUpperCase()}</div><label className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500">Choose image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" /></label><p className="text-xs text-zinc-500">Optimized to 512px WebP before upload.</p></div></div><label className="text-sm font-semibold text-zinc-300">Full name<input name="fullName" value={form.fullName} onChange={updateField} required className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none focus:border-white" /></label><label className="text-sm font-semibold text-zinc-300">College email<input value={session.user.email || ""} disabled className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-normal text-zinc-500" /></label><label className="text-sm font-semibold text-zinc-300">Phone number<input name="phone" value={form.phone} onChange={updateField} type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} pattern="[0-9]{10}" placeholder="10 digit phone number" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none placeholder:text-zinc-700 focus:border-white" /></label><label className="text-sm font-semibold text-zinc-300">Campus location<input name="location" value={form.location} onChange={updateField} placeholder="Hostel Block A" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-normal text-white outline-none placeholder:text-zinc-700 focus:border-white" /></label></div></section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="flex items-center gap-3"><ShieldCheck size={18} /><div><h2 className="font-bold">Privacy</h2><p className="mt-1 text-xs text-zinc-500">Control what other students can see and do.</p></div></div><div className="mt-5 space-y-4"><label className="flex items-center justify-between gap-4 text-sm text-zinc-300"><span>Show my phone number on listings</span><input name="showPhone" checked={form.showPhone} onChange={updateField} type="checkbox" className="size-4 accent-white" /></label></div></section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="flex items-center gap-3"><Bell size={18} /><div><h2 className="font-bold">Notifications</h2><p className="mt-1 text-xs text-zinc-500">Choose which updates you want to receive.</p></div></div><div className="mt-5 space-y-4"><label className="flex items-center justify-between gap-4 text-sm text-zinc-300"><span>Email notifications</span><input name="emailNotifications" checked={form.emailNotifications} onChange={updateField} type="checkbox" className="size-4 accent-white" /></label><label className="flex items-center justify-between gap-4 text-sm text-zinc-300"><span>Order updates</span><input name="orderNotifications" checked={form.orderNotifications} onChange={updateField} type="checkbox" className="size-4 accent-white" /></label></div></section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6"><div className="flex items-center gap-3"><LockKeyhole size={18} /><div><h2 className="font-bold">Security</h2><p className="mt-1 text-xs text-zinc-500">Keep your account protected.</p></div></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={handlePasswordReset} className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-zinc-500">Send password reset email</button><button type="button" onClick={handleLogout} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-950/40"><LogOut size={16} />Log out</button></div></section>

        </form>}
      </div>
    </main>
  );
}

export default SettingsPage;