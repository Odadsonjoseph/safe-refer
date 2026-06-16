import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";

interface Post {
  id: string;
  title: string;
  body: string;
  type: "announcement" | "promotion" | "update" | "tip";
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  published: boolean;
  businessName: string;
  createdAt: string;
}

const POST_TYPES = ["announcement", "promotion", "update", "tip"] as const;
const TYPE_LABELS: Record<string, string> = {
  announcement: "Announcement",
  promotion: "Promotion",
  update: "Update",
  tip: "Tip / Insight",
};
const TYPE_COLORS: Record<string, string> = {
  announcement: "bg-blue-50 text-blue-600",
  promotion: "bg-purple-50 text-purple-600",
  update: "bg-sky-50 text-sky-600",
  tip: "bg-green-50 text-green-600",
};

async function getToken() {
  const session = await authClient.getSession();
  return (session as any)?.data?.session?.token;
}

function PostCard({
  post,
  onEdit,
  onDelete,
  onToggle,
}: {
  post: Post;
  onEdit: (p: Post) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, published: boolean) => void;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm transition ${post.published ? "border-gray-100" : "border-dashed border-gray-200 opacity-70"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[post.type] || "bg-gray-100 text-gray-500"}`}>
              {TYPE_LABELS[post.type] || post.type}
            </span>
            {!post.published && (
              <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full font-medium">Draft</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{post.title}</h3>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.body}</p>
      {post.ctaText && post.ctaUrl && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-sky-500">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {post.ctaText}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1 gap-2 flex-wrap">
        <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(post.id, !post.published)}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            {post.published ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={() => onEdit(post)}
            className="text-xs text-sky-500 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="text-xs text-red-400 hover:text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = { title: "", body: "", type: "announcement" as Post["type"], ctaText: "", ctaUrl: "", published: true };

export default function Posts() {
  const { user } = useSession();
  const role = (user as any)?.role as string;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  async function load() {
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = role === "business" ? "/api/posts/mine" : "/api/posts";
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setPosts(d.posts || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [role]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(post: Post) {
    setEditing(post);
    setForm({
      title: post.title,
      body: post.body,
      type: post.type,
      ctaText: post.ctaText || "",
      ctaUrl: post.ctaUrl || "",
      published: post.published,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const token = await getToken();
      const payload = {
        title: form.title,
        body: form.body,
        type: form.type,
        ctaText: form.ctaText || null,
        ctaUrl: form.ctaUrl || null,
        published: form.published,
      };
      const res = editing
        ? await fetch(`/api/posts/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save");
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const token = await getToken();
    await fetch(`/api/posts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  async function handleToggle(id: string, published: boolean) {
    const token = await getToken();
    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ published }),
    });
    load();
  }

  const filtered = posts.filter((p) => {
    if (filter === "published") return p.published;
    if (filter === "draft") return !p.published;
    return true;
  });

  // Affiliate view: read-only feed
  if (role !== "business") {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Business Updates</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Latest announcements and promotions from partner businesses</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="font-medium">No posts yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[p.type] || "bg-gray-100 text-gray-500"}`}>
                    {TYPE_LABELS[p.type] || p.type}
                  </span>
                  <span className="text-xs text-gray-400">{p.businessName}</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-4">{p.body}</p>
                {p.ctaText && p.ctaUrl && (
                  <a
                    href={p.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-sky-500 hover:text-sky-700 font-medium"
                  >
                    {p.ctaText}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <p className="text-xs text-gray-300 mt-3">{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Business management view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Create announcements, promotions, and updates visible to affiliates</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-sky-600 transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f ? "bg-sky-500 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:border-sky-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "all" && <span className="ml-1.5 opacity-60">({posts.length})</span>}
            {f === "published" && <span className="ml-1.5 opacity-60">({posts.filter((p) => p.published).length})</span>}
            {f === "draft" && <span className="ml-1.5 opacity-60">({posts.filter((p) => !p.published).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p className="font-medium">{filter === "all" ? "No posts yet" : `No ${filter} posts`}</p>
          {filter === "all" && (
            <button onClick={openCreate} className="text-sky-500 text-sm hover:underline mt-1">
              Create your first post →
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Post form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? "Edit Post" : "New Post"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {formError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{formError}</div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Post["type"] }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                >
                  {POST_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Post headline..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  required
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={5}
                  placeholder="Write your post content here..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                />
              </div>
              {/* CTA (optional) */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call to Action (Optional)</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Label</label>
                  <input
                    value={form.ctaText}
                    onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                    placeholder="e.g. Learn More, Apply Now"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                  <input
                    type="url"
                    value={form.ctaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, published: !f.published }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.published ? "bg-sky-500" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.published ? "translate-x-5" : ""}`} />
                </button>
                <label className="text-sm text-gray-700">
                  {form.published ? "Published — visible to affiliates" : "Draft — hidden from affiliates"}
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-medium hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-sky-500 text-white rounded-xl py-2.5 font-semibold hover:bg-sky-600 transition disabled:opacity-50 text-sm"
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
