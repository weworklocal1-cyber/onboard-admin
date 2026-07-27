"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Tab = "prs" | "commits" | "releases";

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string } | null;
  updated_at: string;
  draft?: boolean;
}

interface Commit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
  author?: { login: string } | null;
}

interface Release {
  id: number;
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  author: { login: string };
  prerelease: boolean;
}

function TabIcon({ type }: { type: Tab }) {
  if (type === "prs") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="18" r="3" />
        <circle cx="12" cy="6" r="3" />
        <line x1="12" y1="9" x2="12" y2="15" />
      </svg>
    );
  }
  if (type === "commits") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 2-2 3.5a6 6 0 1 0 11.4-2.4" />
      <path d="M9 11l2 2 4-4" />
    </svg>
  );
}

export default function GitHubDevPage() {
  const [tab, setTab] = useState<Tab>("prs");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    prs: PullRequest[];
    commits: Commit[];
    releases: Release[];
  }>({ prs: [], commits: [], releases: [] });

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("github_pat") || ""
      : "";

  async function fetchData(endpoint: string) {
    const url = new URL(
      "/api/workforce/github" + endpoint,
      window.location.origin
    );
    if (token) url.searchParams.set("token", token);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load ${endpoint}`);
    }
    return res.json();
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const [prs, commits, releases] = await Promise.all([
          fetchData("/prs"),
          fetchData("/commits"),
          fetchData("/releases"),
        ]);

        if (!active) return;
        setData({ prs, commits, releases });
      } catch (err: any) {
        if (active) {
          toast.error(err.message || "Failed to load GitHub data");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const prCount = data.prs.length;
  const commitCount = data.commits.length;
  const releaseCount = data.releases.length;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "prs", label: "Pull Requests", count: prCount },
    { id: "commits", label: "Commits", count: commitCount },
    { id: "releases", label: "Releases", count: releaseCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GitHub Dev Tools</h1>
          <p className="text-sm text-gray-500">
            Track PRs, code changes, and releases tied to development progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            className="text-xs font-semibold text-gray-500"
            htmlFor="github-token"
          >
            GitHub PAT
          </label>
          <input
            id="github-token"
            type="password"
            placeholder="ghp_..."
            className="h-9 rounded-lg border border-gray-200 px-3 text-xs w-56"
            defaultValue={token}
            onChange={(e) => {
              const value = e.target.value.trim();
              if (value) {
                localStorage.setItem("github_pat", value);
              } else {
                localStorage.removeItem("github_pat");
              }
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 border-b border-gray-100">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={[
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === item.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                ].join(" ")}
              >
                <TabIcon type={item.id} />
                <span>{item.label}</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tab === "prs" &&
                  data.prs.map((pr) => (
                    <a
                      key={pr.id}
                      href={pr.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900">
                          #{pr.number}
                        </span>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            pr.state === "open"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600",
                          ].join(" ")}
                        >
                          {pr.state}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {pr.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500">
                        <span>{pr.user?.login || "unknown"}</span>
                        <span>
                          {new Date(pr.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </a>
                  ))}

                {tab === "commits" &&
                  data.commits.map((c) => (
                    <a
                      key={c.sha}
                      href={c.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[10px] text-gray-500">
                          {c.sha.slice(0, 7)}
                        </code>
                        <span className="text-[10px] text-gray-500">
                          {new Date(c.commit.author.date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {c.commit.message}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        by {c.author?.login || c.commit.author.name}
                      </p>
                    </a>
                  ))}

                {tab === "releases" &&
                  data.releases.map((r) => (
                    <a
                      key={r.id}
                      href={r.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {r.name || r.tag_name}
                        </span>
                        {r.prerelease && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                            PRE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {r.author.login} •{" "}
                        {new Date(r.published_at).toLocaleString()}
                      </p>
                    </a>
                  ))}
              </div>
            )}

            {!loading &&
              ((tab === "prs" && data.prs.length === 0) ||
                (tab === "commits" && data.commits.length === 0) ||
                (tab === "releases" && data.releases.length === 0) && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Nothing to show yet for this stream.
                  </p>
                ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
