let currentOrders = [];
let viewMode = 'kanban'; // 'kanban' or 'list'
let isArchivedMode = false;
let editingOrderId = null;

const STATUSES = ['Aguardando Impressão', 'Impresso', 'Cortado', 'Montado', 'Pronto', 'Enviado'];

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  renderUserInfo();
  loadOrders();

  if (user.cargo !== 'admin') {
    const newBtn = document.getElementById('btn-novo-pedido');
    if (newBtn) newBtn.style.display = 'none';
  }

  ['filter-loja', 'filter-produto', 'filter-status', 'filter-data', 'filter-busca'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', loadOrders);
  });

  document.getElementById('frente_verso')?.addEventListener('change', (e) => {
    const field = document.getElementById('field-arte-verso');
    if (field) field.style.display = e.target.checked ? 'block' : 'none';
  });
});

function toggleView(mode) {
  viewMode = mode;
  document.getElementById('btn-view-kanban').classList.toggle('active', mode === 'kanban');
  document.getElementById('btn-view-list').classList.toggle('active', mode === 'list');
  document.getElementById('kanban-area').style.display = mode === 'kanban' ? 'grid' : 'none';
  document.getElementById('table-area').style.display = mode === 'list' ? 'block' : 'none';
  render();
}

function toggleArchived() {
  isArchivedMode = !isArchivedMode;
  document.getElementById('btn-toggle-archived').textContent = isArchivedMode ? '📋 Ver Produção Ativa' : '📦 Ver Arquivados';
  document.getElementById('page-title').textContent = isArchivedMode ? 'Fluxo de Produção (Pedidos Arquivados)' : 'Fluxo de Produção';
  loadOrders();
}

async function loadOrders() {
  try {
    const loja = document.getElementById('filter-loja')?.value || '';
    const produto = document.getElementById('filter-produto')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const data = document.getElementById('filter-data')?.value || '';
    const busca = document.getElementById('filter-busca')?.value || '';

    const query = new URLSearchParams({ loja, produto, status, data, busca, arquivados: isArchivedMode ? 'true' : 'false' }).toString();
    currentOrders = await apiRequest(`/pedidos?${query}`);
    render();
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
  }
}

function render() {
  if (viewMode === 'kanban') renderKanban();
  else renderTable();
}

