import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Shield } from "lucide-react";

type RoomMessage = {
  id: number;
  body: string;
  authorId: number;
  authorUsername: string;
  authorTrustLevel: number;
  createdAt: string;
};

export default function ChatRoom() {
  const params = useParams();
  const slug = params.slug ?? "";
  const { data: user } = useGetCurrentUser();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const url =
          lastIdRef.current > 0
            ? `/api/chat/rooms/${slug}/messages?sinceId=${lastIdRef.current}`
            : `/api/chat/rooms/${slug}/messages`;
        const res = await customFetch<{ messages: RoomMessage[] }>(url, {
          method: "GET",
        });
        if (cancelled) return;
        if (res.messages.length > 0) {
          setMessages((prev) => {
            const merged =
              lastIdRef.current === 0 ? res.messages : [...prev, ...res.messages];
            lastIdRef.current = Math.max(...merged.map((m) => m.id));
            return merged;
          });
        }
      } catch {
        // ignore
      }
    }
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [slug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await customFetch(`/api/chat/rooms/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setBody("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Link href="/chat">
          <Button
            variant="ghost"
            size="sm"
            className="font-mono uppercase tracking-wider text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </Link>
        <h1 className="font-serif text-2xl text-primary tracking-widest uppercase">
          #{slug}
        </h1>
      </div>

      <div
        ref={scrollRef}
        className="border border-border/50 bg-card/20 backdrop-blur-sm h-[60vh] overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground font-mono text-xs uppercase tracking-wider py-12">
            No transmissions yet. Be the first to break silence.
          </div>
        ) : (
          messages.map((m) => {
            const mine = user?.id === m.authorId;
            return (
              <div
                key={m.id}
                className="border-l-2 border-border/40 pl-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
                  <span className={mine ? "text-primary" : "text-foreground"}>
                    {m.authorUsername}
                  </span>
                  {m.authorTrustLevel >= 3 && (
                    <Shield className="w-3 h-3 text-accent" />
                  )}
                  <span className="text-muted-foreground text-[10px]">
                    {formatDistanceToNow(new Date(m.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <div className="font-mono text-sm text-foreground whitespace-pre-wrap mt-1">
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Transmit..."
          className="font-mono text-sm bg-background/50 border-border rounded-none focus-visible:ring-primary/50"
        />
        <Button
          type="submit"
          disabled={sending || !body.trim()}
          className="font-serif tracking-widest uppercase rounded-none"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
