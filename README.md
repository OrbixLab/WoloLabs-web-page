# Wolo Labs — website

Static marketing site for Wolo Labs: **Atlas 64** (the tabletop game console) and
**Atlas Studio** (the creator platform behind it).

Exported from the design canvas and converted to plain HTML/CSS — no build step,
no framework, no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder so relative paths behave:

```bash
python3 -m http.server 5173
# http://localhost:5173
```

In VS Code, the **Live Server** extension works too (right-click `index.html` →
*Open with Live Server*).

## Structure

The store lives on [atlas-64.com](https://atlas-64.com/): every *Store* link points there.

```
index.html        Home
products.html     Atlas 64 + Atlas Studio
guides.html       Creator guides
about.html        Mission, vision, values, team
contact.html      Kickstarter waitlist + contact form
assets/css/base.css   Brand tokens, page basics, hover behaviour
assets/css/motion.css Entrance and scroll animations (home only, for now)
assets/js/main.js     Drives motion.css: hero start, scroll reveals, ticker, hero board
assets/img/           Logos, product shots, 3D pieces
assets/img/Games/     Game covers (originals + .webp used by the site)
assets/img/Founders/  Founder portraits (originals + .webp used by the site)
```

## Motion

The home page animates in: the hero plays once the fonts load (headline rises,
*play* gets struck through, pieces drop in and float, the 64-cell board lights up),
the ticker scrolls, and every section below reveals as it enters the viewport.

To animate something on another page, link `motion.css` and `main.js` plus the
small inline `<script>` in `index.html`'s `<head>`, then mark the markup:

- `data-reveal` — animates the element itself. Values: `up` (default), `left`,
  `right`, `fade`, `curtain`, `pop`.
- `data-reveal-group` — staggers its direct children. Values: `up`, `left`, `right`.
- `--delay: .3s` in the element's `style` shifts the start.

Visitors with *reduce motion* turned on get the static page, and if `main.js`
fails to load the inline script un-hides everything after 2.5 s.

Layout lives in inline `style` attributes — that is how the design canvas exports.
It works as-is; see *Next steps* if you want it refactored.

## Brand

Colours and type come from the Wolo Labs brand manual. Tokens are declared in
`assets/css/base.css`:

| Token | Hex | Use |
| --- | --- | --- |
| Authentic Black | `#080808` | page ground |
| Wild Sand | `#f4f4f4` | text on dark, light sections |
| Spring Bud | `#90D700` | the only call-to-action colour |
| Daintree | `#072834` | Kickstarter and accent bands |
| Spindrift Blue | `#8bd4df` | Atlas Studio accent |
| Atlas Amber | `#F1BA42` | Atlas product brand only |

**Typography is a substitution.** The manual specifies **Neue Montreal** (titles
and body) and **R41 Gótico** (accents); neither is free, so the site currently
loads Google Fonts stand-ins:

- `Archivo` → Neue Montreal
- `Playfair Display` italic → the struck-through *play* in the hero
- `Pirata One` → R41 Gótico (*Creator mindset*, *There is no set path*)
- `Space Mono` → the technical micro-labels

If you license the real faces, self-host them and swap the `font-family`
declarations plus the Google Fonts `<link>` in each page's `<head>`.

## Still to fill in

Search for `[` to find every placeholder:

- `[LAUNCH PRICE]`, `[CONNECTIVITY]` — Atlas 64 specs
- `[DURATION]`, `[DATE]` — YouTube cards
- `[MAC / LINUX TBC]` — Atlas Studio platforms

Also unconfirmed: the YouTube handle is assumed to be `youtube.com/@wololabs`.
Check it before launch.

**The forms do not submit.** The Kickstarter waitlist and the contact form are
markup only — every button is `type="button"`. Wire them to your provider
(Formspree, Resend, a serverless function) before going live.

**No board render yet.** `products.html` still shows a text placeholder where the
Atlas 64 board render should go. Everything else uses real imagery.

## Next steps, in the order worth doing them

1. Fill the placeholders and wire the two forms.
2. Pull the repeated header and footer into includes — they are duplicated across
   six files, so any nav change is a six-file edit today. An eleven-partial Astro
   or Eleventy migration takes about an hour and keeps the markup identical.
3. Move the inline styles into classes in `base.css` if you want the markup to
   read cleanly. Not urgent: inline styles render fine and cost nothing.
4. Deploy. Netlify, Vercel or GitHub Pages all serve this folder as-is with no
   configuration.

## Credits

Design and brand: Wolo Labs brand manual (Black Bear Company).
