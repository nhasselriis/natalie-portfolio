# N.K. Hasselriis Portfolio

A responsive five-page personal portfolio built with semantic HTML, a shared CSS file, and a small JavaScript file for accessible contact-form validation. The visual style combines parchment, taped journal cards, warm Earth Kingdom-inspired colors, and character sign-offs inspired by *Avatar: The Last Airbender*.

## Pages

- `index.html` — home page with a featured section for *Archway*, Campus.edu experience, and Uncle Iroh sign-off
- `about.html` — biography, creative interests and hobbies, contact form, and Katara sign-off
- `projects.html` — creative projects including the Futurama podcast, fountain pen comic, and *Anastasia* art piece, with King Bumi sign-off
- `notebook.html` — notebook-style Notes page with Sokka sign-off
- `secret.html` — Secret page with Toph sign-off

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
├── style.css
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