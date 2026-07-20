# WOW Aceleradora — Onboarding do Investidor (Investac VII)

Site de onboarding gamificado que conduz o novo investidor por uma jornada de
**9 etapas** — das boas-vindas até a entrada na comunidade — com barra de
progresso, badges de conquista e mensagens de incentivo.

## Como rodar

```bash
cd wow-onboarding
npm install
cp .env.example .env      # preencha os valores reais (veja abaixo)
npm start                 # abre em http://localhost:3000
```

Sem o `.env` configurado, o site roda em **modo demonstração**: a jornada
funciona de ponta a ponta e a assinatura usa uma tela simulada.

## Publicar no Vercel (link acessível de qualquer lugar)

O projeto já vem pronto para o Vercel (`vercel.json` + `api/index.js`).

**Opção 1 — pelo painel (mais fácil):**
1. Suba a pasta `wow-onboarding` para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New… → Project** → importe o repositório.
3. Framework Preset: **Other** (deixe os defaults). Clique **Deploy**.
4. Em ~1 min sai a URL pública, ex.: `https://wow-onboarding.vercel.app`.

**Opção 2 — pelo terminal (Vercel CLI):**
```bash
npm i -g vercel     # instala a CLI uma vez
cd wow-onboarding
vercel              # 1º deploy (faz login e cria o projeto) → gera URL de preview
vercel --prod       # publica em produção → URL final
```

**Variáveis de ambiente:** no painel do Vercel em **Settings → Environment
Variables**, adicione as chaves do `.env` que quiser usar (dados de PIX, links,
e — quando for ativar — as credenciais do Google). Sem elas, roda em modo
demonstração normalmente.

> ℹ️ No Vercel o disco é somente-leitura/efêmero, então o cadastro **não é
> gravado em arquivo** (o progresso do investidor fica no navegador). Para
> guardar os cadastros de forma permanente, conecte um banco (ex.: Vercel
> Postgres/KV) no lugar do arquivo `data/investidores.json`.

## A jornada (9 etapas)

1. **Boas-vindas** — apresentação da WOW e do fundo + download da apresentação (PDF).
2. **Escolha de cotas** — seletor de 1 a 4 cotas (R$ 80k cada), com valor total.
3. **Cadastro e dados** — e-mail, nome, nacionalidade, RG, CPF, endereço, cidade, estado, CEP (com validação de CPF e LGPD).
4. **Revisão e confirmação** — resumo do investimento + dados de aporte via PIX.
5. **Assinatura do contrato** — assinatura eletrônica via Google Workspace eSignature.
6. **Boas-vindas à comunidade** — tela de celebração.
7. **Perfil** — link para o formulário JotForm.
8. **Grupo do WhatsApp** — link para o grupo de investidores.
9. **Canais de comunicação** — explica que WhatsApp e e-mail são os canais oficiais.

O progresso é salvo no navegador (`localStorage`), então o investidor **retoma
de onde parou**. Os dados do cadastro são persistidos no backend em
`data/investidores.json` (troque por um banco de dados em produção).

## Onde inserir as chaves de API

Todas as credenciais ficam no arquivo **`.env`** (modelo em `.env.example`).

### 1. Aporte via PIX / transferência
Preencha os dados bancários do veículo Investac VII (SA):
`APORTE_PIX_CHAVE`, `APORTE_FAVORECIDO`, `APORTE_CNPJ`, `APORTE_BANCO`,
`APORTE_AGENCIA`, `APORTE_CONTA`. Eles aparecem na etapa de revisão.

### 2. Assinatura — Boletim de Subscrição + Google Workspace eSignature

O documento assinado é o **Boletim de Subscrição** (modelo enviado pela WOW).
Na etapa de assinatura, o site já mostra o boletim **preenchido** com os dados
do investidor. Os campos entre «...» do modelo são substituídos assim:

| Campo do modelo | Preenchido com |
|---|---|
| «Investidor», «Nacionalidade», «RG», «CPF», «Endereço», «Cidade», «Estado», «CEP», «Email» | dados do cadastro |
| «nominal» (nº de ações) | 80.000 × nº de cotas |
| «Valor_do_aporte» | valor total (80.000 × cotas), ex.: `160.000,00` |
| «valor_total_extenso» | valor total por extenso |
| «aportes» | valor de cada parcela (total ÷ 4) |
| «nominal__aportes» | valor da parcela por extenso |

> ✅ O modelo já foi ajustado: o valor total por extenso usa o campo próprio
> **«valor_total_extenso»** (separado de «nominal»), então cada marcador tem um
> único significado e o `replaceAllText` do Google funciona sem conflito. O
> arquivo modelo está em `contrato/` — suba esse `.docx` como Google Doc.

#### Passo a passo do eSignature do Google (o "botão de assinar")

