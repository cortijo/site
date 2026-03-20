/**
 * ===================================================================
 * GESTÃO DE VENDAS - App Principal
 * ===================================================================
 * 
 * CONFIGURAÇÃO:
 * Cole a URL do seu Google Apps Script abaixo (linha API_URL).
 * Para obter a URL:
 * 1. Abra sua Google Sheet
 * 2. Extensões > Apps Script
 * 3. Cole o código do Code.gs
 * 4. Implantar > Nova implantação > App da Web
 * 5. Copie a URL e cole abaixo
 * ===================================================================
 */

// ==================== CONFIGURAÇÃO ====================
// 🔴 COLE SUA URL DO GOOGLE APPS SCRIPT AQUI:
const API_URL = 'https://script.google.com/macros/s/AKfycbxHISZpexlFB0O4wpZ2PZQRtvAwxmjOlIJTLKH_XV89YqCzrV7Hl9XAmLI9JfUOTIUZ4g/exec';
// Exemplo: 'https://script.google.com/macros/s/AKfycby.../exec'

// ==================== ESTADO DA APLICAÇÃO ====================
let state = {
  produtos: [],
  vendas: [],
  contas: [],
  dashboard: null,
  currentTab: 'dashboard',
  currentFilter: {
    vendas: 'todos',
    contas: 'todos'
  }
};

let confirmCallback = null;

// ==================== AUTENTICAÇÃO ====================
function checkAuth() {
  const session = localStorage.getItem('vendas_session');
  if (session) {
    try {
      const user = JSON.parse(session);
      showApp(user);
      return true;
    } catch {
      localStorage.removeItem('vendas_session');
    }
  }
  showLoginScreen();
  return false;
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  document.querySelector('.bottom-nav').style.display = 'none';
}

function showApp(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  document.querySelector('.bottom-nav').style.display = 'flex';

  // Show user name in header
  const headerUser = document.getElementById('headerUserName');
  if (headerUser && user.nome) {
    headerUser.textContent = user.nome;
  }
}

async function doLogin() {
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const errorDiv = document.getElementById('loginError');

  if (!usuario || !senha) {
    errorDiv.textContent = '❌ Preencha usuário e senha';
    errorDiv.style.display = 'flex';
    return;
  }

  errorDiv.style.display = 'none';

  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></div> Entrando...';

  try {
    const result = await apiGet('login', { usuario, senha });

    if (result?.success) {
      localStorage.setItem('vendas_session', JSON.stringify(result.data));
      showApp(result.data);
      checkApiConfig();
      renderAll();
      loadAllData();
      showToast(`Bem-vindo, ${result.data.nome}! 👋`, 'success');
    } else {
      errorDiv.textContent = '❌ ' + (result?.error || 'Usuário ou senha incorretos');
      errorDiv.style.display = 'flex';
    }
  } catch (err) {
    errorDiv.textContent = '❌ Erro de conexão com o servidor';
    errorDiv.style.display = 'flex';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Entrar';
  }
}

function doLogout() {
  showConfirm(
    'Sair do Sistema',
    'Deseja realmente sair?',
    () => {
      localStorage.removeItem('vendas_session');
      showLoginScreen();
      document.getElementById('loginUsuario').value = '';
      document.getElementById('loginSenha').value = '';
      document.getElementById('loginError').style.display = 'none';
      showToast('Logout realizado!', 'success');
    },
    'Sair'
  );
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFilters();
  initVendaCheckbox();
  setDefaultDates();
  initLoginForm();

  // Check auth - shows login or app
  if (checkAuth()) {
    checkApiConfig();
    renderAll();
    if (API_URL) {
      loadAllData();
    }
  }
});

function initLoginForm() {
  const loginSenha = document.getElementById('loginSenha');
  const loginUsuario = document.getElementById('loginUsuario');

  if (loginSenha) {
    loginSenha.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  }
  if (loginUsuario) {
    loginUsuario.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('loginSenha').focus();
    });
  }
}

