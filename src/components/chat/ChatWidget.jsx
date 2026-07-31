"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconMapPin,
  IconShieldCheck,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";
import { api } from "@/lib/axios";
import { cn } from "@/lib/cn";

/**
 * Floating safety assistant.
 *
 * Location is opt-in and asked for explicitly rather than on page load — a
 * silent geolocation prompt the moment someone opens a chat window is the kind
 * of thing people (rightly) deny out of reflex. Without it the assistant says
 * so plainly instead of guessing.
 */
const GREETING = {
  role: "assistant",
  content:
    "Hi — I'm the Nirapod Path safety assistant. Share your location and I'll tell you which reported hotspots are around you and how to steer clear of them. You can also ask me anything about using the app.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  /* Keep the newest message in view as the conversation grows. */
  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLocationDenied(false);
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              "Got your location. Ask me what's nearby, or where you're heading and I'll suggest a safer way.",
          },
        ]);
      },
      () => {
        setLocating(false);
        setLocationDenied(true);
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              "Please turn on your location to get suggestions — without it I can't tell you what's around you or suggest a safer path. You can still ask me general questions about the app.",
          },
        ]);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  async function send(event) {
    event?.preventDefault();

    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const response = await api.post("/chat", {
        messages: next.filter((m) => m !== GREETING),
        location,
      });

      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.data.data.reply },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error?.readableMessage ??
            "I couldn't reach the assistant just then. Please try again.",
          failed: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close safety assistant" : "Open safety assistant"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 bottom-4 z-50 flex size-13 items-center justify-center rounded-full text-white shadow-elevated transition-colors",
          "bg-brand-primary hover:bg-brand-primary-dark",
          "sm:right-6 sm:bottom-6",
        )}
      >
        {open ? (
          <IconX className="size-6" />
        ) : (
          <IconShieldCheck className="size-6" />
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Safety assistant"
          className={cn(
            "fixed inset-x-3 bottom-20 z-[999999] flex max-h-[min(34rem,calc(100svh-7rem))] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-overlay animate-toast-in",
            "sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-96",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border-subtle bg-brand-primary px-3 py-2.5 text-white">
            <IconShieldCheck className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">
                Safety assistant
              </p>
              <p className="truncate text-xs text-white/80">
                {location
                  ? "Using your location"
                  : "Location off — answers will be general"}
              </p>
            </div>

            {!location ? (
              <button
                type="button"
                onClick={requestLocation}
                disabled={locating}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-white/15 px-2 text-xs font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-60"
              >
                {locating ? (
                  <IconSpinner className="size-3.5" />
                ) : (
                  <IconMapPin className="size-3.5" />
                )}
                {locating ? "Locating…" : "Use location"}
              </button>
            ) : null}
          </div>

          {locationDenied && !location ? (
            <div className="flex items-start gap-2 border-b border-danger/30 bg-danger-soft px-3 py-2">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
              <p className="text-xs text-ink">
                Please turn on your location to get suggestions about
                what&rsquo;s around you.
              </p>
            </div>
          ) : null}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    message.role === "user"
                      ? "bg-brand-primary text-white"
                      : message.failed
                        ? "border border-danger/30 bg-danger-soft text-ink"
                        : "border border-border-subtle bg-surface-alt text-ink",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending ? <TypingIndicator /> : null}
          </div>

          {/* Composer */}
          <form
            onSubmit={send}
            className="flex items-end gap-2 border-t border-border-subtle bg-surface-alt px-3 py-2.5"
          >
            <label htmlFor="chat-input" className="sr-only">
              Message the safety assistant
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) send(event);
              }}
              placeholder="What's dangerous near me?"
              className="max-h-24 min-h-9 flex-1 resize-none rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-9 shrink-0 items-center rounded-md bg-brand-primary px-3 text-sm font-medium text-white transition-colors hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <IconSpinner className="size-4" /> : "Send"}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

/** Three-dot "thinking" bubble — the loader while Groq is generating. */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-alt px-3 py-2.5">
        <span className="sr-only">The assistant is typing</span>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-ink-muted"
            style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

export default ChatWidget;
