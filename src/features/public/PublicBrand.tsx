import { Link } from "@tanstack/react-router";
import { HeartPulse } from "lucide-react";
import "./public.css";
export function PublicBrand({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`public-brand ${className}`}
      aria-label="CardioAssist AI home"
    >
      <HeartPulse size={29} strokeWidth={1.65} />
      <span>
        CardioAssist <b>AI</b>
      </span>
    </Link>
  );
}
