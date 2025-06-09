// frontend/components/Layout.js
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Layout({ children }) {
  const { data: session } = useSession();
  const isProd = process.env.NODE_ENV === 'production';
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
            {isProd && (
              session ? (
                <button onClick={() => signOut()} className="ml-4 underline">
                  Sign out
                </button>
              ) : (
                <button onClick={() => signIn()} className="ml-4 underline">
                  Sign in
                </button>
              )
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto p-6">{children}</main>
    </div>
  );
}
