"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AcademyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Academy error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
        <p className="text-gray-500">We couldn&apos;t load this part of the academy. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <Button className="bg-academy-primary hover:bg-academy-secondary" onClick={reset}>
            Try Again
          </Button>
          <Link href="/academy">
            <Button variant="outline">Back to Academy</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
