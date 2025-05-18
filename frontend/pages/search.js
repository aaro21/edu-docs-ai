// frontend/pages/search.js
import { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tagEdits, setTagEdits] = useState({});
  const [selectedPages, setSelectedPages] = useState([]);
  const [exportFilename, setExportFilename] = useState("exported_pages.pdf");
  const [titlePage, setTitlePage] = useState("");
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/tags")
      .then(res => res.json())
      .then(data => setTags(data))
      .catch(err => console.error("Failed to fetch tags", err));
  }, []);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const tagParam = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : "";
      const res = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(query)}${tagParam}`);
      const data = await res.json();
      setResults(data);
      setSelectedPages([]);
      const tagMap = {};
      data.forEach((r) => (tagMap[r.page_id] = r.tags || ""));
      setTagEdits(tagMap);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = (pageId, value) => {
    setTagEdits((prev) => ({ ...prev, [pageId]: value }));
  };

  const handleTagSave = async (pageId) => {
    const newTags = tagEdits[pageId] || "";
    try {
      const res = await fetch(`http://localhost:8000/pages/${pageId}/tags`, {
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

  const toggleSelection = (pageId) => {
    const id = Number(pageId);
    setSelectedPages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedPages.length === 0) return;
    try {
      const res = await fetch("http://localhost:8000/export_pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_ids: selectedPages,
          order: selectedPages,
          title: titlePage
        })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename.trim() || "exported_pages.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  function SortableItem({ id }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      background: "#fff",
      border: "1px solid #ddd",
      borderRadius: "0.5rem",
      padding: "0.75rem",
      marginBottom: "0.5rem",
      cursor: "grab",
    };
    const page = results.find((r) => r.page_id === id);
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {page ? (
          <div className="flex items-start gap-3">
            <img
              src={`http://localhost:8000/previews/${page.pdf_name}-page${page.page_number}.png`}
              alt="PDF Page Preview"
              style={{
                width: "80px",
                minWidth: "60px",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.07)"
              }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div>
              <div className="text-sm text-gray-800 font-medium">
                📘 {page.pdf_name} — Page {page.page_number}
              </div>
              <div className="text-sm text-gray-600 italic mt-1">
                {page.text.length > 150 ? page.text.slice(0, 150) + "..." : page.text}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Loading...</div>
        )}
      </div>
    );
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSelectedPages((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">🔍 Semantic Search</h1>

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a phrase..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg"
            >
              Search
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <label htmlFor="tag" className="text-sm text-gray-700">Filter by tag:</label>
            <select
              id="tag"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">All Tags</option>
              {tags.map((tag, idx) => (
                <option key={idx} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedPages.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">🧩 Selected Pages (Drag to Reorder)</h2>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={selectedPages} strategy={verticalListSortingStrategy}>
                {selectedPages.map((id) => (
                  <SortableItem key={id} id={id} />
                ))}
              </SortableContext>
            </DndContext>
            <div className="mt-4 flex flex-col gap-3">
              <input
                type="text"
                value={titlePage}
                onChange={(e) => setTitlePage(e.target.value)}
                placeholder="Optional title page text..."
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  placeholder="exported_pages.pdf"
                  className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={handleExport}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && <p className="text-gray-500">Loading...</p>}

        <div className="space-y-4">
          {results.map((r, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-gray-600">
                  <strong>PDF:</strong> {r.pdf_name} | <strong>Page:</strong> {r.page_number} | <strong>Tags:</strong> {r.tags || "None"}
                </div>
                <label className="text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(r.page_id)}
                    onChange={() => toggleSelection(r.page_id)}
                    className="mr-2"
                  />
                  Select
                </label>
              </div>
              <div className="flex gap-4 mb-2 items-start">
                <img
                  src={`http://localhost:8000/previews/${r.pdf_name}-page${r.page_number}.png`}
                  alt="PDF Preview"
                  style={{
                    width: "120px",
                    minWidth: "80px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
                  }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2 flex-1">
                  {r.text.length > 500 ? r.text.slice(0, 500) + "..." : r.text}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={tagEdits[r.page_id] || ""}
                  onChange={(e) => handleTagChange(r.page_id, e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={() => handleTagSave(r.page_id)}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded"
                >
                  Save Tags
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
