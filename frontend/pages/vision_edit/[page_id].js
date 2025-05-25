import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function VisionEditPage() {
  const router = useRouter();
  const { page_id } = router.query;
  const [page, setPage] = useState(null);
  const [visionText, setVisionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch page data on load
  useEffect(() => {
    // page_id can be undefined on first render, so only fetch when it's defined and not NaN
    if (!page_id || Array.isArray(page_id) || isNaN(Number(page_id))) return;

    fetch(`http://localhost:8000/pages/${page_id}`)
      .then(res => {
        if (!res.ok) throw new Error("Page not found");
        return res.json();
      })
      .then(data => {
        setPage(data);
        setVisionText(data.vision_summary || "");
      })
      .catch(() => {
        setError("Page not found or could not be loaded.");
      });
  }, [page_id]);

  // Save edited vision summary and trigger embedding
  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch(`http://localhost:8000/pages/${page_id}/vision_update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionText),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Vision summary saved and embedding updated!");
    } else {
      setMessage("Error saving vision summary.");
    }
  };

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!page) return <p className="p-8">Loading...</p>;

  const imageSrc =
    page.pdf_name && page.page_number
      ? `http://localhost:8000/previews/${page.pdf_name}-page${page.page_number}.png`
      : "";

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 bg-gray-50">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-2xl">
        {page && (
          <div className="mb-4 text-sm text-gray-600 flex items-center">
            <span
              className="cursor-pointer text-blue-600 hover:underline flex items-center"
              onClick={() => router.push(`/file?name=${encodeURIComponent(page.pdf_name)}`)}
            >
              <span role="img" aria-label="File" className="mr-1">📄</span>
              {page.pdf_name}
            </span>
            <span className="mx-2">&gt;</span>
            <span>Vision Edit (Page {page.page_number})</span>
          </div>
        )}
        <h1 className="text-xl font-bold mb-4">Edit Vision Annotation</h1>
        <div className="mb-6 flex flex-col items-center">
          {imageSrc && (
            <img
              src={imageSrc}
              alt="PDF Page Preview"
              className="rounded shadow mb-4 max-w-xs"
              onError={e => {
                e.target.onerror = null;
                e.target.src = "";
              }}
            />
          )}
          <div className="text-sm text-gray-700 mb-2">
            <strong>PDF:</strong> {page.pdf_name} &nbsp;
            <strong>Page:</strong> {page.page_number}
          </div>
        </div>
        <label className="font-medium mb-2 block">Vision Summary / Context (edit as needed):</label>
        <textarea
          className="w-full min-h-[120px] border border-gray-300 rounded p-2 mb-4"
          value={visionText}
          onChange={e => setVisionText(e.target.value)}
        />
        <button
          className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save & Update Embedding"}
        </button>
        {message && (
          <div className="mt-4 text-center text-green-600 font-medium">{message}</div>
        )}
      </div>
    </main>
  );
}
