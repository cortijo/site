/**
 * ===================================================================
 * GESTÃO DE VENDAS - Backend API (Google Apps Script)
 * ===================================================================
 * 
 * INSTRUÇÕES DE SETUP:
 * 1. Crie uma nova Google Sheet
 * 2. Vá em Extensões > Apps Script
 * 3. Cole todo este código no editor
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Tipo: "App da Web"
 * 6. Executar como: "Eu"
 * 7. Quem tem acesso: "Qualquer pessoa"
 * 8. Copie a URL gerada e cole no app (app.js > API_URL)
 * 
 * A planilha será criada automaticamente com as abas necessárias
 * na primeira execução.
 * ===================================================================
 */

// ==================== CONFIGURAÇÃO ====================

const SHEET_PRODUTOS = 'Produtos';
const SHEET_VENDAS = 'Vendas';
const SHEET_CONTAS = 'ContasReceber';
const SHEET_USUARIOS = 'Usuarios';

const HEADERS_PRODUTOS = ['ID', 'Nome', 'Descricao', 'Preco', 'Estoque', 'FotoBase64', 'CriadoEm', 'AtualizadoEm'];
const HEADERS_VENDAS = ['ID', 'ProdutoID', 'ProdutoNome', 'Quantidade', 'ValorUnitario', 'ValorTotal', 'DataVenda', 'Cliente', 'Observacao', 'CriadoEm'];
const HEADERS_CONTAS = ['ID', 'VendaID', 'Cliente', 'Valor', 'DataVencimento', 'DataPagamento', 'Status', 'Observacao', 'CriadoEm', 'AtualizadoEm'];
const HEADERS_USUARIOS = ['ID', 'Usuario', 'Senha', 'Nome', 'CriadoEm'];

// ==================== SETUP AUTOMÁTICO ====================

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheets = [
    { name: SHEET_PRODUTOS, headers: HEADERS_PRODUTOS },
    { name: SHEET_VENDAS, headers: HEADERS_VENDAS },
    { name: SHEET_CONTAS, headers: HEADERS_CONTAS },
    { name: SHEET_USUARIOS, headers: HEADERS_USUARIOS }
  ];
  
  sheets.forEach(config => {
    let sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });
  
  // Criar usuário padrão se a aba estiver vazia
  const userSheet = ss.getSheetByName(SHEET_USUARIOS);
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow([generateId(), 'admin', 'admin', 'Administrador', new Date().toISOString()]);
  }
}

// ==================== ROTEAMENTO ====================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  setupSheets();
  
  const params = e.parameter;
  const action = params.action || '';
  
  let postData = {};
  if (e.postData) {
    try {
      postData = JSON.parse(e.postData.contents);
    } catch (err) {
      postData = {};
    }
  }
  
  // Merge params
  const data = Object.assign({}, params, postData);
  
  let result;
  
  try {
    switch (action) {
      // Autenticação
      case 'login':
        result = login(data);
        break;
      
      // Produtos
      case 'getProdutos':
        result = getProdutos();
        break;
      case 'addProduto':
        result = addProduto(data);
        break;
      case 'updateProduto':
        result = updateProduto(data);
        break;
      case 'deleteProduto':
        result = deleteProduto(data.id);
        break;
      
      // Vendas
      case 'getVendas':
        result = getVendas();
        break;
      case 'addVenda':
        result = addVenda(data);
        break;
      case 'updateVenda':
        result = updateVenda(data);
        break;
      case 'deleteVenda':
        result = deleteVenda(data.id);
        break;
      
      // Contas a Receber
      case 'getContas':
        result = getContas();
        break;
      case 'addConta':
        result = addConta(data);
        break;
      case 'updateConta':
        result = updateConta(data);
        break;
      case 'deleteConta':
        result = deleteConta(data.id);
        break;
      
      // Dashboard
      case 'getDashboard':
        result = getDashboard();
        break;
      
      default:
        result = { success: false, error: 'Ação não reconhecida: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== UTILITÁRIOS ====================

function generateId() {
  return Utilities.getUuid().substring(0, 8);
}

function now() {
  return new Date().toISOString();
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = data[i][idx];
    });
    rows.push(row);
  }
  
  return rows;
}

function findRowIndex(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return i + 1; // 1-indexed for Sheets
    }
  }
  return -1;
}

// ==================== CRUD PRODUTOS ====================

function getProdutos() {
  const produtos = getSheetData(SHEET_PRODUTOS);
  return { success: true, data: produtos };
}

function addProduto(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUTOS);
  
  const id = generateId();
  const timestamp = now();
  
  const row = [
    id,
    data.nome || '',
    data.descricao || '',
    parseFloat(data.preco) || 0,
    parseInt(data.estoque) || 0,
    data.fotoBase64 || '',
    timestamp,
    timestamp
  ];
  
  sheet.appendRow(row);
  
  return { success: true, id: id, message: 'Produto adicionado com sucesso!' };
}

