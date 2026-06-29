import Link from "next/link";

const COLORS = {
  primary: "#FF6B00",
  navy: "#111827",
};

export default function NotFound() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "40px", textAlign: "center", background: "#f8fafc", minHeight: "100vh" }}>
      <h1 style={{ color: COLORS.navy, fontSize: "48px", marginBottom: "16px" }}>404</h1>
      <p style={{ color: COLORS.primary, fontSize: "18px" }}>The requested page could not be found.</p>
      <Link href="/" style={{ marginTop: "24px", display: "inline-block", color: COLORS.primary }}>
        Return Home
      </Link>
    </div>
  );
}