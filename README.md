# N.K. Hasselriis Portfolio

A responsive five-page personal portfolio built with semantic HTML, a shared CSS file, and a small JavaScript file for accessible contact-form validation. The visual style combines parchment, taped journal cards, warm Earth Kingdom-inspired colors, and character sign-offs inspired by *Avatar: The Last Airbender*.

## Pages

- `index.html` — home page with a featured section for *Archway*, Campus.edu experience, and Uncle Iroh sign-off
- `about.html` — biography, creative interests and hobbies, contact form, and Katara sign-off
- `projects.html` — creative projects including the Futurama podcast, fountain pen comic, and *Anastasia* art piece, with King Bumi sign-off
- `notebook.html` — notebook-style Notes page with Sokka sign-off
- `secret.html` — Secret landing page with Toph sign-off, the “Secret Tunnel!” easter egg, and the password gate for Jasmine Dragon: Zen Garden
- `tea-garden-snake.html` — hidden playable page for *Jasmine Dragon: Zen Garden*

## Visual Design and Gestalt Principles

- **Proximity:** Each image, heading, and description is grouped inside one feature row so visitors can immediately understand which content belongs together.
- **Similarity:** Repeated taped-paper cards, borders, image treatments, heading styles, spacing, and character sign-offs create a consistent visual language across pages.
- **Common region:** Related content is enclosed inside parchment and notebook-style sections, separating each topic from surrounding content.
- **Figure-ground:** Cream and parchment content panels contrast with the forest-green header and darker footer to keep reading areas visually distinct.

## Responsive Layout

- CSS Grid is used for the *Archway* feature, biography, Campus features, interests, projects, and contact layout.
- Larger screens use side-by-side image and text layouts where space allows.
- Tablet and mobile breakpoints progressively reduce gaps and image sizes before stacking content into a single column.
- The “Meet Natalie” section shifts to a stacked layout before the biography becomes too narrow.
- Character sign-offs scale down on smaller screens while remaining visually connected to the footer.
- Images remain fluid with `max-width: 100%` and flexible container sizing.

## Character Sign-Offs

Each page ends with a different character mascot and themed divider:

- **Home:** Uncle Iroh — tea and leaf divider
- **About:** Katara — water-themed divider
- **Projects:** King Bumi — Earth Kingdom-inspired divider
- **Notes:** Sokka — boomerang and food divider
- **Secret:** Toph — earth-themed divider

The character artwork is treated as a footer mascot.

## Secret Tunnel Easter Egg

The Secret page includes a small mountain button (`⛰️`) positioned above the footer near the bottom-right corner.

When activated:

- Chong’s `chong-secret-tunnel.gif` slides smoothly upward from below the viewport.
- It remains visible briefly, then slides straight back below the viewport.
- The trigger remains separate from Toph so her footer size and placement are unaffected by the easter egg.
- A reduced-motion version is included with `prefers-reduced-motion` support.

## Contact Form

The About page includes a compact contact section with a larger form column and a smaller informational sidebar.

- Every form control has a visible `<label>`.
- Name, email, subject, and message are required.
- Placeholder text keeps the form visually simple while labels remain visible for accessibility.
- Native HTML validation properties are combined with custom visible error messages.
- Invalid fields receive `aria-invalid="true"`, with errors connected through `aria-describedby`.
- Form feedback is announced through an `aria-live` status region.
- Keyboard users receive visible focus indicators.
- The form is currently a front-end demonstration and is not connected to an email or form-processing service.

## Accessibility Notes

- Every page includes a “Skip to main content” link.
- Primary navigation has an accessible label and uses `aria-current="page"` on the active page.
- Meaningful content images include descriptive alternative text.
- Decorative dividers are hidden from assistive technology with `aria-hidden="true"` where appropriate.
- Interactive controls, including the Secret Tunnel mountain button, have accessible labels and visible keyboard focus styles.
- Motion-sensitive visitors receive a simplified Secret Tunnel animation through `prefers-reduced-motion`.

## Project Structure

```text
/
├── index.html
├── about.html
├── projects.html
├── notebook.html
├── secret.html
├── tea-garden-snake.html
├── style.css
├── snake.js
├── theme-toggle.js
├── contact-form.js
├── README.md
└── assets/
    ├── documents/
    │   └── NKH_Wireframe.pdf
    └── images/
        ├── archway-cover.png
        ├── uncle_iroh.png
        ├── katara.png
        ├── king_bumi.png
        ├── sokka.png
        ├── toph.png
        ├── chong-secret-tunnel.gif
        └── additional portfolio images
```


## Jasmine Dragon Integration

- The Secret page now serves as the landing page for *Jasmine Dragon: Zen Garden*.
- The former coming-soon placeholder has been replaced by an accessible password form.
- A successful entry stores a session-only unlock flag and redirects to `tea-garden-snake.html`.
- Direct visits to the game page redirect back to the Secret page unless the garden has been unlocked during that browser session.


## Light & Dark Mode

- The portfolio now includes the restored animated light/dark mode toggle on every page, including the Secret page and *Jasmine Dragon: Zen Garden*.
- Dark mode is the default on a visitor’s first load; the toggle saves the visitor’s chosen theme in `localStorage` for future visits.
- Dark-mode colors were adjusted across cards, forms, notebook surfaces, headings, and game interface panels while preserving the authored colors of the game board and artwork.