function updateProduto(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUTOS);
  const rowIndex = findRowIndex(SHEET_PRODUTOS, data.id);
  
  if (rowIndex === -1) {
    return { success: false, error: 'Produto não encontrado' };
  }
  
  const currentRow = sheet.getRange(rowIndex, 1, 1, HEADERS_PRODUTOS.length).getValues()[0];
  
  const updatedRow = [
    data.id,
    data.nome || currentRow[1],
    data.descricao || currentRow[2],
    data.preco !== undefined ? parseFloat(data.preco) : currentRow[3],
    data.estoque !== undefined ? parseInt(data.estoque) : currentRow[4],
    data.fotoBase64 !== undefined ? data.fotoBase64 : currentRow[5],
    currentRow[6], // CriadoEm - não muda
    now() // AtualizadoEm
  ];
  
  sheet.getRange(rowIndex, 1, 1, HEADERS_PRODUTOS.length).setValues([updatedRow]);
  
  return { success: true, message: 'Produto atualizado com sucesso!' };
}

function deleteProduto(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUTOS);
  const rowIndex = findRowIndex(SHEET_PRODUTOS, id);
  
  if (rowIndex === -1) {
    return { success: false, error: 'Produto não encontrado' };
  }
  
  sheet.deleteRow(rowIndex);
  return { success: true, message: 'Produto excluído com sucesso!' };
}

// ==================== CRUD VENDAS ====================

function getVendas() {
  const vendas = getSheetData(SHEET_VENDAS);
  return { success: true, data: vendas };
}

function addVenda(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_VENDAS);
  
  const id = generateId();
  const valorTotal = (parseFloat(data.valorUnitario) || 0) * (parseInt(data.quantidade) || 0);
  
  const row = [
    id,
    data.produtoId || '',
    data.produtoNome || '',
    parseInt(data.quantidade) || 0,
    parseFloat(data.valorUnitario) || 0,
    valorTotal,
    data.dataVenda || new Date().toISOString().split('T')[0],
    data.cliente || '',
    data.observacao || '',
    now()
  ];
  
  sheet.appendRow(row);
  
  // Atualizar estoque do produto
  if (data.produtoId) {
    const prodSheet = ss.getSheetByName(SHEET_PRODUTOS);
    const prodRowIndex = findRowIndex(SHEET_PRODUTOS, data.produtoId);
    if (prodRowIndex !== -1) {
      const currentEstoque = prodSheet.getRange(prodRowIndex, 5).getValue();
      const novoEstoque = Math.max(0, currentEstoque - (parseInt(data.quantidade) || 0));
      prodSheet.getRange(prodRowIndex, 5).setValue(novoEstoque);
    }
  }
  
  return { success: true, id: id, valorTotal: valorTotal, message: 'Venda registrada com sucesso!' };
}

function updateVenda(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_VENDAS);
  const rowIndex = findRowIndex(SHEET_VENDAS, data.id);
  
  if (rowIndex === -1) {
    return { success: false, error: 'Venda não encontrada' };
  }
  
  const currentRow = sheet.getRange(rowIndex, 1, 1, HEADERS_VENDAS.length).getValues()[0];
  
  const quantidade = data.quantidade !== undefined ? parseInt(data.quantidade) : currentRow[3];
  const valorUnitario = data.valorUnitario !== undefined ? parseFloat(data.valorUnitario) : currentRow[4];
  const valorTotal = quantidade * valorUnitario;
  
  const updatedRow = [
    data.id,
    data.produtoId || currentRow[1],
    data.produtoNome || currentRow[2],
    quantidade,
    valorUnitario,
    valorTotal,
    data.dataVenda || currentRow[6],
    data.cliente || currentRow[7],
    data.observacao !== undefined ? data.observacao : currentRow[8],
    currentRow[9] // CriadoEm
  ];
  
  sheet.getRange(rowIndex, 1, 1, HEADERS_VENDAS.length).setValues([updatedRow]);
  
  return { success: true, message: 'Venda atualizada com sucesso!' };
}

function deleteVenda(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_VENDAS);
  const rowIndex = findRowIndex(SHEET_VENDAS, id);
  
  if (rowIndex === -1) {
    return { success: false, error: 'Venda não encontrada' };
  }
  
  sheet.deleteRow(rowIndex);
  return { success: true, message: 'Venda excluída com sucesso!' };
}

// ==================== CRUD CONTAS A RECEBER ====================

function getContas() {
  const contas = getSheetData(SHEET_CONTAS);
  
  // Atualizar status automaticamente
  const hoje = new Date().toISOString().split('T')[0];
  contas.forEach(conta => {
    if (conta.Status !== 'Pago') {
      if (conta.DataVencimento && String(conta.DataVencimento).split('T')[0] < hoje) {
        conta.Status = 'Atrasado';
      } else {
        conta.Status = 'Pendente';
      }
    }
  });
  
  return { success: true, data: contas };
}

