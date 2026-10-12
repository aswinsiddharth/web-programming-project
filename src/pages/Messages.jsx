import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";

function Messages({ session }) {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [profiles, setProfiles] = useState(new Map());
  const [messageText, setMessageText] = useState("");
  const [recipientId] = useState(searchParams.get("seller") || "");
  const [listingId] = useState(searchParams.get("listing") || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const { data, error: messagesError } = await supabase.from("messages").select("id, sender_id, receiver_id, listing_id, body, read_at, created_at").or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`).order("created_at", { ascending: true });
    if (messagesError) {
      setError(messagesError.message);
      setIsLoading(false);
      return;
    }

    const profileIds = [...new Set([...((data || []).flatMap(message => [message.sender_id, message.receiver_id])), recipientId].filter(Boolean))];
    const profilesResult = profileIds.length ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", profileIds) : { data: [], error: null };
    if (profilesResult.error) {
      setError(profilesResult.error.message);
      setIsLoading(false);
      return;
    }

    setMessages(data || []);
    setProfiles(new Map((profilesResult.data || []).map(profile => [profile.id, profile])));
    setIsLoading(false);
  }, [recipientId, session.user.id]);

  useEffect(() => {
    // Load history once for the authenticated user and selected seller.
    // eslint-disable-next-line react/set-state-in-effect
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        payload => {
          const message = payload.new;
          if (message.sender_id !== session.user.id && message.receiver_id !== session.user.id) return;
          setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
        }
      )
      .subscribe(status => {
        if (status === "CHANNEL_ERROR") {
          setError("Realtime messaging is unavailable. Refresh to check for new messages.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user.id]);

  const sendMessage = async event => {
    event.preventDefault();
    if (!recipientId || !messageText.trim()) return;
    setIsSending(true);
    setError("");
    const { error: sendError } = await supabase.from("messages").insert({
      sender_id: session.user.id,
      receiver_id: recipientId,
      listing_id: listingId || null,
      body: messageText.trim(),
    });
    setIsSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setMessageText("");
  };

  const otherUser = message => message.sender_id === session.user.id ? message.receiver_id : message.sender_id;
  const recipientProfile = profiles.get(recipientId);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"><ArrowLeft size={16} />Back to dashboard</Link>
        <div className="mt-8 border-b border-zinc-800 pb-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Community</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Messages</h1><p className="mt-2 text-sm text-zinc-400">Talk to students about listings and bookings.</p><div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-900/70 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-200"><AlertTriangle className="mt-0.5 shrink-0" size={14} /><span>Messages are automatically deleted after 7 days. Do not use chat for permanent records.</span></div></div>
        {error && <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">{error}<button type="button" onClick={loadMessages} className="ml-3 cursor-pointer underline">Try again</button></div>}
        {isLoading ? <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-14 text-center text-sm text-zinc-500">Loading messages...</div> : <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="min-h-96 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">{messages.length ? <div className="space-y-4">{messages.map(message => { const profile = profiles.get(otherUser(message)); const mine = message.sender_id === session.user.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? "bg-white text-black" : "bg-zinc-800 text-zinc-100"}`}><p className="mb-1 text-[10px] font-bold opacity-60">{mine ? "You" : profile?.full_name || "Student"}</p><p className="text-sm leading-5">{message.body}</p></div></div>; })}</div> : <div className="grid min-h-80 place-items-center text-center"><div><MessageCircle className="mx-auto text-zinc-600" size={30} /><p className="mt-3 font-semibold">No messages yet</p><p className="mt-2 text-sm text-zinc-500">Start a conversation from a marketplace listing.</p></div></div>}</section><form onSubmit={sendMessage} className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><h2 className="font-bold">New message</h2>{recipientId ? <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Messaging</p><p className="mt-1 text-sm font-semibold text-white">{recipientProfile?.full_name || "Student seller"}</p></div> : <div className="mt-5 rounded-lg border border-dashed border-zinc-700 px-3 py-4 text-sm text-zinc-500">Choose a seller from <Link to="/browse" className="font-semibold text-white underline">Browse Marketplace</Link> to start messaging.</div>}<label className="mt-4 block text-xs font-semibold text-zinc-300">Message<textarea value={messageText} onChange={event => setMessageText(event.target.value)} required={Boolean(recipientId)} disabled={!recipientId} maxLength={2000} rows={5} placeholder={recipientId ? "Hi, is this item still available?" : "Select a seller first"} className="mt-2 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white disabled:cursor-not-allowed disabled:opacity-50" /></label><button type="submit" disabled={isSending || !recipientId} className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"><Send size={15} />{isSending ? "Sending..." : "Send message"}</button></form></div>}
      </div>
    </main>
  );
}

export default Messages;
