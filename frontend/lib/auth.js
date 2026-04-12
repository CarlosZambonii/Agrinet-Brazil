export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agri_token');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('agri_user') || 'null');
  } catch {
    return null;
  }
}

export function saveAuth(token, user) {
  localStorage.setItem('agri_token', token);
  localStorage.setItem('agri_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('agri_token');
  localStorage.removeItem('agri_user');
}

export function decodeToken(t) {
  try {
    return JSON.parse(atob(t.split('.')[1]));
  } catch {
    return {};
  }
}

export function isAdmin(user) {
  return user?.role === 'admin';
}
