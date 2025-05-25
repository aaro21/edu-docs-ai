import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visionOnUpload, setVisionOnUpload] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("vision_on_upload", visionOnUpload ? "true" : "false");

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setMetadata(data);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">📄 Upload Teaching Material</h1>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700">Select a PDF file</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0])}
            className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-white p-2"
          />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            id="visionOnUpload"
            type="checkbox"
            checked={visionOnUpload}
            onChange={e => setVisionOnUpload(e.target.checked)}
            className="accent-blue-600"
          />
          <label htmlFor="visionOnUpload" className="text-sm text-gray-700">
            Run Vision AI on image-heavy pages after upload
          </label>
        </div>
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        {metadata && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-800">🧠 Document Metadata</h2>
            <p><strong>Filename:</strong> {metadata.filename}</p>
            <p><strong>Page Count:</strong> {metadata.page_count}</p>

            <h3 className="mt-4 font-medium text-gray-700">Content Preview:</h3>
            {Array.isArray(metadata.previews) && metadata.previews.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {metadata.previews.map((url, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <img
                      src={url}
                      alt={`Page ${idx + 1} Preview`}
                      className="rounded shadow border mb-2"
                      style={{ width: "160px", maxHeight: "220px", objectFit: "contain" }}
                    />
                    {metadata.pages && metadata.pages[idx] && (
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-20 overflow-auto">
                        {metadata.pages[idx].slice(0, 120)}{metadata.pages[idx].length > 120 ? "..." : ""}
                      </pre>
                    )}
                    <div className="text-xs text-gray-600">Page {idx + 1}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic mt-2">No image previews available.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
