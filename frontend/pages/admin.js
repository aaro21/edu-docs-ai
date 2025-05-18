import { useState, useEffect } from "react";

const ADMIN_KEY = "devkey"; // Set to match backend or use from env

const actions = [
  { name: "Generate Image Previews", endpoint: "/admin/generate_previews" },
  { name: "Bulk Ingest PDFs", endpoint: "/admin/ingest_folder" },
  { name: "Reset (Clear) Pages DB", endpoint: "/admin/reset_pages" },
];

export default function AdminPage() {
  const [loading, setLoading] = useState("");
  const [output, setOutput] = useState("");
  const [top10, setTop10] = useState(null);
  const [embeddingStatus, setEmbeddingStatus] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/admin/top10")
      .then(res => res.json())
      .then(data => setTop10(data))
      .catch(() => setTop10(null));
  }, []);

  useEffect(() => {
    fetch("http://localhost:8000/admin/embedding_status")
      .then(res => res.json())
      .then(data => setEmbeddingStatus(data));
  }, []);

  async function runAdminAction(endpoint) {
    setLoading(endpoint);
    setOutput("");
    try {
      const res = await fetch(`http://localhost:8000${endpoint}?key=${ADMIN_KEY}`, {
        method: "POST"
      });
      const data = await res.json();
      setOutput(data.output || data.error || JSON.stringify(data));
    } catch (err) {
      setOutput("Request failed: " + err);
    }
    setLoading("");
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="max-w-xl w-full bg-white shadow rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6">🛠️ Admin Panel</h1>
        
        {/* Top 10 Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Database Snapshot</h2>
          {top10 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium">Recent PDFs</h3>
                <ol className="list-decimal ml-5 text-sm">
                  {top10.recent_pdfs.map((pdf, idx) => (
                    <li key={idx}>{pdf}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="font-medium">Top Tags</h3>
                <ol className="list-decimal ml-5 text-sm">
                  {top10.top_tags.map(([tag, count], idx) => (
                    <li key={idx}>{tag} <span className="text-gray-400">({count})</span></li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="font-medium">Top Folders</h3>
                <ol className="list-decimal ml-5 text-sm">
                  {top10.top_folders.map(([folder, count], idx) => (
                    <li key={idx}>{folder} <span className="text-gray-400">({count})</span></li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading database summary...</p>
          )}
        </div>

        {/* Embeddings Health Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Embeddings Health</h2>
          {embeddingStatus ? (
            <table className="w-full text-sm border">
              <thead>
                <tr>
                  <th className="p-1 border">PDF</th>
                  <th className="p-1 border">Total Pages</th>
                  <th className="p-1 border">Missing Embeddings</th>
                </tr>
              </thead>
              <tbody>
                {embeddingStatus.map((row, idx) => (
                  <tr key={idx} className={row.missing > 0 ? "bg-yellow-50" : ""}>
                    <td className="border p-1">{row.pdf_name}</td>
                    <td className="border p-1 text-center">{row.total}</td>
                    <td className="border p-1 text-center">{row.missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">Loading embedding status...</p>
          )}
        </div>

        {/* Admin Buttons */}
        <div className="space-y-4 mb-8">
          {actions.map(a => (
            <button
              key={a.endpoint}
              onClick={() => runAdminAction(a.endpoint)}
              className={`w-full px-4 py-2 rounded font-medium
                ${loading === a.endpoint ? "bg-gray-400" : "bg-blue-700 hover:bg-blue-800"}
                text-white transition`}
              disabled={!!loading}
            >
              {loading === a.endpoint ? "Running..." : a.name}
            </button>
          ))}
        </div>

        {output && (
          <pre className="mt-6 bg-gray-100 border rounded p-3 text-xs overflow-x-auto">
            {output}
          </pre>
        )}
      </div>
    </main>
  );
}
