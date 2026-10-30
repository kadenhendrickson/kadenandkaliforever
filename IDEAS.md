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

## Ways to tell the engagement story

*Added 2026-10-30 by Kaden (ideas drafted with Claude).*

The Our Story section now opens with one always-visible paragraph and a "Read more" that
unfolds the rest. Some directions for what the longer version could become:

- **Chapters.** Three or four short titled pieces ("The Match", "The First Trip", "The
  Question"), each with a small-caps date and one or two paragraphs. Easy to write, easy to
  skim, and it fits the collapsible as-is.
- **Two voices.** The proposal told twice, side by side: "In Kaden's words" and "In Kali's
  words". Guests love the mismatch in what each person remembers. Works as two columns on
  desktop, stacked on phones.
- **A map of places.** A minimal line-drawn map (hairline strokes, no color) marking where you
  met, a first-date spot, and where the proposal happened, each with a sentence. Could be a
  single inline SVG.
- **The photo pair.** Two black-and-white photographs under the story: one from early on, one
  from the engagement. The grayscale treatment is already automatic.
- **Hidden heart.** Tapping the ♡ on the holding page, or a small ♡ at the end of the story,
  reveals one private-feeling sentence: the thing you said to each other right after.
- **The story so far, as a rail.** Reuse the scroll-driven timeline idea above for the
  relationship itself, then hand off to the weekend timeline on the details page. Same visual
  language, two timelines.
- **Guest contributions.** A line at the end inviting guests to send a memory or a photo of the
  two of you, collected through a simple Apps Script form like the RSVP. Could become a page of
  its own later.
