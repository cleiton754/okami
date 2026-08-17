let currentUsers = [];
let editingUserId = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth(true); // Exclusivo para Admin
  renderUserInfo();
  loadUsers();
});

async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  try {
    currentUsers = await apiRequest('/usuarios');
    if (currentUsers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">Nenhum usuário cadastrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = currentUsers.map(u => `
      <tr>
        <td><b>#${u.id}</b></td>
        <td><b>${u.nome}</b></td>
        <td>${u.email}</td>
        <td><span class="badge ${u.cargo === 'admin' ? 'badge-okami' : 'badge-universo'}">${u.cargo === 'admin' ? '👑 Administrador' : '🛠️ Produção'}</span></td>
        <td><span class="badge ${u.ativo ? 'badge-pronto' : 'badge-arquivado'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
        <td style="font-size:0.85rem;">${u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '-'}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary" style="padding:6px;" onclick="openEditUserModal(${u.id})">✏️</button>
            <button class="btn ${u.ativo ? 'btn-secondary' : 'btn-primary'}" style="padding:6px;color:${u.ativo ? '#ef4444' : '#10b981'};" onclick="toggleUserStatus(${u.id})">
              ${u.ativo ? '🚫 Desativar' : '✅ Ativar'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#ef4444;">Erro ao carregar usuários.</td></tr>`;
  }
}

function openCreateUserModal() {
  editingUserId = null;
  document.getElementById('user-modal-title').textContent = 'Novo Usuário';
  document.getElementById('user-form').reset();
  document.getElementById('field-user-ativo').style.display = 'none';
  document.getElementById('user-modal').classList.add('active');
}

function openEditUserModal(id) {
  const u = currentUsers.find(x => x.id === id);
  if (!u) return;
  editingUserId = id;

  document.getElementById('user-modal-title').textContent = 'Editar Usuário';
  document.getElementById('user-nome').value = u.nome;
  document.getElementById('user-email').value = u.email;
  document.getElementById('user-senha').value = '';
  document.getElementById('user-cargo').value = u.cargo;
  document.getElementById('user-ativo').checked = !!u.ativo;

  document.getElementById('field-user-ativo').style.display = 'block';
  document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
  document.getElementById('user-modal').classList.remove('active');
}

async function saveUser(e) {
  e.preventDefault();
  const payload = {
    nome: document.getElementById('user-nome').value,
    email: document.getElementById('user-email').value,
    senha: document.getElementById('user-senha').value,
    cargo: document.getElementById('user-cargo').value,
    ativo: document.getElementById('user-ativo').checked
  };

  try {
    if (editingUserId) {
      await apiRequest(`/usuarios/${editingUserId}`, { method: 'PUT', body: payload });
    } else {
      await apiRequest('/usuarios', { method: 'POST', body: payload });
    }
    closeUserModal();
    loadUsers();
  } catch (err) {
    alert(err.message || 'Erro ao salvar usuário.');
  }
}

async function toggleUserStatus(id) {
  try {
    await apiRequest(`/usuarios/${id}/status`, { method: 'PATCH' });
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
}
