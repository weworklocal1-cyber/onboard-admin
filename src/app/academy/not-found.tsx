import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AcademyNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Page Not Found</h2>
        <p className="text-gray-500">The academy page you are looking for does not exist or has been moved.</p>
        <Link href="/academy">
          <Button className="bg-academy-primary hover:bg-academy-secondary">Back to Academy</Button>
        </Link>
      </div>
    </div>
  );
}
