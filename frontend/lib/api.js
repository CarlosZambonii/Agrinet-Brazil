const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function api(path, method = 'GET', body = null) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('agri_token') : null;

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || data.message || 'Erro ' + res.status);
  return data;
}
