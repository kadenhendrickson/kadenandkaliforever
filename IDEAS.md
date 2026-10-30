# Ideas

A parking lot for future wedding-website ideas. Nothing here is committed to; add freely,
date each entry, and move an idea to a pull request when it is ready to build.

## Scroll-driven weekend timeline

*Added 2026-10-30 by Kaden.*

A timeline that reveals the weekend as guests scroll: Friday's welcome picnic, Saturday's
ceremony and reception, and whatever follows on Sunday, with each moment appearing in turn.

Notes for whoever builds it:

- Natural home is the details page (`admin/details/index.html`), where the schedule already
  lives, once that page is surfaced to guests.
- Keep the Rivera restraint: a single vertical hairline, small-caps times, display-serif
  titles, one short line of detail each. No icons or colored markers.
- Reveal with `IntersectionObserver` fading each entry in as it enters the viewport; respect
  `prefers-reduced-motion` by showing everything at once. CSS scroll-driven animations could
  replace the observer later, but they are not yet universal.
- Mobile first: a single left-aligned rail works on phones; on wide screens entries could
  alternate sides of the rail.
- Content needed before building: confirmed times for Friday, Saturday, and anything on
  Sunday.
