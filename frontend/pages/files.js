// frontend/pages/files.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_BASE}/files`)
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch files", err);
        setLoading(false);
      });
  }, []);

  const toggle = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const viewSelected = () => {
    if (selected.length === 0) return;
    router.push({ pathname: '/file-multi', query: { names: selected.join(',') } });
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">📂 Uploaded PDFs</h1>

        {loading ? (
          <p className="text-gray-600">Loading files...</p>
        ) : files.length === 0 ? (
          <p className="text-gray-600">No files uploaded yet.</p>
        ) : (
          <>
          <ul className="space-y-4">
            {Array.isArray(files) && files.map((file, idx) => (
              <li
                key={idx}
                className="bg-white shadow p-4 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{file.pdf_name}</p>
                    {file.image_heavy_count > 0 && (
                    <p className="text-sm text-yellow-600 mt-1">
                      ⚠️ {file.image_heavy_count} image-heavy page{file.image_heavy_count > 1 ? "s" : ""}
                    </p>
                    )}
                    <p className="text-sm text-gray-500">{file.page_count} pages</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={{ pathname: "/file", query: { name: file.pdf_name } }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Pages →
                    </Link>
                    <label className="text-sm">
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={selected.includes(file.pdf_name)}
                        onChange={() => toggle(file.pdf_name)}
                      />
                      Select
                    </label>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {selected.length > 0 && (
            <div className="mt-4">
              <button
                onClick={viewSelected}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                View Selected Files
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </main>
  );
}
