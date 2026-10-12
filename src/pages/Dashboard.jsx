import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bike, BookOpen, BookText, CalendarCheck, Camera, Dumbbell, Gamepad2,
  Headphones, Heart, Laptop, LayoutDashboard, Loader2, MapPin, Menu, Music,
  LogOut, Package, Palette, Plus, Search, Settings,
  ShoppingBag, ShoppingCart, Shirt, Sofa, Tag, Utensils, Wrench, X,
} from "lucide-react";
import { supabase } from "../services/supabase";

const navigation = [
  [LayoutDashboard, "Dashboard", "/dashboard", true],
  [ShoppingBag, "Browse Marketplace", "/browse"],
  [Package, "My Listings", "/listings"],
  [ShoppingCart, "Orders", "/orders"],
];

const categoryIconMap = {
  books: BookText, textbooks: BookText, "study-material": BookText, "study-materials": BookText,
  electronics: Laptop, tech: Laptop, gadgets: Laptop, computers: Laptop,
  furniture: Sofa, "dorm-essentials": Sofa, "home-living": Sofa,
  clothing: Shirt, fashion: Shirt, apparel: Shirt, accessories: Shirt,
  sports: Dumbbell, fitness: Dumbbell, gym: Dumbbell,
  cycles: Bike, bikes: Bike, transport: Bike, vehicles: Bike,
  food: Utensils, kitchen: Utensils, appliances: Utensils, cookware: Utensils,
  music: Music, instruments: Music,
  art: Palette, crafts: Palette, stationery: Palette,
  tools: Wrench, hardware: Wrench,
  audio: Headphones, headphones: Headphones,
  gaming: Gamepad2, games: Gamepad2,
  photography: Camera, cameras: Camera,
};

function CategoryIcon({ slug, name }) {
  const key = (slug || name || "").toLowerCase().replace(/\s+/g, "-");
  const Icon = categoryIconMap[key] || Package;
  return (
    <div className="mx-auto mb-2 grid size-9 place-items-center rounded-xl bg-zinc-800 text-zinc-300">
      <Icon size={18} />
    </div>
  );
}

function getDisplayName(session) {
  return session?.user?.user_metadata?.full_name?.trim()
    || session?.user?.email?.split("@")[0]
    || "Student";
}

