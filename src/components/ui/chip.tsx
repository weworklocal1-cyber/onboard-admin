"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
  variant?: "default" | "active";
}

const chipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export function Chip({
  label,
  onRemove,
  className,
  variant = "default",
}: ChipProps) {
  return (
    <motion.span
      variants={chipVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
        variant === "default"
          ? "border-brand-primary/30 bg-brand-light text-brand-primary"
          : "border-brand-primary bg-brand-primary text-white",
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 transition-colors hover:bg-brand-primary/20"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.span>
  );
}
