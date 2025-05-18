// frontend/pages/files.js
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function FilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/files")
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

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">📂 Uploaded PDFs</h1>

        {loading ? (
          <p className="text-gray-600">Loading files...</p>
        ) : files.length === 0 ? (
          <p className="text-gray-600">No files uploaded yet.</p>
        ) : (
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
                  <Link
                    href={{ pathname: "/file", query: { name: file.pdf_name } }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Pages →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
