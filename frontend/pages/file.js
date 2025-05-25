import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function FileDetailPage() {
  const router = useRouter();
  const { name } = router.query;

  const [pages, setPages] = useState([]);
  const [tags, setTags] = useState({});
  const [loading, setLoading] = useState(true);
  const [visionLoading, setVisionLoading] = useState({});

  useEffect(() => {
    if (!name) return;
    fetch(`${API_BASE}/pages_by_pdf?pdf_name=${encodeURIComponent(name)}`)
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
      const res = await fetch(`${API_BASE}/pages/${pageId}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags })
      });
      if (!res.ok) throw new Error("Failed to update tags");
      console.log(`Tags updated for page ${pageId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunVision = async (pageId) => {
    setVisionLoading((prev) => ({ ...prev, [pageId]: true }));
    try {
      await fetch(`${API_BASE}/pages/${pageId}/vision_annotate`, {
        method: "POST",
      });
      router.push(`/vision_edit/${pageId}`);
    } catch (err) {
      alert("Vision annotation failed!");
    }
    setVisionLoading((prev) => ({ ...prev, [pageId]: false }));
  };

  const handleEditVision = (pageId) => {
    router.push(`/vision_edit/${pageId}`);
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
                <div className="flex gap-4 mb-2 items-start">
                  <img
                    src={`${API_BASE}/previews/${name}-page${page.page_number}.png`}
                    alt={`Page ${page.page_number} Preview`}
                    style={{
                      width: "280px",
                      minWidth: "240px",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
                    }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  {page.vision_summary ? (
                    <div className="flex-1">
                      <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-2 shadow-inner">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-block bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs">
                            Vision AI Processed
                          </span>
                          <span className="font-semibold text-yellow-800">Vision Summary:</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm text-yellow-900">{page.vision_summary}</div>
                        <div className="flex justify-end">
                          <button
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded mt-2"
                            onClick={() => handleEditVision(page.page_id)}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2 flex-1">
                      {page.text && page.text.length > 500
                        ? page.text.slice(0, 500) + "..."
                        : page.text || <span className="italic text-gray-400">No extracted text available.</span>}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 items-center mt-2">
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
                  {!page.vision_summary && (
                    <button
                      className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded"
                      onClick={() => handleRunVision(page.page_id)}
                      disabled={visionLoading[page.page_id]}
                    >
                      {visionLoading[page.page_id] ? "Processing..." : "Run Vision AI"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
