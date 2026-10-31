# Asset credits and replacement

- Reference movie posters and the Jailer scene/backdrop were cropped from screenshots supplied by the user for this demo. Those references and crops do not establish rights for broader distribution. Replace configurable `poster` and `backdrop` fields with authorised assets before an external commercial launch.
- Sintel poster and bundled trailer come from W3C's media sample at https://media.w3.org/2010/05/sintel/. Sintel is © Blender Foundation and is distributed under Creative Commons Attribution 3.0. Attribution and original project: https://durian.blender.org/ and https://creativecommons.org/licenses/by/3.0/ . The bundled MP4 is a sample clip, not a trailer for the other catalog films.
- Cinema and snack photographs were downloaded from Unsplash image CDN paths recorded in `scripts/prepare-assets.mjs`, under the Unsplash image license. Some product images are representative (for example the combo shares the popcorn photo). Replace product imagery through the catalog as desired.
- The auditorium feature image is derived from the supplied seats reference; it describes the visual goal and is explicitly labelled illustrative. Actual booking rooms are rendered from procedural geometry, not this image.
- DM Sans and Bebas Neue are locally bundled through Fontsource. License notices remain in their packages. UI icons use lucide-react.

All artwork/video URLs are configuration fields. Direct trailer assets must be authorised for use and allow CORS when hosted on another origin. Do not insert iframe/YouTube page URLs into VideoTexture fields; use a directly playable MP4-compatible URL.