O recurso nativo é o **eSignature do Google Workspace** (disponível nos planos
Business Standard/Plus, Enterprise e Workspace Individual). É ele que faz o
destinatário receber o documento com **um campo de assinatura para clicar**.

**A) Preparar o Google Doc modelo (uma vez):**
1. Suba o `Investac VII - Boletim de Subscrição` como **Google Doc** no Drive da WOW.
2. Deixe os marcadores «...» no texto (são eles que o sistema preenche).
3. Menu **Ferramentas → Assinatura eletrônica (eSignature)**. Se não aparecer,
   um admin precisa habilitar eSignature no Admin Console do Workspace.
4. No painel do eSignature, **arraste os campos** para o local da assinatura:
   *Assinatura*, *Nome*, *Data* — e atribua ao **Signatário 1** (o investidor).
   É exatamente esse campo que vira o "botão de assinar" para quem recebe.
5. Salve. Copie o **ID do documento** (da URL `/document/d/**ID**/edit`) para
   `GOOGLE_CONTRATO_TEMPLATE_DOC_ID`.

**B) Credenciais (uma vez):**
1. **Google Cloud Console** → novo projeto → **Service Account** → gere a chave JSON.
2. Ative as APIs **Google Drive** e **Google Docs**.
3. Compartilhe o Doc modelo **e** a pasta de destino do Drive com o e-mail da
   service account (permissão de Editor).
4. Preencha no `.env`: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`,
   `GOOGLE_CONTRATO_TEMPLATE_DOC_ID`, `GOOGLE_DRIVE_PASTA_ID`.

**C) Ativar no código:**
```bash
npm install googleapis
```
Em `server.js`, descomente o bloco `>>> IMPLEMENTAÇÃO REAL — Google Doc + eSignature <<<`.
O fluxo já está pronto: copiar o modelo → `replaceAllText` de cada «campo» →
iniciar o eSignature com o investidor como signatário → devolver o link. O
investidor abre, clica no campo e assina em um clique; a cópia assinada é
arquivada na pasta do Drive e enviada por e-mail.

> Observação técnica: a criação de solicitações de eSignature via API do Google
> ainda é limitada/beta. Se precisar de automação 100% ponta a ponta hoje,
> a alternativa é um provedor com API madura (DocuSign, Clicksign, D4Sign) —
> a estrutura do `server.js` aceita a troca trocando apenas o passo 3.

Enquanto o Google não estiver configurado, o endpoint entra automaticamente em
**modo demonstração**: mostra o boletim preenchido com um botão "Assinar
documento" (nenhum dado real é enviado).

### 3. Links da jornada
`JOTFORM_PERFIL_URL`, `WHATSAPP_GRUPO_URL` e `CONTATO_EMAIL` já vêm
preenchidos com os valores fornecidos, mas podem ser ajustados no `.env`.

## Identidade visual (Manual de Marca WOW)

Segue o manual oficial, em versão **fundo preto**:

- **Cor principal:** gradiente **azul → verde** (`#33c4de` → `#69c966`), aplicado em
  botões, ícones, barra de progresso e detalhes. Texto sobre o gradiente em grafite (`#0a0a0a`).
- **Base/Textos:** branco (`#ffffff`) sobre preto; grafite claro (`#8a8a8a`) para textos de apoio.
- **Tipografia:** **Visby CF** (fonte oficial, licenciada). Como ela não é gratuita, o
  projeto carrega **Poppins** como substituta fiel — a pilha CSS é
  `"Visby CF", "Poppins", ...`, então basta hospedar a Visby CF (via `@font-face`)
  para ativá-la sem outras mudanças. Títulos principais em **minúsculas + extra-bold**;
  textos em **medium**, seguindo o manual.
- **Elementos:** as elipses desfocadas no fundo remetem ao elemento "elipses/startups" do manual.

Para usar a Visby CF real, adicione no topo de `public/styles.css`:
```css
@font-face { font-family: "Visby CF"; src: url("/fonts/VisbyCF-ExtraBold.woff2") format("woff2"); font-weight: 800; }
@font-face { font-family: "Visby CF"; src: url("/fonts/VisbyCF-Medium.woff2") format("woff2"); font-weight: 500; }
```
e coloque os arquivos em `public/fonts/`.

## Segurança e LGPD
- O `.env` e `data/investidores.json` estão no `.gitignore` — **não** versione dados sensíveis.
- Dados são mascarados nos logs do servidor.
- Em produção: use HTTPS, um banco de dados com criptografia e restrinja o CORS.

## Estrutura
```
wow-onboarding/
├── server.js            # Express: API + serve o frontend
├── .env.example         # modelo de variáveis (chaves de API)
├── package.json
├── public/
│   ├── index.html       # shell + topbar/progresso
│   ├── styles.css       # identidade visual WOW
│   ├── app.js           # jornada de 9 etapas + gamificação
│   └── apresentacao-investac-vii.pdf
└── data/                # persistência (gerado em runtime)
```
