import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getBearer(request: Request) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  return token;
}

async function ghFetch(request: Request, path: string) {
  const token = await getBearer(request);
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

  const data = await res.json();
  return NextResponse.json(data);
}

export async function GET(request: Request) {
  return ghFetch(request, "/pulls?state=open&per_page=30&sort=created&direction=desc");
}
