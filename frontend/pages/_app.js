// frontend/pages/_app.js
import '../styles/globals.css';
import Layout from '../components/Layout';
import { SessionProvider } from 'next-auth/react';

export default function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const isProd = process.env.NODE_ENV === 'production';
  const content = (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
  return isProd ? (
    <SessionProvider session={session}>{content}</SessionProvider>
  ) : (
    content
  );
}
