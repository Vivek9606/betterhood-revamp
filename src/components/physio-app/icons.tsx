// Line icons, 24px grid, drawn with currentColor so they follow the text colour and theme.
const P: Record<string, string> = {
  back: "M15 18l-6-6 6-6",
  next: "M9 6l6 6-6 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  shield: "M12 3l7 3v5.5c0 4.4-3 8.3-7 9.5-4-1.2-7-5.1-7-9.5V6zM8.8 12.2l2.2 2.2 4.4-4.6",
  search: "M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15zM16 16l5 5",
  pen: "M4 20h4L19.5 8.5a2.1 2.1 0 00-3-3L5 17v3zM14.5 7.5l2 2",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20.5a7.5 7.5 0 0115 0",
  today: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 16a4 4 0 100-8 4 4 0 000 8z",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.3a3.5 3.5 0 010 6.4M18 14.2a6.5 6.5 0 013.5 5.8",
  studio: "M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5zM13 4h5.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H13zM7 8h1.5M7 11h1.5M16 8h1.5M16 11h1.5",
  bell: "M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0",
  camera: "M4 8.5A1.5 1.5 0 015.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5zM12 16a3 3 0 100-6 3 3 0 000 6z",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h4",
  lock: "M6.5 11h11v9h-11zM8.5 11V8a3.5 3.5 0 017 0v3",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  share: "M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  copy: "M9 9h10v11H9zM5 15V5a1 1 0 011-1h9",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  book: "M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5zM5 19.5A1.5 1.5 0 006.5 21H19",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3",
  alert: "M12 3l9.5 17h-19zM12 10v4M12 17.2v.1",
  eye: "M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7zM12 15a3 3 0 100-6 3 3 0 000 6z",
  bookmark: "M6 3.5h12V21l-6-4-6 4z",
  chat: "M4 5h16v11H9l-5 4z",
  phone: "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2",
  wa: "M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3zM8.8 8.2c.2-.4.5-.4.8-.4h.5c.2 0 .4 0 .6.5l.8 1.8c.1.2.1.4 0 .6l-.5.7c-.1.2-.2.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.8c.3.1.4.3.4.5 0 .7-.4 1.6-1.4 1.9-1 .3-2.4 0-4.2-1.3a10 10 0 01-3-3.4c-.8-1.6-.6-2.8-.3-3.4z",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2",
  moon: "M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z",
  wifi: "M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01M3 3l18 18",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  refresh: "M20 11a8 8 0 10-2.3 5.7M20 4v7h-7",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  stage: "M4 19h16M6 15V9M10 15V5M14 15v-4M18 15V8",
};

export function Icon({ name, size = 20, stroke = 1.8, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? ""} />
    </svg>
  );
}
