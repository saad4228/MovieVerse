import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty">
      <h1>Lost in the universe?</h1>
      <p>This page is not on our screens.</p>
      <Link href="/">Back to MovieVerse</Link>
    </main>
  );
}
