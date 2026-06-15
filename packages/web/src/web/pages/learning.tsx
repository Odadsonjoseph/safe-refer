import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  type: "video" | "article" | "guide" | "template";
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  video: "🎥",
  article: "📄",
  guide: "📚",
  template: "📋",
};

const TYPE_COLORS: Record<string, string> = {
  video: "bg-red-50 text-red-600",
  article: "bg-blue-50 text-blue-600",
  guide: "bg-green-50 text-green-600",
  template: "bg-purple-50 text-purple-600",
};

export default function Learning() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    async function load() {
      try {
        const session = await authClient.getSession();
        const token = (session as any)?.data?.session?.token;
        const res = await fetch("/api/affiliate/learning", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setResources(d.resources || d);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = ["All", ...Array.from(new Set(resources.map((r) => r.category)))];
  const filtered = activeCategory === "All"
    ? resources
    : resources.filter((r) => r.category === activeCategory);

  // Group by category
  const grouped = filtered.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, Resource[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Learning Center</h1>
        <p className="text-gray-500 text-sm mt-0.5">Resources, guides, and templates to help you succeed as an affiliate</p>
      </div>

      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-5 text-white mb-6">
        <h2 className="font-semibold text-lg mb-1">Grow your referral income</h2>
        <p className="text-sky-100 text-sm">
          Use these resources to learn how to find, qualify, and submit high-value leads that get accepted.
        </p>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeCategory === c ? "bg-sky-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {resources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="font-medium">No resources yet</p>
          <p className="text-sm mt-1">Check back soon — content is being added.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="font-semibold text-gray-800 mb-3">{category}</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition group block"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-2xl">{TYPE_ICONS[r.type] || "📄"}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[r.type] || "bg-gray-100 text-gray-600"}`}>
                        {r.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-sky-600 transition">{r.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{r.description}</p>
                    <div className="flex items-center gap-1 mt-3 text-sky-500 text-sm font-medium">
                      <span>Open resource</span>
                      <svg className="w-4 h-4 group-hover:translate-x-0.5 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
