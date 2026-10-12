import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Archive, Edit3, MapPin, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

function MyListings({ session }) {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const { data, error: listingsError } = await supabase.from("listings").select("id, title, description, price, condition, location, image_url, status, created_at").eq("seller_id", session.user.id).order("created_at", { ascending: false });
    if (listingsError) setError(listingsError.message);
    else setListings(data || []);
    setIsLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    // Load the seller's listings once for this page.
    // eslint-disable-next-line react/set-state-in-effect
    loadListings();
  }, [loadListings]);

  const archiveListing = async listingId => {
    const { error: archiveError } = await supabase.from("listings").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", listingId).eq("seller_id", session.user.id);
    if (archiveError) {
      setError(archiveError.message);
      return;
    }
    setListings(current => current.map(listing => listing.id === listingId ? { ...listing, status: "archived" } : listing));
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"><ArrowLeft size={16} />Back to dashboard</Link>
        <div className="mt-8 flex items-end justify-between gap-4 border-b border-zinc-800 pb-6"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Seller tools</p><h1 className="mt-2 text-3xl font-bold tracking-tight">My listings</h1><p className="mt-2 text-sm text-zinc-400">Manage the items you have posted.</p></div><Link to="/sell" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-200"><Plus size={16} />New listing</Link></div>
        {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">{error}<button type="button" onClick={loadListings} className="ml-3 cursor-pointer underline">Try again</button></div>}
        {isLoading ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-14 text-center text-sm text-zinc-500">Loading your listings...</div> : listings.length ? <div className="mt-8 grid gap-4">{listings.map(listing => <article key={listing.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row"><div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-950 sm:w-48">{listing.image_url ? <img src={listing.image_url} alt={listing.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-xs text-zinc-600">No image</div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{listing.title}</h2><p className="mt-1 text-lg font-bold">₹{Number(listing.price).toLocaleString("en-IN")}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${listing.status === "active" ? "bg-emerald-950 text-emerald-300" : listing.status === "sold" ? "bg-blue-950 text-blue-300" : "bg-zinc-800 text-zinc-400"}`}>{listing.status}</span></div><p className="mt-3 line-clamp-2 text-sm text-zinc-400">{listing.description}</p>{listing.location && <p className="mt-3 flex items-center gap-1 text-xs text-zinc-500"><MapPin size={12} />{listing.location}</p>}<div className="mt-4 flex gap-2">{listing.status === "active" && <button type="button" onClick={() => archiveListing(listing.id)} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-500"><Archive size={14} />Archive</button>}<button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-600"><Edit3 size={14} />Edit soon</button></div></div></article>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-zinc-700 px-6 py-14 text-center"><p className="font-semibold">You have no listings yet</p><p className="mt-2 text-sm text-zinc-500">Create a listing to start selling around campus.</p></div>}
      </div>
    </main>
  );
}

export default MyListings;
