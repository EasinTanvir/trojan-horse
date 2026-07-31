"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconX } from "@/components/ui/icons";

/**
 * In-page English ⇄ Bangla translation, offered on first visit.
 *
 * Why this exists rather than relying on the browser: Chrome and Edge only
 * offer their native "Translate this page?" bar when the page language differs
 * from the *user's* browser language. A site cannot trigger it. Our pages are
 * lang="en", so a Bangla-speaking visitor whose browser is set to English is
 * never offered anything — which is exactly the person who needs it most on a
 * public-safety tool.
 *
 * Uses Google's free website translate element (no key, no billing, in keeping
 * with "no paid APIs"). It is a third-party script and only loads once the
 * visitor actually asks to translate — not on every page view — so nobody who
 * ignores the bar has their page sent to Google.
 */
const DISMISS_KEY = "nirapod:translate-offer-dismissed";
const SCRIPT_ID = "google-translate-script";

export function TranslateBar() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    /* Everything is deferred a tick: React Compiler rejects a synchronous
       setState in an effect body, and none of this needs to be immediate. */
    const timer = setTimeout(() => {
      if (document.cookie.includes("googtrans=/en/bn")) {
        setActive(true);
        return;
      }
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
      setVisible(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const loadScript = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (scriptLoaded.current || window.google?.translate) {
          resolve();
          return;
        }

        window.googleTranslateElementInit = () => {
          try {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: "en",
                includedLanguages: "bn,en",
                autoDisplay: false,
              },
              "google_translate_element",
            );
            scriptLoaded.current = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src =
          "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        script.onerror = () => reject(new Error("translate script failed"));
        document.body.appendChild(script);
      }),
    [],
  );

  /** Drives the widget's hidden <select>, which is how it applies a language. */
  const applyLanguage = useCallback((code) => {
    const select = document.querySelector(".goog-te-combo");
    if (!select) return false;
    select.value = code;
    select.dispatchEvent(new Event("change"));
    return true;
  }, []);

  async function translateToBangla() {
    setLoading(true);
    try {
      await loadScript();

      /* The widget mounts its <select> a tick after init. */
      let attempts = 0;
      const tick = setInterval(() => {
        attempts += 1;
        if (applyLanguage("bn") || attempts > 20) {
          clearInterval(tick);
          setLoading(false);
          setActive(true);
          setVisible(false);
        }
      }, 150);
    } catch {
      setLoading(false);
      setVisible(false);
    }
  }

  function showEnglish() {
    /* Clearing the cookie and reloading is the only reliable way back — the
       widget rewrites text nodes in place and has no clean undo. */
    const host = window.location.hostname;
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=; path=/; domain=.${host}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    window.location.reload();
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <>
      {/* The widget renders into here; kept out of the layout flow. */}
      <div id="google_translate_element" className="sr-only" aria-hidden="true" />

      {active ? (
        <div className="border-b border-border-subtle bg-surface-alt">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-1.5 text-xs text-ink-muted sm:px-6">
            <span translate="no" className="notranslate">
              বাংলায় অনূদিত · Machine translated
            </span>
            <button
              type="button"
              onClick={showEnglish}
              translate="no"
              className="notranslate rounded-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
            >
              Show English
            </button>
          </div>
        </div>
      ) : null}

      {visible ? (
        <div
          className={cn(
            "border-b border-border-subtle bg-brand-primary-soft",
            "animate-toast-in",
          )}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
            <p
              translate="no"
              className="notranslate min-w-0 flex-1 text-sm text-ink"
            >
              এই সাইটটি বাংলায় দেখতে চান?{" "}
              <span className="text-ink-muted">
                Translate this page to Bangla?
              </span>
            </p>

            <button
              type="button"
              onClick={translateToBangla}
              disabled={loading}
              translate="no"
              className="notranslate inline-flex h-8 items-center rounded-md bg-brand-primary px-3 text-xs font-medium text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-60"
            >
              {loading ? "অনুবাদ হচ্ছে…" : "বাংলায় দেখুন"}
            </button>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss translation offer"
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <IconX className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default TranslateBar;
