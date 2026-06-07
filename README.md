# 👁️ Alucinações Semânticas — Liminal Frames

> **Arquivo visual de imagens liminares e músicas sintonizadas.**  
> Uma experiência imersiva inspirada na estética Cyberpunk, menus táteis clássicos de *Deus Ex* e interfaces analógico-digitais retro-futuristas.

---

## 🌌 Visão Geral do Projeto

**Alucinações Semânticas** (ou **Liminal Frames**) é uma aplicação full-stack de curadoria estética e arquivamento multisensorial. O projeto integra:
1. **Curadoria Visual**: Interface de carrossel imersivo exibindo frames oníricos e liminares com controle refinado de visualização (incluindo renderização nativa de canvas e animações por coordenadas para sintonia visual).
2. **Sincronização Auditiva**: Sistema de audição e sintonia integrado ao painel de reprodução de faixas musicais, com efeitos realistas de distorção de tubo de raios catódicos (CRT), scanlines pulsantes e filtros estéticos em CSS avançado.
3. **Poderosíssimo Motor de Transição**: Efeitos dinâmicos de renderização 3D e rotações em perspectiva no hover de elementos-chave, emulando um HUD tátil integrado de alta imersão.

---

## 🛠️ Arquitetura e Tecnologias

O projeto utiliza uma arquitetura full-stack moderna e de altíssimo desempenho, dividida de forma clara entre frontend e backend no mesmo monorepo:

### **Frontend (SPA - Single Page Application)**
*   **Vite + React 19 (TypeScript)**: Inicialização rápida, tipagem estática robusta, renderização reativa para estados de carregamento dinâmicos e manipulação de canvas.
*   **Tailwind CSS (v4)**: Estilização utilitária otimizada, moderna e inline para manter as interfaces consistentes, responsivas e leves.
*   **Motion (Framer Motion)**: Utilizado para transições de rotas, carrosséis fluidos, feedbacks táteis de botões e efeitos de zoom in/out suaves em overlays (Lightbox).
*   **Lucide React**: Biblioteca de ícones moderna e leve, perfeitamente integrada ao design mecânico da interface.

### **Backend (Servidor customizado Express)**
*   **Express**: Servidor de rotas e proxy inteligente para APIs de imagens e feeds (contornando restrições de CORS e fornecendo caminhos unificados `/api/*`).
*   **Esbuild Bundling**: Configuração híbrida que compila e empacota o servidor TypeScript (`server.ts`) em um único arquivo de distribuição final `dist/server.cjs` no build de produção.
*   **Integração com Gemini API**: Utilização robusta e server-side do SDK `@google/genai` (nunca expondo chaves secretas ao navegador do usuário).

---

## 📂 Estrutura de Pastas Úteis

```bash
├── .env.example         # Molde de chaves e variáveis ambientais necessárias
├── .gitignore           # Ignora dependências (node_modules), logs e builds
├── index.html           # Ponto de entrada HTML servido pelo Vite
├── package.json         # Dependências, metadados e scripts de build do node
├── server.ts            # Ponto de entrada do backend do Express (modo desenvolvimento e produção)
├── tsconfig.json        # Configurações globais de verificação do TypeScript
├── vite.config.ts       # Configurações do Vite e integração com plugins (React & Tailwind)
├── src/                 # Código-fonte da aplicação front-end
│   ├── App.tsx          # Componente principal unificado contendo layouts, lógica de views e canvas
│   ├── index.css        # CSS Global contendo os keyframes da máscara CRT, efeitos de hover 3D e tipografia
│   └── ...              # Diretórios adicionais para subcomponentes e assets auxiliares
└── scripts/             # Scripts utilitários de scraping/importação de mídias (Spotify, Genius, etc.)
```

---

## 🚀 Como Executar Localmente

Siga o passo a passo resumido abaixo para clonar e rodar o projeto em sua máquina:

### 1. Pré-requisitos
*   **Node.js**: Recomenda-se a versão `18.x` ou superior.
*   **npm** ou **yarn**: Gerenciador de pacotes padrão do ecossistema.

### 2. Configurando as Variáveis de Ambiente
Duplique o molde de variáveis e configure seu arquivo local `.env`:
```bash
cp .env.example .env
```
Abra o `.env` gerado e defina os valores adequados (por exemplo, `LASTFM_API_KEY`, `LASTFM_USER` e sua `GEMINI_API_KEY`).

### 3. Instalando as Dependências
Execute na raiz do projeto:
```bash
npm install
```

### 4. Executando em Modo de Desenvolvimento
Inicie o servidor de desenvolvimento. O backend Express subirá integrado ao middleware do Vite:
```bash
npm run dev
```
O console mostrará o endereço local, geralmente disponível em:  
👉 **`http://localhost:3000`** (A porta está fixada na inicialização do servidor local).

---

## 📦 Build e Execução em Produção

O projeto está otimizado para build de produção de alto desempenho:

1.  **Gerar o Build**:
    ```bash
    npm run build
    ```
    Isso buildará a SPA construindo os arquivos estáticos e fará o bundle do código TypeScript do servidor usando `esbuild` gerando a saída limpa em `dist/server.cjs`.

2.  **Iniciar Servidor de Produção**:
    ```bash
    npm run start
    ```
    Este comando inicia o servidor Express consolidado que serve os arquivos estáticos compilados de forma instantânea e otimizada.

---

## 📤 Instruções para Enviar ao GitHub

Para publicar todo o código deste diretório em um novo repositório no seu GitHub, siga os seguintes comandos usando o Git instalado na sua máquina:

1.  **Iniciar um repositório Git local** (se já não estiver inicializado):
    ```bash
    git init
    ```

2.  **Adicionar todos os arquivos ao versionamento**:
    ```bash
    git add .
    ```
    *(Nota: O arquivo `.gitignore` configurado já garante que `node_modules/`, chaves ocultas em `.env` e pastas de build como `dist/` não sejam submetidas de forma insegura).*

3.  **Realizar o commit inicial das alterações**:
    ```bash
    git commit -m "feat: inicialização do projeto Liminal Frames com efeitos de movimentação 3D, responsividade mobile e otimização de proxy"
    ```

4.  **Criar uma nova branch principal** (boa prática padrão):
    ```bash
    git branch -M main
    ```

5.  **Vincular ao seu repositório remoto do GitHub**:
    *(O comando abaixo já está pré-configurado com seu usuário **Alisondarosaptxd** e o repositório sugerido **liminal-frames**)*:
    ```bash
    git remote add origin https://github.com/Alisondarosaptxd/liminal-frames.git
    ```

6.  **Enviar o código para o GitHub**:
    ```bash
    git push -u origin main
    ```

---

## 🧪 Qualidade de Código (Linter)

O projeto está configurado com regras restritas de tipagem estática e linter. Você pode rodar a verificação de sanidade localmente antes de commits ou submissões de Pull Requests:

```bash
npm run lint
```

---

## 🌌 Próxima Fase do Projeto (Sessão para Colaboradores)
Caso queira dar continuidade a customizações futuras de design cyberpunk ou implementar melhorias, atente-se às seguintes classes CSS personalizadas no arquivo `src/index.css`:
*   `#featured-song-cover`: Aplica uma transformação de perspectiva 3D realista no ângulo do eixo Y e inclinação em X (`skewX`) com filtros dinâmicos de cores.
*   `@keyframes scanline-pulse`: Efeito realista de feixes e distorções analógicas para a tela CRT na sintonia fina dos canais de mídia e displays visuais.
