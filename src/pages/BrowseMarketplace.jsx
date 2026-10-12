import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, Heart, Loader2, MapPin, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);
}

function formatCondition(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function BrowseMarketplace({ session }) {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category") || "";
  const searchFromUrl = searchParams.get("search") || "";
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [bookings, setBookings] = useState(new Set());
  const [bookingId, setBookingId] = useState(null);
  const [search, setSearch] = useState(searchFromUrl);
  const [categoryId, setCategoryId] = useState(categoryFromUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadMarketplace = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const [listingResult, categoryResult, favoriteResult, bookingResult] = await Promise.all([
      supabase.from("listings").select("id, title, description, price, condition, location, image_url, seller_id, category_id, created_at").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("favorites").select("listing_id").eq("user_id", session.user.id),
      supabase.from("orders").select("listing_id").eq("buyer_id", session.user.id).in("status", ["pending", "confirmed"]),
    ]);
    const failed = [listingResult, categoryResult, favoriteResult, bookingResult].find(result => result.error);
    if (failed) {
      setError(failed.error.message);
      setIsLoading(false);
      return;
    }
    setListings(listingResult.data || []);
    setCategories(categoryResult.data || []);
    setFavorites(new Set((favoriteResult.data || []).map(item => item.listing_id)));
    setBookings(new Set((bookingResult.data || []).map(item => item.listing_id)));
    setIsLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    // Load marketplace data once for the authenticated user.
    // eslint-disable-next-line react/set-state-in-effect
    loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    // Sync the filter when a dashboard category link changes the URL.
    // eslint-disable-next-line react/set-state-in-effect
    setCategoryId(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    // Sync the search field when navigating with a search query param.
    // eslint-disable-next-line react/set-state-in-effect
    setSearch(searchFromUrl);
  }, [searchFromUrl]);

  const visibleListings = listings.filter(listing => {
    const matchesSearch = `${listing.title} ${listing.description} ${listing.location || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!categoryId || String(listing.category_id) === categoryId);
  });

  const toggleFavorite = async listingId => {
    const isFavorite = favorites.has(listingId);
    const result = isFavorite
      ? await supabase.from("favorites").delete().eq("user_id", session.user.id).eq("listing_id", listingId)
      : await supabase.from("favorites").insert({ user_id: session.user.id, listing_id: listingId });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setFavorites(current => {
      const next = new Set(current);
      if (isFavorite) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });
  };

  const bookListing = async listingId => {
    if (bookings.has(listingId) || bookingId) return;
    setBookingId(listingId);
    const { error: bookingError } = await supabase.from("orders").insert({ listing_id: listingId, buyer_id: session.user.id, status: "pending" });
    setBookingId(null);
    if (bookingError) {
      setError(bookingError.message);
      return;
    }
    setBookings(current => new Set([...current, listingId]));
    setMessage("Booking request sent.");
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"><ArrowLeft size={16} />Back to dashboard</Link>
        <div className="mt-8 border-b border-zinc-800 pb-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Marketplace</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Browse marketplace</h1><p className="mt-2 text-sm text-zinc-400">Find useful items from students around campus.</p></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="relative"><Search className="absolute left-3 top-3 text-zinc-500" size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search listings..." className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white" /></label><select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-white"><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        {message && <p className="mt-4 text-sm text-emerald-400" role="status">{message}</p>}
        {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">{error}<button type="button" onClick={loadMarketplace} className="ml-3 cursor-pointer underline">Try again</button></div>}
        {isLoading ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-14 text-center text-sm text-zinc-500">Loading marketplace...</div> : visibleListings.length ? <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleListings.map(listing => <article key={listing.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"><div className="relative h-36 bg-zinc-950">{listing.image_url ? <img src={listing.image_url} alt={listing.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-xs text-zinc-600">No image</div>}<button type="button" onClick={() => toggleFavorite(listing.id)} className="absolute right-3 top-3 grid size-8 cursor-pointer place-items-center rounded-full bg-zinc-950/95 text-zinc-300 hover:text-rose-400" aria-label="Save listing"><Heart size={15} fill={favorites.has(listing.id) ? "currentColor" : "none"} /></button></div><div className="p-3"><h2 className="truncate text-sm font-bold">{listing.title}</h2><p className="mt-1 font-bold">{formatPrice(listing.price)}</p><p className="mt-2 text-xs text-zinc-400">{formatCondition(listing.condition)}</p>{listing.location && <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500"><MapPin size={11} />{listing.location}</p>}{listing.seller_id !== session.user.id && <div className="mt-3"><button type="button" onClick={() => bookListing(listing.id)} disabled={bookings.has(listing.id) || bookingId === listing.id} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">{bookingId === listing.id ? <><Loader2 size={14} className="animate-spin" /> Booking...</> : <><CalendarCheck size={14} />{bookings.has(listing.id) ? "Booking requested" : "Book this item"}</>}</button></div>}</div></article>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-zinc-700 px-6 py-14 text-center"><p className="font-semibold">No listings found</p><p className="mt-2 text-sm text-zinc-500">Try another search or check back after students add new items.</p></div>}
      </div>
    </main>
  );
}

export default BrowseMarketplace;