function checkApiConfig() {
  const banner = document.getElementById('configBanner');
  if (!API_URL) {
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const vendaData = document.getElementById('vendaData');
  if (vendaData) vendaData.value = today;
}

// ==================== NAVEGAÇÃO ====================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });

  // Sync button
  document.getElementById('btnSync').addEventListener('click', () => {
    loadAllData();
  });

  // FAB button
  document.getElementById('fabBtn').addEventListener('click', () => {
    handleFabClick();
  });
}

function switchTab(tabName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  state.currentTab = tabName;

  // Show/hide FAB (except dashboard)
  const fab = document.getElementById('fabBtn');
  fab.style.display = tabName === 'dashboard' ? 'none' : 'flex';
}

function handleFabClick() {
  switch (state.currentTab) {
    case 'produtos':
      openProdutoModal();
      break;
    case 'vendas':
      openVendaModal();
      break;
    case 'contas':
      openContaModal();
      break;
  }
}

// ==================== FILTROS ====================
function initFilters() {
  document.querySelectorAll('#vendasFilters .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#vendasFilters .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter.vendas = btn.dataset.filter;
      renderVendas();
    });
  });

  document.querySelectorAll('#contasFilters .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#contasFilters .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter.contas = btn.dataset.filter;
      renderContas();
    });
  });

  // Search
  const searchInput = document.getElementById('searchProdutos');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderProdutos();
    });
  }
}

function initVendaCheckbox() {
  const checkbox = document.getElementById('vendaGerarConta');
  const contaFields = document.getElementById('contaFields');

  if (checkbox) {
    checkbox.addEventListener('change', () => {
      contaFields.style.display = checkbox.checked ? 'block' : 'none';
    });
  }
}

// ==================== API CALLS ====================
async function apiCall(action, data = {}) {
  if (!API_URL) {
    showToast('Configure a URL da API no arquivo app.js', 'error');
    return null;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...data })
    });

    // no-cors mode returns opaque response, so we use GET with params instead
    return null;
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

// Using GET method for Apps Script compatibility
async function apiGet(action, params = {}) {
  if (!API_URL) {
    showToast('Configure a URL da API no arquivo app.js', 'error');
    return null;
  }

  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });
    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    showToast('Erro de conexão com o servidor', 'error');
    return null;
  }
}

async function apiPost(action, data = {}) {
  if (!API_URL) {
    showToast('Configure a URL da API no arquivo app.js', 'error');
    return null;
  }

  try {
    const url = `${API_URL}?action=${action}`;
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    showToast('Erro de conexão com o servidor', 'error');
    return null;
  }
}

// ==================== CARREGAR DADOS ====================
async function loadAllData() {
  showLoading(true);
  setSyncing(true);

  try {
    const [produtosRes, vendasRes, contasRes, dashRes] = await Promise.all([
      apiGet('getProdutos'),
      apiGet('getVendas'),
      apiGet('getContas'),
      apiGet('getDashboard')
    ]);

    if (produtosRes?.success) state.produtos = produtosRes.data || [];
    if (vendasRes?.success) state.vendas = vendasRes.data || [];
    if (contasRes?.success) state.contas = contasRes.data || [];
    if (dashRes?.success) state.dashboard = dashRes.data;

    renderAll();
    showToast('Dados sincronizados!', 'success');
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Erro ao carregar dados', 'error');
  } finally {
    showLoading(false);
    setSyncing(false);
  }
}

function setSyncing(syncing) {
  const btn = document.getElementById('btnSync');
  btn.classList.toggle('syncing', syncing);
}

// ==================== RENDERIZAÇÃO ====================
function renderAll() {
  renderDashboard();
  renderProdutos();
  renderVendas();
  renderContas();
  updateBadges();
}

