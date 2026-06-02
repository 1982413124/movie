# Home Hero Opening Design

## Summary

Add a GSAP-based opening animation to the existing top page at `frontend/app/page.tsx` without removing the current search area, sidebar, or movie lists. The new hero sits above the current top-page content and plays an opening sequence only when the page is loaded fresh, such as a browser reload or opening the page in a new tab. The animation does not replay when the user navigates away and returns to the top page within the same tab through client-side routing.

The visual direction is based on the approved "Option C" concept, softened into a pop-oriented look with milky coral, apricot, ivory, and a small berry-toned accent. The animation should feel soft and quiet rather than flashy.

## Goals

- Keep the existing top-page content intact.
- Add a hero section at the top of the page.
- Show a short opening overlay before the hero content appears.
- Reveal hero elements in sequence: heading, body, buttons, then the right-side abstract shapes.
- Keep file sizes manageable by splitting the feature into focused components and a hook.
- Make hero copy easy for the user to edit later.
- Support reduced-motion users with a shortened or near-static version.

## Non-Goals

- Replacing or redesigning the existing search area, sidebar, or movie cards.
- Introducing image assets for the hero.
- Creating a separate landing page route.
- Building a generic animation framework for the rest of the app.

## Approved UX Rules

- The top page remains the existing `"/"` route.
- The opening animation runs when the top page is freshly loaded.
- The opening animation does not replay when returning to the top page through client-side navigation in the same tab.
- Existing top-page sections remain below the new hero.
- Initial hero copy is written by the implementation, but should be easy for the user to replace later.
- No image assets are required for the first version.

## Proposed File Structure

- `frontend/app/page.tsx`
  - Keep this file as the page composition layer.
  - Insert the new hero directly below `MainHeader` and above the existing search area.
- `frontend/app/components/home/HomeHero.tsx`
  - Render the hero layout and editable copy content.
  - Hold or import a small set of content constants so the user can change text without touching animation logic.
- `frontend/app/components/home/OpeningOverlay.tsx`
  - Render the opening background layer and centered loading text.
  - Remain focused on the overlay only.
- `frontend/app/components/home/AbstractShapes.tsx`
  - Render the right-side shapes using CSS and SVG.
  - Avoid external assets.
- `frontend/app/components/home/useHomeOpening.ts`
  - Own the GSAP timeline and the replay conditions.
  - Expose refs and simple state needed by the hero and overlay.

## Visual Design

### Layout

The hero is a standalone block above the current top-page body. On desktop it uses a two-column layout:

- Left column: eyebrow, main heading, body text, and two buttons.
- Right column: a layered abstract shape composition.

On mobile the layout stacks vertically, with text first and abstract shapes below.

### Color Direction

The visual direction uses the approved softened editorial-pop approach:

- Base background: ivory / warm off-white
- Main accents: milky coral and apricot
- Minor accent: muted berry tone
- Supporting neutrals: warm gray and soft charcoal for readable text

The result should feel playful and soft, not loud or candy-bright.

### Copy

Initial copy is implementation-defined, but it must live in one obvious place so the user can edit:

- eyebrow text
- heading
- body text
- primary button label
- secondary button label
- opening loading text

The first implementation should use short, polished placeholder copy that suits a movie site.

### Assets

No image assets are required for this version. The hero illustration area is built from CSS and SVG only.

## Animation Design

### Opening Sequence

The opening is a hero-specific introduction rather than a full-screen hard lock. It should feel like a soft layer over the top area.

Sequence:

1. A soft background overlay fades in over the hero area.
2. A short loading text appears in the center.
3. The loading text fades away.
4. The hero heading appears.
5. The body text appears.
6. The button group appears.
7. The abstract shape group appears last with a slightly more playful motion than the text.
8. The overlay fully clears, leaving the hero in its resting state.

### Motion Language

The motion should stay restrained:

- use `opacity`
- use a small upward offset such as `y: 16` to `24`
- use subtle `scale: 0.96 -> 1`
- optionally remove a light blur during reveal
- avoid bouncy or large-distance movement

Target total duration:

- approximately `1.8s` to `2.4s`

This should feel like a gentle intro, not a loading delay.

### Replay Rules

The GSAP control hook should keep a module-scoped replay flag:

- fresh page load: replay flag starts clear, animation plays
- client-side return in the same tab: replay flag remains set, animation is skipped

This matches the approved definition of "open the top page."

## Accessibility

- Respect `prefers-reduced-motion`.
- In reduced-motion mode, skip the long sequence and show the hero in a near-final state with minimal fade only, or immediately if needed.
- Keep text contrast readable against the warm background palette.
- Do not depend on animation to expose required navigation or information.

## Implementation Notes

- Add `gsap` and `@gsap/react` to the frontend app if they are not already installed.
- Use the React-safe GSAP setup pattern in the dedicated hook rather than mixing animation code into the page file.
- Keep `frontend/app/page.tsx` focused on composition so the new feature does not push it further into an oversized mixed-responsibility file.

## Verification Plan

Validate the following after implementation:

- Reloading the top page plays the opening sequence.
- Opening the top page in a new tab plays the opening sequence.
- Navigating away and returning to the top page in the same tab does not replay the opening.
- The hero layout remains stable on desktop and mobile widths.
- Reduced-motion users do not get the full animated sequence.
- Existing search, sidebar, and movie list sections still render below the hero.

## Risks And Constraints

- `frontend/app/page.tsx` is already large, so the implementation must avoid adding direct animation logic there.
- The replay behavior depends on the route remaining in the same client runtime; full reloads intentionally reset the state.
- The hero must visually integrate with the current header and top-page sections even though those areas are not being redesigned in this change.