function addConta(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONTAS);
  
  const id = generateId();
  const timestamp = now();
  
  const row = [
    id,
    data.vendaId || '',
    data.cliente || '',
    parseFloat(data.valor) || 0,
    data.dataVencimento || '',
    '', // DataPagamento - vazio inicialmente
    'Pendente',
    data.observacao || '',
    timestamp,
    timestamp
  ];
  
  sheet.appendRow(row);
  
  return { success: true, id: id, message: 'Conta a receber adicionada com sucesso!' };
}

function updateConta(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONTAS);
  const rowIndex = findRowIndex(SHEET_CONTAS, data.id);
  
  if (rowIndex === -1) {
    return { success: false, error: 'Conta não encontrada' };
  }
  
  const currentRow = sheet.getRange(rowIndex, 1, 1, HEADERS_CONTAS.length).getValues()[0];
  
  let status = data.status || currentRow[6];
  let dataPagamento = data.dataPagamento || currentRow[5];
  
  // Se marcar como pago e não informou data, usar hoje
  if (status === 'Pago' && !dataPagamento) {
    dataPagamento = new Date().toISOString().split('T')[0];
  }
  
  const updatedRow = [
    data.id,
    data.vendaId || currentRow[1],
    data.cliente || currentRow[2],
    data.valor !== undefined ? parseFloat(data.valor) : currentRow[3],
    data.dataVencimento || currentRow[4],
    dataPagamento,
    status,
    data.observacao !== undefined ? data.observacao : currentRow[7],
    currentRow[8], // CriadoEm
    now() // AtualizadoEm
  ];
  
  sheet.getRange(rowIndex, 1, 1, HEADERS_CONTAS.length).setValues([updatedRow]);
  
  return { success: true, message: 'Conta atualizada com sucesso!' };
}

function deleteConta(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONTAS);
  const rowIndex = findRowIndex(SHEET_CONTAS, id);
  
  if (rowIndex === -1) {
    return { success: false, error: 'Conta não encontrada' };
  }
  
  sheet.deleteRow(rowIndex);
  return { success: true, message: 'Conta excluída com sucesso!' };
}

// ==================== DASHBOARD ====================

function getDashboard() {
  const vendas = getSheetData(SHEET_VENDAS);
  const contas = getSheetData(SHEET_CONTAS);
  const produtos = getSheetData(SHEET_PRODUTOS);
  
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const hojeStr = hoje.toISOString().split('T')[0];
  
  // Vendas do mês
  let totalVendasMes = 0;
  let qtdVendasMes = 0;
  vendas.forEach(v => {
    const dataVenda = new Date(v.DataVenda);
    if (dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual) {
      totalVendasMes += parseFloat(v.ValorTotal) || 0;
      qtdVendasMes++;
    }
  });
  
  // Contas
  let totalPendente = 0;
  let totalAtrasado = 0;
  let qtdPendente = 0;
  let qtdAtrasado = 0;
  
  contas.forEach(c => {
    if (String(c.Status) !== 'Pago') {
      const valor = parseFloat(c.Valor) || 0;
      const vencimento = String(c.DataVencimento).split('T')[0];
      
      if (vencimento < hojeStr) {
        totalAtrasado += valor;
        qtdAtrasado++;
      } else {
        totalPendente += valor;
        qtdPendente++;
      }
    }
  });
  
  // Próximos vencimentos (7 dias)
  const seteDias = new Date(hoje);
  seteDias.setDate(seteDias.getDate() + 7);
  const seteDiasStr = seteDias.toISOString().split('T')[0];
  
  const proximosVencimentos = contas.filter(c => {
    if (String(c.Status) === 'Pago') return false;
    const vencimento = String(c.DataVencimento).split('T')[0];
    return vencimento >= hojeStr && vencimento <= seteDiasStr;
  });
  
  return {
    success: true,
    data: {
      totalProdutos: produtos.length,
      vendasMes: {
        total: totalVendasMes,
        quantidade: qtdVendasMes
      },
      contasPendentes: {
        total: totalPendente,
        quantidade: qtdPendente
      },
      contasAtrasadas: {
        total: totalAtrasado,
        quantidade: qtdAtrasado
      },
      proximosVencimentos: proximosVencimentos,
      totalVendasGeral: vendas.length
    }
  };
}

// ==================== AUTENTICAÇÃO ====================

function login(data) {
  const usuario = String(data.usuario || '').trim();
  const senha = String(data.senha || '').trim();
  
  if (!usuario || !senha) {
    return { success: false, error: 'Preencha usuário e senha' };
  }
  
  const usuarios = getSheetData(SHEET_USUARIOS);
  const user = usuarios.find(u => 
    String(u.Usuario).toLowerCase() === usuario.toLowerCase() && 
    String(u.Senha) === senha
  );
  
  if (!user) {
    return { success: false, error: 'Usuário ou senha incorretos' };
  }
  
  // Gerar token simples (ID do usuário + timestamp)
  const token = Utilities.base64Encode(user.ID + ':' + Date.now());
  
  return {
    success: true,
    message: 'Login realizado com sucesso!',
    data: {
      token: token,
      nome: user.Nome,
      usuario: user.Usuario,
      id: user.ID
    }
  };
}
