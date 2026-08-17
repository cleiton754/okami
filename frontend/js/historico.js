document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  renderUserInfo();
  loadHistory();
});

async function loadHistory() {
  const container = document.getElementById('history-list');
  try {
    const list = await apiRequest('/historico');
    if (list.length === 0) {
      container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted);">Nenhum histórico registrado.</div>';
      return;
    }

    container.innerHTML = list.map(h => `
      <div style="padding:14px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-weight:700;font-size:0.95rem;">${h.acao}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">Responsável: <b>${h.usuario_nome || 'Sistema'}</b></div>
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);">
          🕒 ${new Date(h.data_hora).toLocaleString('pt-BR')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div style="padding:30px;text-align:center;color:#ef4444;">Erro ao carregar histórico.</div>';
  }
}
