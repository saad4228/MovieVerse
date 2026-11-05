/** One decorative viewport layer shared by the entire Cinemas route family. */
export default function CinemaBackground({ detail = false }: { detail?: boolean }) {
  return <div aria-hidden="true" className={`cinema-background${detail ? " cinema-background-detail" : ""}`} />;
}
