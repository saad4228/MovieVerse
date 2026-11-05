"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="MovieVerse home">
      <img className="official-logo" src="/assets/movieverse-logo.png" alt="MovieVerse" width={649} height={117} />
    </Link>
  );
}
export function Modal({
  children,
  onClose,
  title,
  wide = false,
  variant = "default",
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
  variant?: "default" | "trailer";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    const prior = document.activeElement as HTMLElement;
    d?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""} ${variant === "trailer" ? "trailer-modal" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-btn modal-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty ${className}`}>
      <Search size={30} />
      <h3>{title}</h3>
      <p>{children || "Try a different search or change your filters."}</p>
      {action}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  link,
  label = "Explore all",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  link?: string;
  label?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {link && (
        <Link className="text-link" href={link}>
          {label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
