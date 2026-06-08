import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  title: string;
  subtitle?: string;
  withBorder?: boolean;
  align?: "left" | "center";
}

function SectionHeading({
  label,
  title,
  subtitle,
  withBorder = true,
  align = "left",
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-10",
        align === "center" && "text-center",
        align === "left" && withBorder && "border-l-4 border-brand-primary pl-4",
        className
      )}
      {...props}
    >
      {label && (
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-primary">
          {label}
        </p>
      )}
      <h2 className="mt-2 text-4xl font-bold text-gray-900 md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 max-w-2xl text-lg text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}
SectionHeading.displayName = "SectionHeading";

export { SectionHeading };
