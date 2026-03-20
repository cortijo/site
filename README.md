# 📊 App de Gestão de Vendas

Aplicativo PWA para gestão de vendas de produtos com controle de estoque e contas a receber.

## ✨ Funcionalidades

- **Produtos**: CRUD completo com fotos (câmera ou galeria)
- **Vendas**: Registro de vendas com cálculo automático de valores
- **Contas a Receber**: Agendamento de pagamentos com controle de status
- **Dashboard**: Resumo financeiro com alertas de vencimentos

## 🚀 Como Configurar

### Passo 1: Criar a Google Sheet

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma **nova planilha em branco**
3. Dê o nome: "Gestão de Vendas"

### Passo 2: Configurar o Google Apps Script

1. Na planilha, vá em **Extensões > Apps Script**
2. Apague todo o código existente
3. Abra o arquivo `google-apps-script/Code.gs` deste projeto
4. **Copie todo o conteúdo** e cole no editor do Apps Script
5. Clique em **💾 Salvar** (Ctrl+S)

### Passo 3: Fazer o Deploy

1. No Apps Script, clique em **Implantar > Nova implantação**
2. Em "Tipo", selecione **App da Web**
3. Configure:
   - **Descrição**: "Gestão de Vendas API"
   - **Executar como**: "Eu" (sua conta)
   - **Quem tem acesso**: "Qualquer pessoa"
4. Clique em **Implantar**
5. **Copie a URL** que apareceu

### Passo 4: Configurar o App

1. Abra o arquivo `app.js`
2. Na linha 17, cole sua URL:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/SUA_URL_AQUI/exec';
   ```
3. Salve o arquivo

### Passo 5: Acessar no Celular

Você pode hospedar o app de várias formas:

#### Opção A: GitHub Pages (Recomendado - Gratuito)
1. Crie um repositório no [GitHub](https://github.com)
2. Faça upload de todos os arquivos (exceto a pasta `google-apps-script`)
3. Vá em Settings > Pages > Branch: main > Save
4. Acesse a URL gerada no celular

#### Opção B: Vercel/Netlify (Gratuito)
1. Conecte seu repositório GitHub
2. Deploy automático

#### Opção C: Servir Localmente (para testes)
```bash
# Com Python
python -m http.server 8000

# Com Node.js
npx serve .
```

### Passo 6: Compartilhar com sua Esposa

1. **Compartilhe a planilha**: Na Google Sheet, clique em "Compartilhar" e adicione o email dela
2. **Envie o link do app**: Envie a URL do GitHub Pages/Vercel por WhatsApp
3. Ela pode **instalar no celular**: Ao abrir no navegador, clicar nos 3 pontinhos > "Adicionar à tela inicial"

## 📱 Instalar como App

No celular (Chrome):
1. Abra a URL do app
2. Toque nos **3 pontinhos** (⋮)
3. Selecione **"Adicionar à tela inicial"**
4. Pronto! O app aparece como um ícone na tela do celular

## 🔧 Estrutura do Projeto

```
├── index.html          # Página principal
├── style.css           # Estilos (dark theme mobile)
├── app.js              # Lógica da aplicação
├── manifest.json       # Config PWA
├── sw.js               # Service Worker (cache offline)
├── README.md           # Este arquivo
└── google-apps-script/
    └── Code.gs         # Backend (colar no Apps Script)
```

## ⚠️ Notas Importantes

- **Fotos**: São comprimidas automaticamente para ~50KB e salvas na planilha como base64
- **Limites**: O Google Apps Script tem limite de 6 minutos por execução e ~50MB de dados na planilha
- **Backup**: A planilha serve como backup — você pode ver todos os dados diretamente nela
- **Sync**: Os dados são sincronizados em tempo real entre os dois celulares via a planilha compartilhada
