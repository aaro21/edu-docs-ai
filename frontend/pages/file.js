// frontend/pages/file.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function FileDetailPage() {
  const router = useRouter();
  const { name } = router.query;

  const [pages, setPages] = useState([]);
  const [tags, setTags] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    fetch(`http://localhost:8000/pages_by_pdf?pdf_name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((data) => {
        setPages(data);
        const tagMap = {};
        data.forEach((p) => (tagMap[p.page_id] = p.tags || ""));
        setTags(tagMap);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch pages", err);
        setLoading(false);
      });
  }, [name]);

  const handleTagChange = (pageId, value) => {
    setTags((prev) => ({ ...prev, [pageId]: value }));
  };

  const handleTagSave = async (pageId) => {
    const newTags = tags[pageId] || "";
    try {
      const res = await fetch(`http://localhost:8000/pages/${pageId}/tags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tags: newTags })
      });
      if (!res.ok) throw new Error("Failed to update tags");
      console.log(`Tags updated for page ${pageId}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">📄 {name}</h1>

        {loading ? (
          <p className="text-gray-600">Loading pages...</p>
        ) : pages.length === 0 ? (
          <p className="text-gray-600">No pages found for this file.</p>
        ) : (
          <div className="space-y-4">
            {pages.map((page, idx) => (
              <div
                key={idx}
                className="bg-white shadow p-4 rounded-lg border border-gray-200"
              >
                <div className="mb-2 text-sm text-gray-600">
                  <strong>Page {page.page_number}</strong>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                  {page.text.length > 500 ? page.text.slice(0, 500) + "..." : page.text}
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={tags[page.page_id] || ""}
                    onChange={(e) => handleTagChange(page.page_id, e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleTagSave(page.page_id)}
                    className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
                  >
                    Save Tags
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
