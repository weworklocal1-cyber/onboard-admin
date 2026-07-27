import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function ghFetch(request: Request, path: string) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : new URL(request.url).searchParams.get("token");
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    return NextResponse.json({ error: "GitHub context not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || `GitHub request failed: ${res.status}` }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

export async function GET(request: Request) {
  return ghFetch(request, "/commits?per_page=30&sha=main");
}
