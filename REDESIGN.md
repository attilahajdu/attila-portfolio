# Attila Hajdu: Drip portfolio version

A static portfolio with an interactive, three-step Drip case study. No dependencies or build step.

## Preview

Run `npm start`, then open the localhost address. If port 8791 is occupied, use `python3 -m http.server 8791 --bind 127.0.0.1`.

Publish the contents of `./` to any static host. ES modules require an HTTP server; opening index.html directly from a file URL is not supported.

## What changed

- Editorial typography, warm paper, cobalt Drip artwork, and a responsive layout.
- Drip is the main portfolio story: a familiar image-generation task, discarded attempts, then a modelled result with uncertainty.
- Adjustable image count, optional guess, three iteration levels, a no-discard comparison, design trade-offs, source disclosures, and reset.
- Original video introduction with five languages and the earlier portfolio reel, loaded on demand from the existing website.
- Original Drip calculator is preserved byte-for-byte in `./drip/index.html`.
- The portfolio itself uses no analytics, remote fonts, or external JavaScript dependencies. Original Drip retains its own source and dependencies.

## Source provenance

Inspected `attilahajdu/attila-portfolio` (main, ed33be3), `attilahajdu/drip` (extension source), and the public calculator at https://hajduattila.com/drip/ on 20 October 2026. The portfolio GitHub source predates the live homepage. The Drip repository contains the browser extension; the complete calculator was obtained from its published page.

`./assets/drip-model.js` extracts the evidence registry and engine from that published calculator. Model equations, distributions, event construction, and 8,000-scenario sampling are retained. The sole sampling change is a locally scoped deterministic random generator, reset before each estimate, for stable comparisons. No provider-specific actual consumption or scientific revalidation is claimed.

The walkthrough uses image mode, an unknown provider, and no upscale. “A few” discarded versions means max(2, round(kept × 0.5)); “Lots” means kept × 2. Prompt overhead is round(total generations × 1.2), as in the original model. All results use the consumptive operational boundary. The histogram displays P10 through P90, omitting both outer tails.

Design commentary is newly authored interpretation of the existing implementation, not a claim of historical user research. There are no invented business outcome metrics or testimonials.

## Validation

`npm test` checks event accounting, reproducibility, percentile ordering, positive finite results, increasing cost with more attempts, and exact parity with the original engine under an identical random sequence.

Browser checks cover the three-step path, changing attempts, comparison, reset, keyboard slider input, language switching, Escape dismissal of the video dialog, and horizontal overflow at desktop, tablet, and mobile widths. The source references have not been independently scientifically audited. Existing external project and video URLs remain dependent on their original hosts.

Original calculator SHA-256: `1a8cc15c4a171f2c5a46565f0e8564368b1413b8062976fd68b7cf98c8378f2c`.
