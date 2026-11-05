/** Keep the viewport artwork outside the animated page and its loading states. */
export default function TicketsBackground() {
  return <>
    <link rel="preload" as="image" href="/assets/movieverse-ticket-backdrop.webp" fetchPriority="high" />
    <div className="tickets-background" aria-hidden="true" />
  </>;
}