// ---------- Dashboard ----------
function renderDashboard() {
  const d = state.dashboard;
  if (!d) return;

  document.getElementById('dashVendasTotal').textContent = formatCurrency(d.vendasMes?.total || 0);
  document.getElementById('dashVendasQtd').textContent = d.vendasMes?.quantidade || 0;
  document.getElementById('dashProdutosTotal').textContent = d.totalProdutos || 0;
  document.getElementById('dashPendenteTotal').textContent = formatCurrency(d.contasPendentes?.total || 0);
  document.getElementById('dashPendenteQtd').textContent = d.contasPendentes?.quantidade || 0;
  document.getElementById('dashAtrasadoTotal').textContent = formatCurrency(d.contasAtrasadas?.total || 0);
  document.getElementById('dashAtrasadoQtd').textContent = d.contasAtrasadas?.quantidade || 0;

  // Upcoming
  const list = document.getElementById('upcomingList');
  const upcoming = d.proximosVencimentos || [];

  if (upcoming.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h3>Tudo em dia! 🎉</h3>
        <p>Nenhum vencimento nos próximos 7 dias</p>
      </div>
    `;
  } else {
    list.innerHTML = upcoming.map(c => `
      <div class="upcoming-item" onclick="switchTab('contas')">
        <div class="upcoming-info">
          <h4>${escapeHtml(c.Cliente || 'Sem nome')}</h4>
          <p>${c.Observacao || 'Sem observação'}</p>
        </div>
        <div class="upcoming-value">
          <div class="amount">${formatCurrency(c.Valor)}</div>
          <div class="date">${formatDate(c.DataVencimento)}</div>
        </div>
      </div>
    `).join('');
  }
}

// ---------- Produtos ----------
function renderProdutos() {
  const container = document.getElementById('produtosList');
  const searchTerm = (document.getElementById('searchProdutos')?.value || '').toLowerCase();

  let produtos = state.produtos;
  if (searchTerm) {
    produtos = produtos.filter(p =>
      (p.Nome || '').toLowerCase().includes(searchTerm) ||
      (p.Descricao || '').toLowerCase().includes(searchTerm)
    );
  }

  if (produtos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z"/></svg>
        <h3>Nenhum produto cadastrado</h3>
        <p>Toque no botão + para adicionar seu primeiro produto</p>
      </div>
    `;
    return;
  }

  container.innerHTML = produtos.map(p => {
    const estoque = parseInt(p.Estoque) || 0;
    let stockClass = '';
    let stockLabel = `${estoque} un.`;

    if (estoque === 0) {
      stockClass = 'out';
      stockLabel = 'Sem estoque';
    } else if (estoque <= 5) {
      stockClass = 'low';
      stockLabel = `${estoque} un. ⚠️`;
    }

    const imgHtml = p.FotoBase64
      ? `<img src="${p.FotoBase64}" class="product-img" alt="${escapeHtml(p.Nome)}">`
      : `<div class="product-img-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

    return `
      <div class="product-card">
        <div class="product-card-body">
          ${imgHtml}
          <div class="product-info">
            <h3>${escapeHtml(p.Nome || 'Sem nome')}</h3>
            ${p.Descricao ? `<div class="description">${escapeHtml(p.Descricao)}</div>` : ''}
            <div class="product-meta">
              <span class="product-price">${formatCurrency(p.Preco)}</span>
              <span class="product-stock ${stockClass}">${stockLabel}</span>
            </div>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn-edit" onclick="editProduto('${p.ID}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="btn-delete" onclick="deleteProduto('${p.ID}', '${escapeHtml(p.Nome)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Excluir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Vendas ----------
function renderVendas() {
  const container = document.getElementById('vendasList');
  let vendas = [...state.vendas].reverse(); // Mais recentes primeiro

  const filter = state.currentFilter.vendas;
  const today = new Date().toISOString().split('T')[0];

  if (filter === 'hoje') {
    vendas = vendas.filter(v => String(v.DataVenda).split('T')[0] === today);
  } else if (filter === 'semana') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    vendas = vendas.filter(v => String(v.DataVenda).split('T')[0] >= weekAgoStr);
  } else if (filter === 'mes') {
    const monthStart = today.substring(0, 7);
    vendas = vendas.filter(v => String(v.DataVenda).substring(0, 7) === monthStart);
  }

  if (vendas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
        <h3>Nenhuma venda encontrada</h3>
        <p>Toque no botão + para registrar uma venda</p>
      </div>
    `;
    return;
  }

  container.innerHTML = vendas.map(v => `
    <div class="record-card">
      <div class="record-card-header">
        <h4>${escapeHtml(v.ProdutoNome || 'Produto')}</h4>
        <span class="amount">${formatCurrency(v.ValorTotal)}</span>
      </div>
      <div class="record-card-meta">
        ${v.Cliente ? `<span class="record-tag cliente">👤 ${escapeHtml(v.Cliente)}</span>` : ''}
        <span class="record-tag data">📅 ${formatDate(v.DataVenda)}</span>
        <span class="record-tag">${v.Quantidade}x ${formatCurrency(v.ValorUnitario)}</span>
      </div>
      ${v.Observacao ? `<p class="text-sm text-muted">${escapeHtml(v.Observacao)}</p>` : ''}
      <div class="record-card-actions">
        <button class="btn-edit" onclick="editVenda('${v.ID}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-delete" onclick="deleteVenda('${v.ID}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ---------- Contas a Receber ----------
function renderContas() {
  const container = document.getElementById('contasList');
  const today = new Date().toISOString().split('T')[0];

  let contas = [...state.contas].map(c => {
    // Determinar status real
    if (String(c.Status) !== 'Pago') {
      const vencimento = String(c.DataVencimento).split('T')[0];
      c._status = vencimento < today ? 'Atrasado' : 'Pendente';
    } else {
      c._status = 'Pago';
    }
    return c;
  });

  const filter = state.currentFilter.contas;
  if (filter !== 'todos') {
    contas = contas.filter(c => c._status.toLowerCase() === filter.toLowerCase());
  }

  // Sort: atrasado first, then by vencimento
  contas.sort((a, b) => {
    const order = { 'Atrasado': 0, 'Pendente': 1, 'Pago': 2 };
    if (order[a._status] !== order[b._status]) return order[a._status] - order[b._status];
    return String(a.DataVencimento).localeCompare(String(b.DataVencimento));
  });

  if (contas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        <h3>Nenhuma conta encontrada</h3>
        <p>Toque no botão + para agendar um recebimento</p>
      </div>
    `;
    return;
  }

  container.innerHTML = contas.map(c => {
    const statusClass = c._status.toLowerCase();
    const statusLabel = c._status;
    const isPaid = c._status === 'Pago';

    return `
      <div class="record-card">
        <div class="record-card-header">
          <div>
            <h4>${escapeHtml(c.Cliente || 'Sem nome')}</h4>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>
          <span class="amount" style="color: ${isPaid ? 'var(--success)' : c._status === 'Atrasado' ? 'var(--danger)' : 'var(--warning)'}">
            ${formatCurrency(c.Valor)}
          </span>
        </div>
        <div class="record-card-meta">
          <span class="record-tag data">📅 Vence: ${formatDate(c.DataVencimento)}</span>
          ${c.DataPagamento ? `<span class="record-tag" style="background: var(--success-bg); color: var(--success);">✅ Pago: ${formatDate(c.DataPagamento)}</span>` : ''}
        </div>
        ${c.Observacao ? `<p class="text-sm text-muted">${escapeHtml(c.Observacao)}</p>` : ''}
        <div class="record-card-actions">
          ${!isPaid ? `
            <button class="btn-pay" onclick="marcarPago('${c.ID}')" title="Marcar como pago">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          ` : ''}
          <button class="btn-edit" onclick="editConta('${c.ID}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-delete" onclick="deleteConta('${c.ID}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateBadges() {
  const today = new Date().toISOString().split('T')[0];
  const atrasadas = state.contas.filter(c => {
    if (String(c.Status) === 'Pago') return false;
    return String(c.DataVencimento).split('T')[0] < today;
  }).length;

  const badge = document.getElementById('contasBadge');
  if (atrasadas > 0) {
    badge.textContent = atrasadas;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ==================== MODAL HELPERS ====================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// ==================== PRODUTO CRUD ====================
function openProdutoModal(produto = null) {
  document.getElementById('modalProdutoTitle').textContent = produto ? 'Editar Produto' : 'Novo Produto';
  document.getElementById('produtoId').value = produto?.ID || '';
  document.getElementById('produtoNome').value = produto?.Nome || '';
  document.getElementById('produtoDescricao').value = produto?.Descricao || '';
  document.getElementById('produtoPreco').value = produto?.Preco || '';
  document.getElementById('produtoEstoque').value = produto?.Estoque || '';

  // Photo
  const preview = document.getElementById('photoPreview');
  const upload = document.getElementById('photoUpload');
  if (produto?.FotoBase64) {
    preview.src = produto.FotoBase64;
    preview.style.display = 'block';
    upload.classList.add('has-photo');
  } else {
    preview.src = '';
    preview.style.display = 'none';
    upload.classList.remove('has-photo');
  }

  openModal('modalProduto');
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Compress and convert to base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 600;
      let { width, height } = img;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL('image/jpeg', 0.7);

      const preview = document.getElementById('photoPreview');
      preview.src = base64;
      preview.style.display = 'block';
      document.getElementById('photoUpload').classList.add('has-photo');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  document.getElementById('photoPreview').src = '';
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoUpload').classList.remove('has-photo');
  document.getElementById('produtoFotoInput').value = '';
}

async function saveProduto() {
  const nome = document.getElementById('produtoNome').value.trim();
  const preco = document.getElementById('produtoPreco').value;

  if (!nome) {
    showToast('Preencha o nome do produto', 'error');
    return;
  }
  if (!preco) {
    showToast('Preencha o preço do produto', 'error');
    return;
  }

  const id = document.getElementById('produtoId').value;
  const data = {
    nome,
    descricao: document.getElementById('produtoDescricao').value.trim(),
    preco: parseFloat(preco),
    estoque: parseInt(document.getElementById('produtoEstoque').value) || 0,
    fotoBase64: document.getElementById('photoPreview').src || ''
  };

  showLoading(true);

  let result;
  if (id) {
    data.id = id;
    result = await apiPost('updateProduto', data);
  } else {
    result = await apiPost('addProduto', data);
  }

  showLoading(false);

  if (result?.success) {
    showToast(result.message, 'success');
    closeModal('modalProduto');
    loadAllData();
  } else {
    showToast(result?.error || 'Erro ao salvar produto', 'error');
  }
}

function editProduto(id) {
  const produto = state.produtos.find(p => p.ID === id);
  if (produto) openProdutoModal(produto);
}

function deleteProduto(id, nome) {
  showConfirm(
    'Excluir Produto',
    `Tem certeza que deseja excluir "${nome}"?`,
    async () => {
      showLoading(true);
      const result = await apiPost('deleteProduto', { id });
      showLoading(false);

      if (result?.success) {
        showToast('Produto excluído!', 'success');
        loadAllData();
      } else {
        showToast(result?.error || 'Erro ao excluir', 'error');
      }
    }
  );
}

// ==================== VENDA CRUD ====================
function openVendaModal(venda = null) {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('modalVendaTitle').textContent = venda ? 'Editar Venda' : 'Nova Venda';
  document.getElementById('vendaId').value = venda?.ID || '';
  document.getElementById('vendaCliente').value = venda?.Cliente || '';
  document.getElementById('vendaQuantidade').value = venda?.Quantidade || 1;
  document.getElementById('vendaValorUnitario').value = venda?.ValorUnitario || '';
  document.getElementById('vendaData').value = venda?.DataVenda ? String(venda.DataVenda).split('T')[0] : today;
  document.getElementById('vendaObservacao').value = venda?.Observacao || '';
  document.getElementById('vendaGerarConta').checked = false;
  document.getElementById('contaFields').style.display = 'none';
  
  // Set defaults for parcels
  const elParcelas = document.getElementById('vendaParcelas');
  const elIntervalo = document.getElementById('vendaIntervalo');
  const elVencimento = document.getElementById('vendaVencimento');
  const elPreview = document.getElementById('parcelasPreview');
  
  if (elParcelas) elParcelas.value = '1';
  if (elIntervalo) elIntervalo.value = '30';
  if (elVencimento) elVencimento.value = today;
  if (elPreview) {
    elPreview.style.display = 'none';
    elPreview.innerHTML = '';
  }

  // Populate product select
  const select = document.getElementById('vendaProduto');
  select.innerHTML = '<option value="">Selecione um produto</option>' +
    state.produtos.map(p => `<option value="${p.ID}" data-preco="${p.Preco}" ${venda?.ProdutoID === p.ID ? 'selected' : ''}>${escapeHtml(p.Nome)} - ${formatCurrency(p.Preco)}</option>`).join('');

  if (venda?.ProdutoID) {
    select.value = venda.ProdutoID;
  }

  calcularTotal();
  openModal('modalVenda');
}

function onProdutoSelect() {
  const select = document.getElementById('vendaProduto');
  const option = select.options[select.selectedIndex];

  if (option && option.dataset.preco) {
    document.getElementById('vendaValorUnitario').value = parseFloat(option.dataset.preco);
    calcularTotal();
  }
}

function calcularTotal() {
  const qtd = parseInt(document.getElementById('vendaQuantidade').value) || 0;
  const valor = parseFloat(document.getElementById('vendaValorUnitario').value) || 0;
  document.getElementById('vendaValorTotal').value = formatCurrency(qtd * valor);
  renderParcelasPreview();
}

function renderParcelasPreview() {
  const container = document.getElementById('parcelasPreview');
  if (!container) return;
  
  const checked = document.getElementById('vendaGerarConta').checked;
  
  if (!checked) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  
  const qtd = parseInt(document.getElementById('vendaQuantidade').value) || 0;
  const valorUnitario = parseFloat(document.getElementById('vendaValorUnitario').value) || 0;
  const total = Math.round((qtd * valorUnitario) * 100) / 100;
  
  const parcelas = parseInt(document.getElementById('vendaParcelas').value) || 1;
  const dataVencimentoStr = document.getElementById('vendaVencimento').value;
  const intervalo = parseInt(document.getElementById('vendaIntervalo').value) || 30;
  
  if (!total || !dataVencimentoStr) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  
  container.style.display = 'flex';
  
  // Exact rounding logic: base value truncated to 2 decimals, remainder goes to first parcel
  const valorBase = Math.floor((total / parcelas) * 100) / 100;
  const diferenca = Math.round((total - (valorBase * parcelas)) * 100) / 100;
  
  let html = '';
  
  // Create date locally to avoid timezone issues
  let [yyyy, mm, dd] = dataVencimentoStr.split('-');
  let currentDate = new Date(yyyy, mm - 1, dd);
  
  for (let i = 1; i <= parcelas; i++) {
    let valorDestaParcela = valorBase;
    if (i === 1) {
      valorDestaParcela = Math.round((valorBase + diferenca) * 100) / 100;
    }
    
    html += `
      <div class="parcela-item" style="align-items: center; gap: 8px; flex-wrap: wrap;">
        <span style="display:flex; align-items:center; gap:8px;">
          ${i}/${parcelas} 
          <input type="date" class="form-control parcela-date" value="${currentDate.toISOString().split('T')[0]}" style="padding: 2px 6px; height: 32px; width: 120px;">
        </span>
        <span style="display:flex; align-items:center; gap:4px; font-weight: normal; color: var(--text-primary);">
          R$ <input type="number" step="0.01" min="0" class="form-control parcela-valor" value="${valorDestaParcela.toFixed(2)}" style="padding: 2px 6px; height: 32px; width: 85px;">
        </span>
      </div>
    `;
    currentDate.setDate(currentDate.getDate() + intervalo);
  }
  
  container.innerHTML = html;
}

async function saveVenda() {
  const produtoId = document.getElementById('vendaProduto').value;
  const quantidade = document.getElementById('vendaQuantidade').value;
  const valorUnitario = document.getElementById('vendaValorUnitario').value;

  if (!produtoId) {
    showToast('Selecione um produto', 'error');
    return;
  }
  if (!quantidade || parseInt(quantidade) <= 0) {
    showToast('Preencha a quantidade', 'error');
    return;
  }
  if (!valorUnitario) {
    showToast('Preencha o valor unitário', 'error');
    return;
  }

  const id = document.getElementById('vendaId').value;
  const select = document.getElementById('vendaProduto');
  const produtoNome = select.options[select.selectedIndex]?.text.split(' - ')[0] || '';

  const data = {
    produtoId,
    produtoNome,
    quantidade: parseInt(quantidade),
    valorUnitario: parseFloat(valorUnitario),
    dataVenda: document.getElementById('vendaData').value,
    cliente: document.getElementById('vendaCliente').value.trim(),
    observacao: document.getElementById('vendaObservacao').value.trim()
  };

  showLoading(true);

  let result;
  if (id) {
    data.id = id;
    result = await apiPost('updateVenda', data);
  } else {
    result = await apiPost('addVenda', data);
  }

  // Se gerar conta a receber (ou parcelar)
  if (result?.success && document.getElementById('vendaGerarConta').checked && !id) {
    const dataVencimentoStr = document.getElementById('vendaVencimento').value;
    const parcelas = parseInt(document.getElementById('vendaParcelas').value) || 1;
    
    if (dataVencimentoStr) {
      const promises = [];
      
      const dateInputs = document.querySelectorAll('.parcela-date');
      const valInputs = document.querySelectorAll('.parcela-valor');
      
      for (let i = 0; i < parcelas; i++) {
        let obsParcela = `Venda: ${produtoNome} (${data.quantidade}x)`;
        if (parcelas > 1) {
          obsParcela += ` - Parcela ${i+1}/${parcelas}`;
        }
        
        // Grab value from user inputs if present, fallback to generated total
        const pDate = dateInputs[i] ? dateInputs[i].value : dataVencimentoStr;
        const pVal = valInputs[i] ? parseFloat(valInputs[i].value) : ((data.quantidade * data.valorUnitario) / parcelas);
        
        promises.push(apiPost('addConta', {
          vendaId: result.id || '',
          cliente: data.cliente,
          valor: pVal,
          dataVencimento: pDate,
          observacao: obsParcela
        }));
      }
      
      await Promise.all(promises);
    }
  }

  showLoading(false);

  if (result?.success) {
    showToast(result.message, 'success');
    closeModal('modalVenda');
    loadAllData();
  } else {
    showToast(result?.error || 'Erro ao salvar venda', 'error');
  }
}

function editVenda(id) {
  const venda = state.vendas.find(v => v.ID === id);
  if (venda) openVendaModal(venda);
}

function deleteVenda(id) {
  showConfirm(
    'Excluir Venda',
    'Tem certeza que deseja excluir esta venda?',
    async () => {
      showLoading(true);
      const result = await apiPost('deleteVenda', { id });
      showLoading(false);

      if (result?.success) {
        showToast('Venda excluída!', 'success');
        loadAllData();
      } else {
        showToast(result?.error || 'Erro ao excluir', 'error');
      }
    }
  );
}

// ==================== CONTA CRUD ====================
function openContaModal(conta = null) {
  document.getElementById('modalContaTitle').textContent = conta ? 'Editar Conta' : 'Nova Conta a Receber';
  document.getElementById('contaId').value = conta?.ID || '';
  document.getElementById('contaCliente').value = conta?.Cliente || '';
  document.getElementById('contaValor').value = conta?.Valor || '';
  document.getElementById('contaVencimento').value = conta?.DataVencimento ? String(conta.DataVencimento).split('T')[0] : '';
  document.getElementById('contaObservacao').value = conta?.Observacao || '';

  openModal('modalConta');
}

async function saveConta() {
  const cliente = document.getElementById('contaCliente').value.trim();
  const valor = document.getElementById('contaValor').value;
  const vencimento = document.getElementById('contaVencimento').value;

  if (!cliente) {
    showToast('Preencha o nome do cliente', 'error');
    return;
  }
  if (!valor) {
    showToast('Preencha o valor', 'error');
    return;
  }
  if (!vencimento) {
    showToast('Preencha a data de vencimento', 'error');
    return;
  }

  const id = document.getElementById('contaId').value;
  const data = {
    cliente,
    valor: parseFloat(valor),
    dataVencimento: vencimento,
    observacao: document.getElementById('contaObservacao').value.trim()
  };

  showLoading(true);

  let result;
  if (id) {
    data.id = id;
    result = await apiPost('updateConta', data);
  } else {
    result = await apiPost('addConta', data);
  }

  showLoading(false);

  if (result?.success) {
    showToast(result.message, 'success');
    closeModal('modalConta');
    loadAllData();
  } else {
    showToast(result?.error || 'Erro ao salvar conta', 'error');
  }
}

function editConta(id) {
  const conta = state.contas.find(c => c.ID === id);
  if (conta) openContaModal(conta);
}

function deleteConta(id) {
  showConfirm(
    'Excluir Conta',
    'Tem certeza que deseja excluir esta conta?',
    async () => {
      showLoading(true);
      const result = await apiPost('deleteConta', { id });
      showLoading(false);

      if (result?.success) {
        showToast('Conta excluída!', 'success');
        loadAllData();
      } else {
        showToast(result?.error || 'Erro ao excluir', 'error');
      }
    }
  );
}

async function marcarPago(id) {
  showConfirm(
    'Confirmar Pagamento',
    'Marcar esta conta como paga?',
    async () => {
      showLoading(true);
      const result = await apiPost('updateConta', {
        id,
        status: 'Pago',
        dataPagamento: new Date().toISOString().split('T')[0]
      });
      showLoading(false);

      if (result?.success) {
        showToast('Conta marcada como paga! ✅', 'success');
        loadAllData();
      } else {
        showToast(result?.error || 'Erro ao atualizar', 'error');
      }
    },
    'Confirmar'
  );
}

// ==================== CONFIRM DIALOG ====================
function showConfirm(title, message, callback, btnText = 'Excluir') {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmBtn').textContent = btnText;

  if (btnText === 'Confirmar') {
    document.getElementById('confirmBtn').className = 'btn-primary';
  } else {
    document.getElementById('confirmBtn').className = 'btn-danger';
  }

  confirmCallback = callback;
  document.getElementById('confirmDialog').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmDialog').classList.remove('open');
  confirmCallback = null;
}

function confirmAction() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirm();
}

// ==================== UTILITÁRIOS ====================
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parseFloat(value) || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(String(dateStr).split('T')[0] + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.toggle('active', show);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  toast.innerHTML = `<span>${icons[type] || ''}</span> ${escapeHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-16px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
