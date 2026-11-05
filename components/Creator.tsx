"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Coffee, Film, Sparkles } from "lucide-react";

function CreatorAvatar() {
  return (
    <div className="creator-avatar">
      <span className="creator-avatar-orbit" aria-hidden="true" />
      <img className="creator-profile-picture" src="/assets/creator-profile.jpg" alt="Mohammad Saad's profile avatar: Spider-Man wearing a suit" width={736} height={736} loading="lazy" />
      <span className="creator-avatar-star" aria-hidden="true"><Sparkles size={19} /></span>
      <span className="creator-avatar-coffee" aria-hidden="true"><Coffee size={18} /></span>
    </div>
  );
}

function CreatorSignoff() {
  return <p className="creator-signoff">Made with ☕, code, and an unreasonable love for movies. <span aria-label="popcorn">🍿</span></p>;
}

export function CreatorSection() {
  return (
    <section className="creator-section section-container" aria-labelledby="creator-heading">
      <div className="creator-invitation">
        <CreatorAvatar />
        <div className="creator-invitation-copy">
          <span className="eyebrow">MEET THE CREATOR</span>
          <h2 id="creator-heading">Behind the Universe</h2>
          <p className="creator-subheading">Every universe has someone behind it.</p>
          <p>Hey, I’m <strong>Mohammad Saad</strong> — a tech enthusiast and developer who enjoys building creative things. MovieVerse is where my love for movies met my “what if I built this?” side.</p>
        </div>
        <Link href="/about-the-creator" className="btn btn-gold creator-cta">Get to know me <ArrowUpRight size={17} /></Link>
      </div>
      <CreatorSignoff />
    </section>
  );
}

export default function AboutCreator() {
  const page = useRef<HTMLElement>(null);
  useEffect(() => {
    const elements = page.current?.querySelectorAll<HTMLElement>(".creator-page-heading, .creator-intro, .creator-story, .creator-connect");
    if (!elements) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      if (motion.matches) {
        elements.forEach(element => element.classList.remove("creator-reveal", "creator-revealed"));
        return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("creator-revealed");
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: .08 });
      elements.forEach((element, index) => {
        element.classList.add("creator-reveal");
        element.style.setProperty("--creator-reveal-delay", `${Math.min(index * 60, 120)}ms`);
        if (!element.classList.contains("creator-revealed")) observer!.observe(element);
      });
    };
    setup();
    motion.addEventListener("change", setup);
    return () => { observer?.disconnect(); motion.removeEventListener("change", setup); };
  }, []);
  return (
    <main ref={page} className="creator-page section-container">
      <Link href="/" className="creator-back"><ArrowLeft size={15} /> Back to the universe</Link>
      <div className="creator-page-heading">
        <span className="eyebrow">A LITTLE HELLO FROM THE OTHER SIDE OF THE SCREEN</span>
        <h1>Hey, I’m <span>Saad.</span></h1>
        <p>The person behind this little movie universe.</p>
      </div>
      <section className="creator-intro" aria-labelledby="creator-about-heading">
        <div className="creator-avatar-card">
          <CreatorAvatar />
          <strong>Mohammad Saad</strong>
          <span>Curious mind. Frequent movie thoughts.</span>
        </div>
        <div className="creator-about-copy">
          <h2 id="creator-about-heading">A little about me</h2>
          <p>I’m Mohammad Saad, a tech enthusiast and developer who enjoys building creative things. I like taking a small “wouldn’t it be cool if…” idea and seeing where a bit of curiosity and code can take it.</p>
          <p>Sometimes that means trying something new. Sometimes it means spending far too long getting a movie poster to move just right. You’ve probably seen the result. 🙂</p>
        </div>
      </section>
      <section className="creator-story" aria-labelledby="creator-why-heading">
        <div className="creator-story-icon" aria-hidden="true"><Film size={24} /></div>
        <div>
          <h2 id="creator-why-heading">Why I built MovieVerse</h2>
          <p>I wanted booking a movie ticket to feel like the fun had already started. A little atmosphere, a screen to explore, and a seat you can actually picture yourself in.</p>
          <p>I love movies. I love technology. So naturally, I put the two together and built my own immersive movie universe. Popcorn, sadly, still requires a separate trip.</p>
        </div>
      </section>
      <section className="creator-connect" aria-labelledby="creator-connect-heading">
        <div><h2 id="creator-connect-heading">Let’s connect</h2><p>Have a fun idea, a favourite film, or just want to say hi?</p></div>
        <div className="creator-socials">
          <a href="https://github.com/saad4228" target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={17} /></a>
          <a href="https://www.linkedin.com/in/saad4228/" target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={17} /></a>
        </div>
      </section>
      <CreatorSignoff />
    </main>
  );
}