function renderKanban() {
  const container = document.getElementById('kanban-area');
  container.innerHTML = STATUSES.map(st => {
    const filtered = currentOrders.filter(o => o.status === st);
    return `
      <div class="kanban-column">
        <div class="kanban-column-header">
          <div class="kanban-column-title">⚙️ ${st}</div>
          <span class="count-pill">${filtered.length}</span>
        </div>
        <div class="kanban-cards">
          ${filtered.length === 0 ? '<div style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:20px;border:1px dashed var(--border-color);border-radius:8px;">Nenhum pedido</div>' : filtered.map(o => renderCardHTML(o)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderCardHTML(o) {
  const user = getUser();
  const frente = o.arquivos?.find(a => a.tipo === 'frente');
  const verso = o.arquivos?.find(a => a.tipo === 'verso');

  const currIdx = STATUSES.indexOf(o.status);
  const prevSt = currIdx > 0 ? STATUSES[currIdx - 1] : null;
  const nextSt = currIdx >= 0 && currIdx < STATUSES.length - 1 ? STATUSES[currIdx + 1] : null;

  return `
    <div class="glass-panel" style="padding:14px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <span style="font-size:0.75rem;font-weight:800;color:var(--primary);">#${o.numero_pedido}</span>
          <h4 style="font-size:0.95rem;font-weight:800;margin-top:2px;">${o.titulo}</h4>
        </div>
        <span class="badge ${o.loja === 'Okami' ? 'badge-okami' : 'badge-universo'}">${o.loja}</span>
      </div>

      ${(frente || verso) ? `
        <div style="display:flex;gap:6px;margin-top:4px;">
          ${frente && frente.url.match(/\.(jpeg|jpg|png|gif)$/i) ? `<img src="${frente.url}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:1px solid var(--border-color);" alt="Frente">` : frente ? `<a href="${frente.url}" target="_blank" class="btn btn-secondary" style="padding:4px;font-size:0.7rem;">PDF Frente</a>` : ''}
          ${verso && verso.url.match(/\.(jpeg|jpg|png|gif)$/i) ? `<img src="${verso.url}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:1px solid var(--border-color);" alt="Verso">` : verso ? `<a href="${verso.url}" target="_blank" class="btn btn-secondary" style="padding:4px;font-size:0.7rem;">PDF Verso</a>` : ''}
        </div>
      ` : ''}

      <div style="font-size:0.8rem;color:var(--text-muted);">
        <div>Produto: <b>${o.produto}</b> (Qtd: <b>${o.quantidade}</b>)</div>
        <div>Espiral: <b>${o.tipo_espiral}</b> ${o.frente_verso ? '• FV' : ''}</div>
        <div>Data: ${o.data_pedido ? o.data_pedido.split('T')[0] : '-'}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-color);">
        <div style="display:flex;gap:4px;">
          ${prevSt ? `<button className="btn btn-secondary" style="padding:4px 8px;font-size:0.75rem;" onclick="changeStatus(${o.id}, '${prevSt}')">← Voltar</button>` : ''}
          ${nextSt ? `<button className="btn btn-primary" style="padding:4px 8px;font-size:0.75rem;" onclick="changeStatus(${o.id}, '${nextSt}')">Avançar →</button>` : ''}
        </div>

        ${user?.cargo === 'admin' ? `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary" style="padding:4px;" onclick="openEditModal(${o.id})" title="Editar">✏️</button>
            <button class="btn btn-secondary" style="padding:4px;color:#ef4444;" onclick="deleteOrder(${o.id})" title="Excluir">🗑️</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderTable() {
  const tbody = document.getElementById('orders-tbody');
  const user = getUser();

  if (currentOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">Nenhum pedido encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentOrders.map(o => `
    <tr>
      <td><b>#${o.numero_pedido}</b><br><span style="font-size:0.85rem;color:var(--text-muted);">${o.titulo}</span></td>
      <td><span class="badge ${o.loja === 'Okami' ? 'badge-okami' : 'badge-universo'}">${o.loja}</span></td>
      <td><b>${o.produto}</b></td>
      <td><b>${o.quantidade}</b></td>
      <td style="font-size:0.85rem;">Espiral: <b>${o.tipo_espiral}</b><br>FV: ${o.frente_verso ? 'Sim' : 'Não'}</td>
      <td>
        <select class="form-control" style="padding:4px 8px;font-size:0.8rem;" onchange="changeStatus(${o.id}, this.value)">
          ${STATUSES.concat('Arquivado').map(st => `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </td>
      <td>${o.data_pedido ? o.data_pedido.split('T')[0] : '-'}</td>
      <td>
        ${user?.cargo === 'admin' ? `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary" style="padding:6px;" onclick="openEditModal(${o.id})">✏️</button>
            <button class="btn btn-secondary" style="padding:6px;color:#ef4444;" onclick="deleteOrder(${o.id})">🗑️</button>
          </div>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function changeStatus(id, newStatus) {
  try {
    await apiRequest(`/pedidos/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
    loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteOrder(id) {
  if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
  try {
    await apiRequest(`/pedidos/${id}`, { method: 'DELETE' });
    loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

function openCreateModal() {
  editingOrderId = null;
  document.getElementById('modal-title').textContent = 'Novo Pedido de Produção';
  document.getElementById('order-form').reset();
  document.getElementById('numero_pedido').value = `PED-${Math.floor(1000 + Math.random() * 9000)}`;
  document.getElementById('data_pedido').value = new Date().toISOString().slice(0, 10);
  document.getElementById('field-arte-verso').style.display = 'none';
  document.getElementById('order-modal').classList.add('active');
}

function openEditModal(id) {
  const o = currentOrders.find(x => x.id === id);
  if (!o) return;
  editingOrderId = id;

  document.getElementById('modal-title').textContent = 'Editar Pedido';
  document.getElementById('numero_pedido').value = o.numero_pedido;
  document.getElementById('titulo').value = o.titulo;
  document.getElementById('loja').value = o.loja;
  document.getElementById('produto').value = o.produto;
  document.getElementById('quantidade').value = o.quantidade;
  document.getElementById('data_pedido').value = o.data_pedido ? o.data_pedido.split('T')[0] : '';
  document.getElementById('tipo_espiral').value = o.tipo_espiral;
  document.getElementById('frente_verso').checked = !!o.frente_verso;
  document.getElementById('observacoes').value = o.observacoes || '';

  document.getElementById('field-arte-verso').style.display = o.frente_verso ? 'block' : 'none';
  document.getElementById('order-modal').classList.add('active');
}

function closeModal() {
  document.getElementById('order-modal').classList.remove('active');
}

async function saveOrder(e) {
  e.preventDefault();
  const form = document.getElementById('order-form');
  const formData = new FormData(form);

  formData.set('frente_verso', document.getElementById('frente_verso').checked ? 'true' : 'false');

  try {
    if (editingOrderId) {
      await apiRequest(`/pedidos/${editingOrderId}`, { method: 'PUT', body: formData });
    } else {
      await apiRequest('/pedidos', { method: 'POST', body: formData });
    }
    closeModal();
    loadOrders();
  } catch (err) {
    alert(err.message || 'Erro ao salvar pedido.');
  }
}