function getInitials(displayName) {
  return displayName
    .split(/\s+/)
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ initials, avatarUrl }) {
  return <div className="grid size-8 place-items-center overflow-hidden rounded-full bg-[#ddaa82] text-xs font-bold text-white">{avatarUrl ? <img src={avatarUrl} alt="Profile" className="size-full object-cover" /> : initials}</div>;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatCondition(condition) {
  return condition.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function ProductCard({ item, isFavorite, isBooked, canBook, onToggleFavorite, onBook }) {
  const [isBooking, setIsBooking] = useState(false);
  const sellerName = item.profiles?.full_name || "Student seller";
  
  const handleBook = async () => {
    setIsBooking(true);
    await onBook(item.id);
    setIsBooking(false);
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-1 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20">
      <div className="relative h-32 overflow-hidden bg-zinc-950 sm:h-40">
        {item.image_url ? <img className="size-full object-cover" src={item.image_url} alt={item.title} /> : <div className="grid size-full place-items-center text-xs text-zinc-600">No image</div>}
        <button type="button" onClick={() => onToggleFavorite(item.id)} className="absolute right-3 top-3 grid size-8 cursor-pointer place-items-center rounded-full bg-zinc-950/95 text-zinc-300 hover:text-rose-400" aria-label={`${isFavorite ? "Remove" : "Save"} ${item.title}`}>
          <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
        <p className="mt-1 text-base font-bold text-white">{formatPrice(item.price)}</p>
        <div className="mt-2 flex flex-col gap-1 text-[10px] text-zinc-400 sm:flex-row sm:justify-between">
          <span>{formatCondition(item.condition)}</span>
          {item.location && <span className="flex items-center gap-1"><MapPin size={10} />{item.location}</span>}
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">Listed by {sellerName}</p>
        {canBook && <button type="button" onClick={handleBook} disabled={isBooked || isBooking} className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">{isBooking ? <><Loader2 size={14} className="animate-spin" /> Booking...</> : <><CalendarCheck size={14} />{isBooked ? "Booking requested" : "Book this item"}</>}</button>}
      </div>
    </article>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-zinc-500">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-900/70 bg-red-950/20 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-red-200">We could not load this section</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-red-300/70">{message || "Please try again in a moment."}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-5 cursor-pointer rounded-lg border border-red-800 px-4 py-2.5 text-xs font-bold text-red-200 hover:bg-red-950/50">Try again</button>}
    </div>
  );
}

function LoadingState() {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center text-xs text-zinc-500">Loading marketplace data...</div>;
}

function LogoutDialog({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm animate-[dialogIn_0.2s_ease-out] rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer text-zinc-500 transition hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-red-950/40 text-red-400">
          <LogOut size={22} />
        </div>
        <h3 className="text-center text-lg font-bold tracking-tight">Log out?</h3>
        <p className="mt-2 text-center text-sm text-zinc-400">
          You'll need to sign in again to access your listings and bookings.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ displayName, initials, avatarUrl, onLogout }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-[#0a0a0a] px-4 py-6 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pb-7 text-[17px] font-bold tracking-tight text-white">
        <div className="grid size-8 place-items-center rounded-xl bg-white text-black"><BookOpen size={18} /></div>
        Campus Marketplace
      </div>
      <nav>
        {navigation.map(([Icon, label, path, isActive]) => path ? <Link key={label} to={path} className={`my-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold ${isActive ? "bg-white text-black" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}><Icon size={18} />{label}</Link> : <a key={label} href="#" className="my-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white"><Icon size={18} />{label}</a>)}

      </nav>
      <div className="mt-auto">
        <Link to="/settings" className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white"><Settings size={18} />Settings</Link>
        <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 px-2 pt-3 text-white"><Avatar initials={initials} avatarUrl={avatarUrl} /><div><p className="text-sm font-bold">{displayName}</p><p className="text-[11px] text-zinc-500">Student</p></div><button type="button" onClick={onLogout} className="ml-auto cursor-pointer text-red-400/70 transition-all duration-200 hover:text-red-400 hover:drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]" aria-label="Log out" title="Log out"><LogOut size={15} /></button></div>
      </div>
    </aside>
  );
}

function SectionHeader({ title, link }) {
  return <div className="mb-3.5 flex items-center justify-between"><h2 className="text-lg font-bold tracking-tight">{title}</h2>{link && <Link to="/browse" className="text-xs font-bold text-zinc-400 hover:text-white">{link}</Link>}</div>;
}

function Dashboard({ session, errorMessage = "" }) {
  const displayName = getDisplayName(session);
  const initials = getInitials(displayName);
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const handleLogout = () => supabase.auth.signOut();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (event) => {
    if (event.key === "Enter" && searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const [dashboardData, setDashboardData] = useState({ categories: [], listings: [], favorites: new Set(), bookings: new Set(), myListings: 0, activeListings: 0, savedItems: 0, avatarUrl: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(errorMessage);

  const loadDashboardData = useCallback(async () => {
    setLoadError("");

    const [categoriesResult, listingsResult, favoritesResult, bookingsResult, myListingsResult, activeListingsResult, profileResult] = await Promise.all([
      supabase.from("categories").select("id, name, slug, icon").eq("is_active", true).order("name"),
      supabase.from("listings").select("id, title, description, price, condition, location, image_url, seller_id, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(8),
      supabase.from("favorites").select("listing_id").eq("user_id", session.user.id),
      supabase.from("orders").select("listing_id").eq("buyer_id", session.user.id).in("status", ["pending", "confirmed"]),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", session.user.id),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("avatar_url").eq("id", session.user.id).maybeSingle(),
    ]);

    const failedResult = [categoriesResult, listingsResult, favoritesResult, bookingsResult, myListingsResult, activeListingsResult, profileResult].find(result => result.error);
    if (failedResult) {
      setLoadError(failedResult.error.message);
      setIsLoading(false);
      return;
    }

    const sellerIds = [...new Set((listingsResult.data || []).map(listing => listing.seller_id).filter(Boolean))];
    const profilesResult = sellerIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", sellerIds)
      : { data: [], error: null };

    if (profilesResult.error) {
      setLoadError(profilesResult.error.message);
      setIsLoading(false);
      return;
    }

    const profilesById = new Map((profilesResult.data || []).map(profile => [profile.id, profile]));

    setDashboardData({
      categories: categoriesResult.data || [],
      listings: (listingsResult.data || []).map(listing => ({
        ...listing,
        profiles: profilesById.get(listing.seller_id),
      })),
      favorites: new Set((favoritesResult.data || []).map(favorite => favorite.listing_id)),
      bookings: new Set((bookingsResult.data || []).map(booking => booking.listing_id)),
      myListings: myListingsResult.count || 0,
      activeListings: activeListingsResult.count || 0,
      savedItems: favoritesResult.data?.length || 0,
      avatarUrl: profileResult.data?.avatar_url || "",
    });
    setIsLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    // Load external dashboard data once when the authenticated user changes.
    // eslint-disable-next-line react/set-state-in-effect
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRetry = () => {
    setIsLoading(true);
    loadDashboardData();
  };

  const handleToggleFavorite = async listingId => {
    const isFavorite = dashboardData.favorites.has(listingId);
    const result = isFavorite
      ? await supabase.from("favorites").delete().eq("user_id", session.user.id).eq("listing_id", listingId)
      : await supabase.from("favorites").insert({ user_id: session.user.id, listing_id: listingId });

    if (result.error) {
      setLoadError(result.error.message);
      return;
    }

    const favorites = new Set(dashboardData.favorites);
    if (isFavorite) {
      favorites.delete(listingId);
    } else {
      favorites.add(listingId);
    }
    setDashboardData(current => ({ ...current, favorites, savedItems: favorites.size }));
  };

  const handleBookListing = async listingId => {
    if (dashboardData.bookings.has(listingId)) return;
    const { error } = await supabase.from("orders").insert({
      listing_id: listingId,
      buyer_id: session.user.id,
      status: "pending",
    });

    if (error) {
      setLoadError(`Booking failed: ${error.message}`);
      return;
    }

    setDashboardData(current => ({
      ...current,
      bookings: new Set([...current.bookings, listingId]),
    }));
  };

  const stats = [[Package, dashboardData.myListings, "My Listings", "bg-zinc-800 text-white"], [Tag, dashboardData.activeListings, "Active Listings", "bg-zinc-800 text-white"], [Heart, dashboardData.savedItems, "Saved Items", "bg-zinc-800 text-white"]];
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto flex max-w-[1500px]"><Sidebar displayName={displayName} initials={initials} avatarUrl={dashboardData.avatarUrl} onLogout={() => setShowLogoutDialog(true)} />
        <main className="min-w-0 flex-1 px-4 pb-10 sm:px-7 xl:px-10">
          <header className="flex h-16 items-center gap-3 border-b border-zinc-800 sm:h-20 sm:gap-5">
            <button className="cursor-pointer lg:hidden" aria-label="Open navigation"><Menu /></button>
            <label className="relative min-w-0 flex-1 sm:max-w-md"><Search className="absolute left-3 top-3 text-zinc-500" size={17} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-1 focus:ring-white" placeholder="Search items, books, electronics..." /></label>
            <div className="hidden flex-1 sm:block" />
            <div className="flex items-center gap-2 text-sm font-bold"><Avatar initials={initials} avatarUrl={dashboardData.avatarUrl} /><span className="hidden sm:block">{displayName}</span><button type="button" onClick={() => setShowLogoutDialog(true)} className="ml-1 grid size-9 cursor-pointer place-items-center rounded-lg text-red-400/70 transition-all duration-200 hover:bg-red-950/30 hover:text-red-400 hover:shadow-[0_0_10px_rgba(248,113,113,0.25)]" aria-label="Log out" title="Log out"><LogOut size={17} /></button></div>
          </header>
          <section className="flex flex-col gap-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:py-9"><div><p className="text-xs font-bold text-zinc-500">YOUR CAMPUS, YOUR MARKETPLACE</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-[33px]">Good morning, {displayName} 👋</h1><p className="mt-1.5 text-sm text-zinc-400">Find something useful around your campus.</p></div><Link to="/sell" className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black hover:bg-zinc-200"><Plus size={17} />Sell an Item</Link></section>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">{stats.map(([Icon, value, label, color]) => <article key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:-translate-y-1 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"><div className={`mb-3 grid size-9 place-items-center rounded-xl ${color}`}><Icon size={18} /></div><p className="text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-zinc-400">{label}</p></article>)}</section>
          <section className="mt-7"><SectionHeader title="Browse Categories" link="View all" />{isLoading ? <LoadingState /> : loadError ? <ErrorState message={loadError} onRetry={handleRetry} /> : dashboardData.categories.length ? <div className="flex gap-2.5 overflow-x-auto pb-1">{dashboardData.categories.map(category => <Link key={category.id} to={`/browse?category=${category.id}`} className="min-w-[105px] rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-3 text-center text-[11px] font-semibold text-zinc-300 hover:border-zinc-600"><CategoryIcon slug={category.slug} name={category.name} />{category.name}</Link>)}</div> : <EmptyState title="No categories yet" message="Add active categories in Supabase to start browsing." />}</section>
          <section className="mt-8"><SectionHeader title="Recently Listed" link="Explore marketplace" />{isLoading ? <LoadingState /> : loadError ? <ErrorState message={loadError} onRetry={handleRetry} /> : dashboardData.listings.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">{dashboardData.listings.slice(0, 4).map(item => <ProductCard key={item.id} item={item} isFavorite={dashboardData.favorites.has(item.id)} isBooked={dashboardData.bookings.has(item.id)} canBook={item.seller_id !== session.user.id} onToggleFavorite={handleToggleFavorite} onBook={handleBookListing} />)}</div> : <EmptyState title="No listings yet" message="Be the first student to list something useful for your campus." />}</section>
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_290px]"><section className="mt-8"><SectionHeader title="Recommended for You" link="See more" />{isLoading ? <LoadingState /> : loadError ? <ErrorState message={loadError} onRetry={handleRetry} /> : dashboardData.listings.length > 4 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{dashboardData.listings.slice(4).map(item => <ProductCard key={item.id} item={item} isFavorite={dashboardData.favorites.has(item.id)} isBooked={dashboardData.bookings.has(item.id)} canBook={item.seller_id !== session.user.id} onToggleFavorite={handleToggleFavorite} onBook={handleBookListing} />)}</div> : <EmptyState title="No recommendations yet" message="Recommendations will appear after more students list items." />}</section><section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-white"><h2 className="text-lg font-bold tracking-tight">Campus Activity</h2><p className="mt-1 text-xs text-zinc-400">What’s happening around campus</p><div className="mt-4">{loadError ? <ErrorState message={loadError} onRetry={handleRetry} /> : <EmptyState title="Activity tracking is not connected" message="Marketplace activity updates will appear here." />}</div></section></div>
        </main>
    </div>
      <LogoutDialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)} onConfirm={handleLogout} />
    </div>
  );
}

export default Dashboard;
