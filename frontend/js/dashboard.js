document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  renderUserInfo();
  loadStats();

  ['filter-loja', 'filter-produto', 'filter-status', 'filter-data', 'filter-busca'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', loadStats);
  });
});

async function loadStats() {
  try {
    const loja = document.getElementById('filter-loja')?.value || '';
    const produto = document.getElementById('filter-produto')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const data = document.getElementById('filter-data')?.value || '';
    const busca = document.getElementById('filter-busca')?.value || '';

    const query = new URLSearchParams({ loja, produto, status, data, busca }).toString();
    const stats = await apiRequest(`/dashboard/stats?${query}`);

    document.getElementById('stat-total-pedidos').textContent = stats.total_pedidos || 0;
    document.getElementById('stat-total-bloquinhos').textContent = stats.total_bloquinhos || 0;
    document.getElementById('stat-total-cadernetas').textContent = stats.total_cadernetas || 0;
    document.getElementById('stat-total-agendas').textContent = stats.total_agendas || 0;
    document.getElementById('stat-aguardando').textContent = stats.aguardando_impressao || 0;
    document.getElementById('stat-impressos').textContent = stats.impressos || 0;
    document.getElementById('stat-cortados').textContent = stats.cortados || 0;
    document.getElementById('stat-montados').textContent = stats.montados || 0;
    document.getElementById('stat-prontos').textContent = stats.prontos || 0;
    document.getElementById('stat-enviados').textContent = stats.enviados || 0;
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}
