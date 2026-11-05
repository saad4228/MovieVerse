/** Shared stationary artwork for the account and demo studio routes. */
export default function AmberCinemaBackground() {
  return <>
    <link rel="preload" as="image" href="/assets/amber-cinema-interior.webp" fetchPriority="high"/>
    <div className="amber-cinema-background" aria-hidden="true"/>
  </>;
}
