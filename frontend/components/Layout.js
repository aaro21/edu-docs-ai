// frontend/components/Layout.js
import Link from 'next/link';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white px-6 py-4 shadow">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">📚 EduDocs AI</h1>
          <div className="space-x-6 text-sm">
            <Link href="/" className="hover:underline">Upload</Link>
            <Link href="/files" className="hover:underline">Files</Link>
            <Link href="/search" className="hover:underline">Search</Link>
            <Link href="/export" className="hover:underline">Export</Link>
            <Link href="/summary" className="hover:underline">Summary</Link>
            <Link href="/admin" className="hover:underline">Admin</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto p-6">{children}</main>
    </div>
  );
}
