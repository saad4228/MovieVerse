import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
  ]),
  {
    files: [
      "components/SeatScene.tsx",
      "components/auditorium/AuditoriumCamera.tsx",
      "components/auditorium/CinemaScreen.tsx",
      "components/auditorium/EmbeddedCinemaTrailer.tsx",
      "components/auditorium/QualityController.tsx",
      "components/auditorium/SeatRenderer.tsx",
      "components/auditorium/StaticArchitecture.tsx",
      "components/video/MovieVideoPlayer.tsx",
      "components/video/useMoviePlayback.ts",
    ],
    rules: {
      // Reviewed imperative adapters: Three renderer/camera/material handles,
      // OrbitControls, media elements and their owned DOM are mutable external
      // systems, not React state. R3F explicitly requires mutation in useFrame:
      // https://r3f.docs.pmnd.rs/advanced/pitfalls#avoid-setstate-in-loops
      // Keep refs, purity, effect/dependency and all other rules enabled here;
      // keep immutability enabled everywhere else, including booking state.
      "react-hooks/immutability": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
