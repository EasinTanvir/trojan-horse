/**
 * Inline SVG icon set.
 *
 * Hand-rolled rather than pulled from an icon package so the demo has no extra
 * runtime dependency and renders offline. All icons inherit `currentColor` and
 * size from the `className` passed in, so a caller sets color once on the
 * parent and the icon follows.
 *
 * The three status glyphs (clock / check / shield) are the app's signature
 * element — see 05-ui-guidelines.md. Don't swap them per screen.
 */

function BaseIcon({ className = "size-4", children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* --- Status glyphs (signature element) ---------------------------------- */

/** `under_review` — work is queued, time is passing. */
export function IconClock(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

/** `resolved` — the authority acted on it. */
export function IconCheckCircle(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </BaseIcon>
  );
}

/** `verified` — the City Corporation's official seal. Used nowhere else. */
export function IconShieldCheck(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v5.5c0 4 2.9 7.6 7 9.5 4.1-1.9 7-5.5 7-9.5V6l-7-3Z" />
      <path d="m9.25 11.75 2 2 3.5-4" />
    </BaseIcon>
  );
}

/* --- Report types -------------------------------------------------------- */

/** `hazard` — broken infrastructure, open manhole, exposed wiring. */
export function IconHazard(props) {
  return (
    <BaseIcon {...props}>
      <path d="M10.3 4.3 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

/** `crime_hotspot` — mugging, snatching, repeated incidents. */
export function IconCrime(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </BaseIcon>
  );
}

/* --- Interface ----------------------------------------------------------- */

export function IconX(props) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </BaseIcon>
  );
}

export function IconChevronDown(props) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function IconAlertTriangle(props) {
  return (
    <BaseIcon {...props}>
      <path d="M10.3 4.3 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function IconInfo(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </BaseIcon>
  );
}

export function IconMapPin(props) {
  return (
    <BaseIcon {...props}>
      <path d="M19 10c0 5.2-7 11-7 11s-7-5.8-7-11a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </BaseIcon>
  );
}

export function IconRoute(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="6" cy="18.5" r="2.5" />
      <circle cx="18" cy="5.5" r="2.5" />
      <path d="M15.5 5.5H10a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7H8.5" />
    </BaseIcon>
  );
}

export function IconMap(props) {
  return (
    <BaseIcon {...props}>
      <path d="m9 4-6 2.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" />
      <path d="M9 4v13M15 6.5v13" />
    </BaseIcon>
  );
}

export function IconList(props) {
  return (
    <BaseIcon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </BaseIcon>
  );
}

export function IconPlus(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  );
}

export function IconSiren(props) {
  return (
    <BaseIcon {...props}>
      <path d="M6 17a6 6 0 0 1 12 0" />
      <path d="M4 17h16" />
      <path d="M4 21h16" />
      <path d="M12 4v2M5.5 6.5 7 8M18.5 6.5 17 8" />
    </BaseIcon>
  );
}

export function IconMenu(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </BaseIcon>
  );
}

export function IconLogout(props) {
  return (
    <BaseIcon {...props}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M9 8 5 12l4 4" />
      <path d="M5 12h10" />
    </BaseIcon>
  );
}

export function IconCamera(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </BaseIcon>
  );
}

export function IconSpinner({ className = "size-4", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} animate-spin`}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
