let currentOrders = [];
let viewMode = 'kanban';
let isArchivedMode = false;
let editingOrderId = null;

const STATUSES = ['Aguardando Impressão', 'Impresso', 'Cortado', 'Montado', 'Pronto', 'Enviado'];

const STATUS_ICONS = {
  'Aguardando Impressão': '⏳',
  'Impresso': '🖨️',
  'Cortado': '✂️',
  'Montado': '📑',
  'Pronto': '✅',
  'Enviado': '🚚'
};

const STATUS_COLORS = {
  'Aguardando Impressão': '#eab308',
  'Impresso': '#3b82f6',
  'Cortado': '#8b5cf6',
  'Montado': '#f97316',
  'Pronto': '#10b981',
  'Enviado': '#06b6d4'
};

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  renderUserInfo();
  loadOrders();
  loadStats();

  if (user.cargo !== 'admin') {
    const newBtn = document.getElementById('btn-novo-pedido');
    if (newBtn) newBtn.style.display = 'none';
  }

  ['filter-loja', 'filter-produto', 'filter-status', 'filter-data', 'filter-busca'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { loadOrders(); loadStats(); });
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
  document.getElementById('btn-toggle-archived').textContent = isArchivedMode ? '📋 Produção Ativa' : '📦 Arquivados';
  document.getElementById('page-title').textContent = isArchivedMode ? 'Pedidos Arquivados' : 'Fluxo de Produção Integrado';
  loadOrders();
}

async function loadStats() {
  try {
    const loja = document.getElementById('filter-loja')?.value || '';
    const produto = document.getElementById('filter-produto')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const data = document.getElementById('filter-data')?.value || '';
    const busca = document.getElementById('filter-busca')?.value || '';

    const query = new URLSearchParams({ loja, produto, status, data, busca }).toString();
    const stats = await apiRequest(`/dashboard/stats?${query}`);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 0; };
    set('stat-total-pedidos', stats.total_pedidos);
    set('stat-total-bloquinhos', stats.total_bloquinhos);
    set('stat-total-cadernetas', stats.total_cadernetas);
    set('stat-total-agendas', stats.total_agendas);
    set('stat-aguardando', stats.aguardando_impressao);
    set('stat-impressos', stats.impressos);
    set('stat-cortados', stats.cortados);
    set('stat-montados', stats.montados);
    set('stat-prontos', stats.prontos);
    set('stat-enviados', stats.enviados);
  } catch (err) {
    console.error('Erro ao carregar stats:', err);
  }
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
    const color = STATUS_COLORS[st] || '#64748b';
    return `
      <div class="kanban-column">
        <div class="kanban-column-header">
          <div class="kanban-column-title" style="color:${color};">${STATUS_ICONS[st]} ${st}</div>
          <span class="count-pill" style="background:${color}20;color:${color};">${filtered.length}</span>
        </div>
        <div class="kanban-cards">
          ${filtered.length === 0
            ? `<div style="font-size:0.75rem;color:var(--text-muted);text-align:center;padding:24px 8px;border:1px dashed var(--border-color);border-radius:8px;">Nenhum pedido</div>`
            : filtered.map(o => renderCardHTML(o)).join('')}
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

  const imgEl = (a) => a?.url?.match(/\.(jpeg|jpg|png|gif)$/i)
    ? `<img src="${a.url}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;border:1px solid var(--border-color);" alt="">`
    : a ? `<a href="${a.url}" target="_blank" class="btn btn-secondary" style="padding:3px 7px;font-size:0.65rem;">PDF</a>` : '';

  return `
    <div class="kanban-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
        <div style="min-width:0;">
          <div style="font-size:0.7rem;font-weight:800;color:var(--primary);">#${o.numero_pedido}</div>
          <div style="font-size:0.88rem;font-weight:800;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${o.titulo}</div>
        </div>
        <span class="badge ${o.loja === 'Okami' ? 'badge-okami' : 'badge-universo'}">${o.loja}</span>
      </div>

      ${(frente || verso) ? `<div style="display:flex;gap:6px;">${imgEl(frente)}${imgEl(verso)}</div>` : ''}

      <div style="font-size:0.77rem;color:var(--text-muted);display:flex;flex-direction:column;gap:2px;">
        <span><b>${o.produto}</b> · Qtd: <b>${o.quantidade}</b></span>
        <span>Espiral: <b>${o.tipo_espiral}</b>${o.frente_verso ? ' · F/V' : ''}</span>
        <span>${o.data_pedido ? o.data_pedido.split('T')[0] : '-'}</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid var(--border-color);">
        <div style="display:flex;gap:4px;">
          ${prevSt ? `<button class="btn btn-secondary" style="padding:3px 7px;font-size:0.7rem;" onclick="changeStatus(${o.id},'${prevSt}')">← Voltar</button>` : ''}
          ${nextSt ? `<button class="btn btn-primary" style="padding:3px 7px;font-size:0.7rem;" onclick="changeStatus(${o.id},'${nextSt}')">Avançar →</button>` : ''}
        </div>
        ${user?.cargo === 'admin' ? `
          <div style="display:flex;gap:3px;">
            <button class="btn btn-secondary" style="padding:3px 6px;" onclick="openEditModal(${o.id})" title="Editar">✏️</button>
            <button class="btn btn-secondary" style="padding:3px 6px;color:#ef4444;" onclick="deleteOrder(${o.id})" title="Excluir">🗑️</button>
          </div>` : ''}
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
      <td><b>#${o.numero_pedido}</b><br><span style="font-size:0.8rem;color:var(--text-muted);">${o.titulo}</span></td>
      <td><span class="badge ${o.loja === 'Okami' ? 'badge-okami' : 'badge-universo'}">${o.loja}</span></td>
      <td><b>${o.produto}</b></td>
      <td><b>${o.quantidade}</b></td>
      <td style="font-size:0.8rem;">Espiral: <b>${o.tipo_espiral}</b><br>F/V: ${o.frente_verso ? 'Sim' : 'Não'}</td>
      <td>
        <select class="form-control" style="padding:4px 8px;font-size:0.78rem;" onchange="changeStatus(${o.id}, this.value)">
          ${STATUSES.concat('Arquivado').map(st => `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </td>
      <td>${o.data_pedido ? o.data_pedido.split('T')[0] : '-'}</td>
      <td>
        ${user?.cargo === 'admin' ? `
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary" style="padding:5px;" onclick="openEditModal(${o.id})">✏️</button>
            <button class="btn btn-secondary" style="padding:5px;color:#ef4444;" onclick="deleteOrder(${o.id})">🗑️</button>
          </div>` : ''}
      </td>
    </tr>
  `).join('');
}

async function changeStatus(id, newStatus) {
  try {
    await apiRequest(`/pedidos/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
    loadOrders();
    loadStats();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteOrder(id) {
  if (!confirm('Excluir este pedido?')) return;
  try {
    await apiRequest(`/pedidos/${id}`, { method: 'DELETE' });
    loadOrders();
    loadStats();
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
    loadStats();
  } catch (err) {
    alert(err.message || 'Erro ao salvar pedido.');
  }
}
