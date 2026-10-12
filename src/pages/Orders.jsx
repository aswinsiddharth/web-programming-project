import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, Check, Clock3, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

function Orders({ session }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const { data: orderRows, error: ordersError } = await supabase.from("orders").select("id, listing_id, buyer_id, status, created_at, updated_at").or(`buyer_id.eq.${session.user.id},listing_id.in.(${(await getOwnListingIds(session.user.id)).join(",") || "00000000-0000-0000-0000-000000000000"})`).order("created_at", { ascending: false });
    if (ordersError) {
      setError(ordersError.message);
      setIsLoading(false);
      return;
    }
    const listingIds = [...new Set((orderRows || []).map(order => order.listing_id))];
    const listingsResult = listingIds.length ? await supabase.from("listings").select("id, title, price, image_url, seller_id").in("id", listingIds) : { data: [], error: null };
    if (listingsResult.error) {
      setError(listingsResult.error.message);
      setIsLoading(false);
      return;
    }
    const listingMap = new Map((listingsResult.data || []).map(listing => [listing.id, listing]));
    setOrders((orderRows || []).map(order => ({ ...order, listing: listingMap.get(order.listing_id) })).filter(order => order.listing));
    setIsLoading(false);
  }, [session.user.id]);

  useEffect(() => {
    // Load buyer and seller orders once for this page.
    // eslint-disable-next-line react/set-state-in-effect
    loadOrders();
  }, [loadOrders]);

  const updateOrder = async (orderId, status) => {
    const { error: updateError } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setOrders(current => current.map(order => order.id === orderId ? { ...order, status } : order));
  };

  const incoming = orders.filter(order => order.listing?.seller_id === session.user.id);
  const outgoing = orders.filter(order => order.buyer_id === session.user.id);
  const orderCard = (order, sellerView) => <article key={order.id} className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"><div className="size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-950">{order.listing.image_url ? <img src={order.listing.image_url} alt={order.listing.title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[10px] text-zinc-600">No image</div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="truncate font-bold">{order.listing.title}</h2><p className="mt-1 text-sm font-semibold">₹{Number(order.listing.price).toLocaleString("en-IN")}</p></div><span className="inline-flex h-fit items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-400">{order.status === "pending" ? <Clock3 size={11} /> : order.status === "confirmed" ? <Check size={11} /> : <X size={11} />}{order.status}</span></div>{sellerView && order.status === "pending" && <div className="mt-3 flex gap-2"><button type="button" onClick={() => updateOrder(order.id, "confirmed")} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black hover:bg-zinc-200"><Check size={14} />Confirm</button><button type="button" onClick={() => updateOrder(order.id, "cancelled")} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-950/40"><X size={14} />Decline</button></div>}</div></article>;

  return <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8 sm:py-10"><div className="mx-auto max-w-4xl"><Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"><ArrowLeft size={16} />Back to dashboard</Link><div className="mt-8 border-b border-zinc-800 pb-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Marketplace activity</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Orders</h1><p className="mt-2 text-sm text-zinc-400">Track your bookings and manage requests for your listings.</p></div>{error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">{error}<button type="button" onClick={loadOrders} className="ml-3 cursor-pointer underline">Try again</button></div>}{isLoading ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-14 text-center text-sm text-zinc-500">Loading orders...</div> : <div className="mt-8 space-y-10"><section><div className="mb-4 flex items-center gap-2"><CalendarCheck size={18} /><h2 className="text-lg font-bold">My bookings</h2></div>{outgoing.length ? <div className="space-y-3">{outgoing.map(order => orderCard(order, false))}</div> : <div className="rounded-2xl border border-dashed border-zinc-700 px-6 py-10 text-center text-sm text-zinc-500">You have not booked any items.</div>}</section><section><h2 className="mb-4 text-lg font-bold">Requests for my listings</h2>{incoming.length ? <div className="space-y-3">{incoming.map(order => orderCard(order, true))}</div> : <div className="rounded-2xl border border-dashed border-zinc-700 px-6 py-10 text-center text-sm text-zinc-500">No booking requests yet.</div>}</section></div>}</div></main>;
}

async function getOwnListingIds(userId) {
  const { data } = await supabase.from("listings").select("id").eq("seller_id", userId);
  return (data || []).map(listing => listing.id);
}

export default Orders;
