import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", {
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
            {metadata.pages.map((text, idx) => (
              <pre
                key={idx}
                className="bg-gray-50 text-gray-800 text-sm p-3 mt-2 rounded border overflow-auto whitespace-pre-wrap break-words"
              >
                {text}
              </pre>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
