import { forwardRef, type ComponentProps } from "react";

/** Native image contract for pre-optimized local assets, TMDB CDN images and
 * printable/canvas-exported tickets. These sources must retain their exact URL
 * and CORS/loading attributes rather than pass through a Next image optimizer. */
const AssetImage = forwardRef<HTMLImageElement, ComponentProps<"img">>(function AssetImage(props, ref) {
  // eslint-disable-next-line @next/next/no-img-element -- Sources are already optimized; preserve native print/CORS behavior in the Worker app.
  return <img {...props} alt={props.alt ?? ""} ref={ref} />;
});
export default AssetImage;
