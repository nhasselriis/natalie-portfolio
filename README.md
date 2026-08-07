# N.K. Hasselriis Portfolio

A responsive three-page portfolio built with semantic HTML, a shared CSS file, and a small JavaScript file for accessible contact-form validation.

## Pages

- `index.html` — home page and Campus.edu experience
- `about.html` — biography, author notebook, personal interests, and contact form
- `projects.html` — current creative projects

## Visual Design and Gestalt Principles

- **Proximity:** Each image, heading, and description is grouped inside one feature row so visitors can immediately understand which content belongs together.
- **Similarity:** Repeated borders, image treatments, heading styles, and spacing make Campus features, interests, and projects feel like members of the same visual system.
- **Common region:** Related content is enclosed inside cards and parchment-style sections, separating each topic from surrounding content.
- **Figure-ground:** Cream and parchment content panels contrast with the forest-green header and darker footer to keep the reading areas visually distinct.

## Responsive Layout

- CSS Grid is used for the hero, biography, project, interest, and form layouts.
- The desktop layout is optimized for approximately 1200px and wider screens.
- Tablet layouts adjust at `900px` and `760px`.
- Mobile layouts stack into one column at `600px`, with an additional adjustment at `380px` for 320px-wide devices.
- Images remain fluid with `max-width: 100%`, and text containers use flexible widths rather than fixed page dimensions.

## Accessible Form

- Every form control has a visible `<label>`.
- Radio choices are grouped with `<fieldset>` and `<legend>`.
- Required fields use native HTML validation properties and custom, visible error messages.
- Invalid fields receive `aria-invalid="true"`, and their errors are connected through `aria-describedby`.
- Form feedback is announced through an `aria-live` status region.
- Keyboard users receive visible focus indicators, and every page includes a skip link.

## Accessibility Fix Log

- Added a “Skip to main content” link to all three pages so keyboard users can bypass repeated navigation.
- Added visible `:focus-visible` outlines so links and form controls are easy to locate without a mouse.
- Corrected mismatched Reading and Baking image sources so each alternative-text description matches the displayed image.
- Added semantic form labels, instructions, grouped controls, and programmatically connected error messages.
- Kept meaningful alternative text on content images and used empty decorative CSS rather than unnecessary image descriptions.