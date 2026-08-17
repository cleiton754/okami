function getToken() {
  return localStorage.getItem('okami_token');
}

function getUser() {
  const user = localStorage.getItem('okami_user');
  return user ? JSON.parse(user) : null;
}

function checkAuth(requireAdmin = false) {
  const token = getToken();
  const user = getUser();
  const currentPath = window.location.pathname;

  if (!token || !user) {
    if (!currentPath.endsWith('index.html') && currentPath !== '/') {
      window.location.href = 'index.html';
    }
    return null;
  }

  if (requireAdmin && user.cargo !== 'admin') {
    alert('Acesso negado. Esta página é exclusiva para Administradores.');
    window.location.href = 'producao.html';
    return null;
  }

  return user;
}

function logout() {
  localStorage.removeItem('okami_token');
  localStorage.removeItem('okami_user');
  window.location.href = 'index.html';
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined)
  };

  try {
    let res;
    try {
      res = await fetch(`${API_URL}${endpoint}`, config);
    } catch (networkErr) {
      console.error('❌ Falha de Conexão/Rede API:', networkErr);
      throw new Error('Não foi possível se conectar ao servidor ("Failed to Fetch"). Verifique sua conexão ou se o backend está acessível.');
    }

    if (res.status === 401 || res.status === 403) {
      if (!window.location.pathname.endsWith('index.html')) {
        logout();
      }
    }

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error(`Erro no servidor (${res.status} ${res.statusText}). Tente novamente.`);
    }

    if (!res.ok) {
      throw new Error(data.message || `Erro ${res.status}: Falha no servidor.`);
    }

    return data;
  } catch (err) {
    console.error('❌ Erro na requisição API:', err);
    throw err;
  }
}


function renderUserInfo() {
  const user = getUser();
  const userBox = document.getElementById('user-info-box');
  if (userBox && user) {
    userBox.innerHTML = `
      <div style="font-size: 0.85rem; text-align: right;">
        <div style="font-weight: 700; color: var(--text-main);">👤 ${user.nome}</div>
        <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">
          ${user.cargo === 'admin' ? '👑 Administrador' : '🛠️ Produção'}
        </div>
      </div>
      <button class="btn btn-secondary" onclick="logout()" style="padding: 6px 10px; color: #ef4444;" title="Sair da Conta">
        🚪 Sair
      </button>
    `;
  }
}
