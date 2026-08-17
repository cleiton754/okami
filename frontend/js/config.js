// URL do backend em produção da Vercel.
const defaultUrl = 'https://okami-backend.vercel.app/api';
window.OKAMI_API_URL = defaultUrl;
const API_URL = defaultUrl.replace(/\/+$/, '');

function setCustomApiUrl(newUrl) {
  if (!newUrl) {
    window.OKAMI_API_URL = defaultUrl;
    window.location.reload();
    return;
  }

  let formatted = newUrl.trim().replace(/\/+$/, '');
  if (!formatted.endsWith('/api')) {
    formatted += '/api';
  }

  window.OKAMI_API_URL = formatted;
  window.location.reload();
}



