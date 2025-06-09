let cachedEmails = null;
const { Client } = require('pg');

async function loadFromDB() {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const res = await client.query('SELECT email FROM allowed_users');
  await client.end();
  return res.rows.map(r => r.email.toLowerCase());
}

export async function getAllowedEmails() {
  if (cachedEmails) return cachedEmails;

  if (process.env.ALLOWED_EMAILS) {
    cachedEmails = process.env.ALLOWED_EMAILS.split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    return cachedEmails;
  }
  if (process.env.POSTGRES_URL) {
    cachedEmails = await loadFromDB();
    return cachedEmails;
  }
  cachedEmails = [];
  return cachedEmails;
}
