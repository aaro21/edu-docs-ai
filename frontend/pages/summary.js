import { useEffect, useState } from 'react';

export default function SummaryPage() {
  const [files, setFiles] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  useEffect(() => {
    async function fetchData() {
      try {
        const resFiles = await fetch(`${API_BASE}/files`);
        const filesData = await resFiles.json();
        setFiles(filesData);
      } catch (err) {
        console.error('Failed to fetch files', err);
      }
      try {
        const resStats = await fetch(`${API_BASE}/admin/top10`);
        const statsData = await resStats.json();
        setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center px-4 py-8">
      <div className="w-full max-w-3xl bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">📊 Application Summary</h1>
        <p className="text-gray-700 mb-4">
          EduDocs AI helps teachers upload, tag and search their PDFs. Each page is
          processed with text extraction, optional vision analysis and OpenAI
          embeddings for fast semantic search.
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-6 space-y-1">
          <li>Upload individual PDFs or bulk ingest a folder</li>
          <li>Automatic text extraction and tagging for every page</li>
          <li>Semantic search powered by OpenAI embeddings</li>
          <li>Vision summaries for image heavy pages</li>
          <li>Export selected pages and visualize tag relationships</li>
        </ul>

        <h2 className="text-xl font-semibold mb-2 text-gray-800">Data Snapshot</h2>
        {loading ? (
          <p className="text-gray-500">Loading overview...</p>
        ) : (
          <>
            {files && files.length > 0 ? (
              <table className="w-full text-sm border mb-6">
                <thead>
                  <tr>
                    <th className="border p-2 text-left">PDF</th>
                    <th className="border p-2">Pages</th>
                    <th className="border p-2">Image-heavy</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">{f.pdf_name}</td>
                      <td className="border p-2 text-center">{f.page_count}</td>
                      <td className="border p-2 text-center">{f.image_heavy_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 mb-6">No PDFs uploaded yet.</p>
            )}

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Recent PDFs</h3>
                  <ol className="list-decimal ml-5 text-sm">
                    {stats.recent_pdfs.map((pdf, idx) => (
                      <li key={idx}>{pdf}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Top Tags</h3>
                  <ol className="list-decimal ml-5 text-sm">
                    {stats.top_tags.map(([tag, count], idx) => (
                      <li key={idx}>{tag} <span className="text-gray-400">({count})</span></li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Top Folders</h3>
                  <ol className="list-decimal ml-5 text-sm">
                    {stats.top_folders.map(([folder, count], idx) => (
                      <li key={idx}>{folder} <span className="text-gray-400">({count})</span></li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
