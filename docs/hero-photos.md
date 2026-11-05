# Homepage community photos

Maintain the slide list in `src/features/landing/data/hero-slides.ts`. Each slide
has a local `path`, descriptive `alt`, optional `caption` and `credit`, and percentage
`focalPoint` used for responsive cropping. Put approved image files in
`public/images/landing/`; no code changes to the carousel are needed to replace
or reorder slides.

The bundled images show illustrative community scenes, including related crops
of the same scene. They are not evidence of municipal work or endorsement. No
photographer attribution or permission record for real municipal photography is
asserted. Replace them with authorized photographs when available and record
the actual photographer/source, permission or license, and any attribution
requirements before publication. Update the credit and alt text together. Do
not include personal information or claim the image depicts an actual municipal
activity without verification.

Prefer landscape WebP or AVIF at about 1600–2000px wide and a modest file size.
Check the focal point at 320px, tablet, and desktop widths; avoid cropping faces
or meaningful activity. The fixed overlay and solid credit/control surfaces
keep text readable. The hero retains its height and service links during image
loading or failure; a failed image falls back to the navy background.

The carousel is manual, with no autoplay or animated transitions. This avoids
unexpected motion, including for reduced-motion users. Previous/next and slide
buttons work with touch, Enter and Space; arrow keys, Home and End work within
the photo controls. Horizontal swipes outside links and buttons change the
photo; vertical scrolling is left to the browser. The first photo loads eagerly
with high fetch priority; only the selected image is mounted, so later photos
are requested when selected. The heading and service/tracking links stay stable.

For regression checks, run `node --test tests/hero-carousel.test.mjs`. With the
site open in Playwright, run `tests/hero-carousel-browser.js` through the
Playwright run-code tool. It uses the open site's origin (or local port 3103
when no site is open) and checks keyboard/focus, responsive targets, gestures,
loading behavior and image failure handling.
