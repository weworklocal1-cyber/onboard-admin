"use client";

"use client";

import { motion } from "framer-motion";

export function CinematicText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            animation: `revealWord 0.6s ease-out ${i * 0.08}s both`,
          }}
        >
          {word}&nbsp;
        </span>
      ))}
      <style jsx>{`
        @keyframes revealWord {
          from {
            opacity: 0;
            transform: translateY(20px) rotateX(-40deg);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0) rotateX(0);
            filter: blur(0);
          }
        }
      `}</style>
    </span>
  );
}
