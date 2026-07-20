// ==========================================================================
//  WOW Aceleradora — Onboarding de Investidores (Fundo Investac VII)
//  Servidor Express: serve o frontend e expõe a API de configuração,
//  cadastro do investidor, aporte (PIX) e assinatura (Google eSignature).
//
//  Onde inserir chaves de API: veja o arquivo .env.example e a seção
//  "signature" abaixo (procure por >>> INSIRA A INTEGRAÇÃO <<<).
// ==========================================================================

import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Em serverless (Vercel) o disco do projeto é somente-leitura; use /tmp (efêmero).
// Para persistência real em produção, troque por um banco de dados.
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'investidores.json');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------------------------------------------------------
//  Persistência simples em arquivo JSON (troque por um banco em produção).
// --------------------------------------------------------------------------
function lerBase() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function salvarBase(base) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(base, null, 2));
  } catch (e) {
    // Em serverless a gravação pode falhar/ser efêmera — não derruba a jornada.
    console.warn('[persist] gravação indisponível:', e.message);
  }
}

// Máscara de dados sensíveis nos logs (LGPD).
function mascarar(txt = '') {
  if (txt.length <= 4) return '****';
  return txt.slice(0, 2) + '***' + txt.slice(-2);
}

// --------------------------------------------------------------------------
//  GET /api/config — dados públicos do fundo e links da jornada.
// --------------------------------------------------------------------------
app.get('/api/config', (req, res) => {
  res.json({
    fundo: {
      nome: 'Investac VII',
      cotaValor: Number(process.env.COTA_VALOR || 80000),
      cotaMax: Number(process.env.COTA_MAX || 4),
      parcelasTexto:
        process.env.PARCELAS_TEXTO ||
        '4 parcelas semestrais de R$ 20.000 (set/25, mar/26, set/26, mar/27)',
    },
    aporte: {
      pixChave: process.env.APORTE_PIX_CHAVE || 'CHAVE_PIX_AQUI',
      pixTipo: process.env.APORTE_PIX_TIPO || 'CNPJ',
      favorecido: process.env.APORTE_FAVORECIDO || 'Investac VII S.A.',
      cnpj: process.env.APORTE_CNPJ || '00.000.000/0001-00',
      banco: process.env.APORTE_BANCO || '000 - Banco',
      agencia: process.env.APORTE_AGENCIA || '0000',
      conta: process.env.APORTE_CONTA || '00000-0',
    },
    links: {
      jotformPerfil:
        process.env.JOTFORM_PERFIL_URL || 'https://form.jotform.com/251054018334649',
      whatsappGrupo:
        process.env.WHATSAPP_GRUPO_URL ||
        'https://chat.whatsapp.com/LWLTkvHfXXpGxLitXogu9W',
      contatoEmail: process.env.CONTATO_EMAIL || 'contato@wow.ac',
    },
  });
});

// --------------------------------------------------------------------------
//  POST /api/investor — salva/atualiza o cadastro do investidor.
//  Retorna um id que identifica a jornada e é usado na assinatura.
// --------------------------------------------------------------------------
app.post('/api/investor', (req, res) => {
  const { id, cotas, dados } = req.body || {};
  if (!dados || !dados.email || !dados.nomeCompleto) {
    return res.status(400).json({ erro: 'Nome completo e e-mail são obrigatórios.' });
  }
  const base = lerBase();
  const investorId = id && base[id] ? id : crypto.randomUUID();
  base[investorId] = {
    id: investorId,
    cotas: Math.min(Math.max(Number(cotas) || 1, 1), Number(process.env.COTA_MAX || 4)),
    dados,
    atualizadoEm: new Date().toISOString(),
    contrato: base[investorId]?.contrato || null,
  };
  salvarBase(base);
  console.log(
    `[investor] salvo id=${investorId} email=${mascarar(dados.email)} cotas=${base[investorId].cotas}`
  );
  res.json({ id: investorId, cotas: base[investorId].cotas });
});

// ==========================================================================
//  ASSINATURA DO CONTRATO — Google Workspace eSignature (sobre Google Docs)
// ==========================================================================
//  Fluxo pretendido em produção:
//   1. O backend copia o Google Doc modelo (GOOGLE_CONTRATO_TEMPLATE_DOC_ID),
//      preenchendo nome/CPF/cotas do investidor via Google Docs API.
//   2. Inicia uma solicitação de eSignature do Google Workspace sobre a cópia
//      (Drive API — método files.create de tipo signature / eSignature).
//   3. Retorna a URL de assinatura para o investidor assinar.
//   4. O status é consultado em /api/signature/status.
//
//  >>> INSIRA A INTEGRAÇÃO <<<  As credenciais vêm do .env
//  (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, etc.). Instale
//  `googleapis` (npm i googleapis) e implemente as chamadas onde indicado.
//
//  Enquanto as credenciais não estão configuradas, o servidor opera em
//  MODO DEMONSTRAÇÃO: gera um link/documento simulado para permitir testar
//  a jornada de ponta a ponta sem expor dados reais.
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
//  Cálculo dos campos «...» do Boletim de Subscrição a partir das cotas.
//  Estes são os valores que substituem os MERGEFIELDS do Google Doc modelo.
// --------------------------------------------------------------------------
function numeroPorExtenso(n) {
  n = Math.round(n);
  if (n === 0) return 'zero';
  const uni = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dez = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const cem = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  const ate999 = x => { if (!x) return ''; if (x === 100) return 'cem';
    const p = [], c = Math.floor(x/100), r = x%100; if (c) p.push(cem[c]);
    if (r) { if (r < 20) p.push(uni[r]); else { const d = Math.floor(r/10), u = r%10; p.push(u ? dez[d]+' e '+uni[u] : dez[d]); } }
    return p.join(' e '); };
  const p = [], mi = Math.floor(n/1e6), mil = Math.floor((n%1e6)/1e3), r = n%1e3;
  if (mi) p.push(mi === 1 ? 'um milhão' : ate999(mi)+' milhões');
  if (mil) p.push(mil === 1 ? 'mil' : ate999(mil)+' mil');
  if (r) p.push(ate999(r));
  return p.join(' e ');
}
function computeBoletim(investidor) {
  const cotas = investidor.cotas || 1;
  const valorCota = Number(process.env.COTA_VALOR || 80000);
  const total = valorCota * cotas;      // valor total do compromisso
  const acoes = total;                  // preço de emissão R$ 1,00/ação
  const parcela = total / 4;            // 4 parcelas semestrais
  const d = investidor.dados || {};
  const fmt = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Mapa dos MERGEFIELDS «...» do modelo -> valor final (usado no replaceAllText).
  return {
    'Investidor': d.nomeCompleto || '',
    'Nacionalidade': d.nacionalidade || '',
    'RG': d.rg || '',
    'CPF': d.cpf || '',
    'Endereço': d.endereco || `${d.rua || ''}, ${d.numero || ''}${d.complemento ? ' - ' + d.complemento : ''}`,
    'Cidade': d.cidade || '',
    'Estado': d.estado || '',
    'CEP': d.cep || '',
    'Email': d.email || '',
    'nominal': acoes.toLocaleString('pt-BR'),          // nº de ações (ver nota no README)
    'Valor_do_aporte': fmt(total),                     // valor total (numérico)
    'valor_total_extenso': numeroPorExtenso(total) + ' reais',
    'aportes': 'R$ ' + fmt(parcela),                   // cada parcela (numérico)
    'nominal__aportes': numeroPorExtenso(parcela) + ' reais',
    'Data': new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

function googleConfigurado() {
  return Boolean(
    process.env.GOOGLE_PRIVATE_KEY &&
      !process.env.GOOGLE_PRIVATE_KEY.includes('COLE_AQUI') &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_CONTRATO_TEMPLATE_DOC_ID &&
      !process.env.GOOGLE_CONTRATO_TEMPLATE_DOC_ID.includes('ID_DO_GOOGLE_DOC')
  );
}

// POST /api/signature/create — inicia a solicitação de assinatura.
app.post('/api/signature/create', async (req, res) => {
  const { id } = req.body || {};
  const base = lerBase();
  const investidor = base[id];
  if (!investidor) return res.status(404).json({ erro: 'Investidor não encontrado.' });

  const campos = computeBoletim(investidor); // valores dos «...» do boletim

  try {
    if (googleConfigurado()) {
      // ================================================================
      //  >>> IMPLEMENTAÇÃO REAL — Google Doc + eSignature (produção) <<<
      //  Descomente após rodar `npm install googleapis`.
      //
      //  import { google } from 'googleapis';
      //  const auth = new google.auth.JWT({
      //    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      //    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      //    scopes: ['https://www.googleapis.com/auth/drive',
      //             'https://www.googleapis.com/auth/documents'],
      //  });
      //  const drive = google.drive({ version: 'v3', auth });
      //  const docs  = google.docs({ version: 'v1', auth });
      //
      //  // 1) Copia o Google Doc modelo (que contém os MERGEFIELDS «...»
      //  //    e os CAMPOS DE eSIGNATURE já inseridos — ver README).
      //  const copia = await drive.files.copy({
      //    fileId: process.env.GOOGLE_CONTRATO_TEMPLATE_DOC_ID,
      //    requestBody: { name: `Boletim Investac VII - ${investidor.dados.nomeCompleto}`,
      //                   parents: [process.env.GOOGLE_DRIVE_PASTA_ID] },
      //  });
      //  const docId = copia.data.id;
      //
      //  // 2) Substitui cada «campo» pelo valor calculado (replaceAllText).
      //  const requests = Object.entries(campos).map(([k, v]) => ({
      //    replaceAllText: { containsText: { text: `«${k}»`, matchCase: true }, replaceText: String(v) },
      //  }));
      //  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } });
      //
      //  // 3) Inicia a solicitação de eSignature do Google Workspace sobre a
      //  //    cópia, com o investidor como signatário. (Docs API — eSignature.)
      //  //    O signatário recebe o e-mail/link e assina em 1 clique no campo.
      //  //    Guarde docId + a URL/ID retornados em investidor.contrato.
      //
      //  investidor.contrato = { modo:'google', docId, signatureUrl: `https://docs.google.com/document/d/${docId}/edit`,
      //                          status:'pendente', criadoEm: new Date().toISOString() };
      //  salvarBase(base);
      //  return res.json({ ...investidor.contrato });
      // ================================================================
      throw new Error(
        'Integração Google eSignature ainda não ativada — descomente o bloco marcado em server.js após configurar o .env.'
      );
    }

    // ---------------- MODO DEMONSTRAÇÃO ----------------
    // Mostra o boletim preenchido (mesmos campos que iriam para o Google Doc).
    const contratoId = 'demo-' + crypto.randomUUID().slice(0, 8);
    investidor.contrato = {
      modo: 'demonstracao',
      contratoId,
      campos,
      signatureUrl: `/api/signature/demo/${id}`,
      status: 'pendente',
      criadoEm: new Date().toISOString(),
    };
    salvarBase(base);
    return res.json({ ...investidor.contrato });
  } catch (e) {
    console.error('[signature] erro:', e.message);
    return res.status(500).json({ erro: e.message });
  }
});

// Página de assinatura simulada (apenas modo demonstração).
// Renderiza o Boletim de Subscrição preenchido, como o Google Doc que será
// enviado em produção, com um botão único de assinatura (eSignature).
app.get('/api/signature/demo/:id', (req, res) => {
  const base = lerBase();
  const inv = base[req.params.id];
  const c = inv ? computeBoletim(inv) : {};
  const esc = s => String(s || '—').replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
  const parc = `R$ ${esc(c.aportes && c.aportes.replace('R$ ',''))} (${esc(c.nominal__aportes)})`;
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Boletim de Subscrição — Investac VII</title></head>
    <body style="font-family:system-ui;margin:0;background:#0b0b12;color:#fff;padding:24px">
      <div style="max-width:720px;margin:0 auto">
        <p style="color:#89e6c8;font-size:13px;text-align:center">Prévia do documento que o investidor recebe no Google Workspace eSignature (modo demonstração)</p>
        <div style="background:#f7f7f5;color:#1a1a1a;border-radius:14px;padding:32px 34px;font-family:Georgia,serif;line-height:1.6;font-size:14px">
          <h2 style="text-align:center;font-family:system-ui">BOLETIM DE SUBSCRIÇÃO</h2>
          <p><b>SUBSCRITOR:</b> ${esc(c.Investidor)}, ${esc(c.Nacionalidade)}, maior, portador da cédula de identidade RG nº ${esc(c.RG)}, inscrito no CPF/ME sob o nº ${esc(c.CPF)}, residente e domiciliado na ${esc(c['Endereço'])}, ${esc(c.Cidade)}, ${esc(c.Estado)}, CEP ${esc(c.CEP)}, titular do seguinte endereço eletrônico: ${esc(c.Email)}.</p>
          <p><b>NÚMERO DE AÇÕES SUBSCRITAS:</b> ${esc(c.nominal)} ações ordinárias, nominativas, sem valor nominal.</p>
          <p><b>PREÇO DE EMISSÃO DE CADA AÇÃO:</b> R$ 1,00 (um real).</p>
          <p><b>VALOR TOTAL:</b> R$ ${esc(c.Valor_do_aporte)} (${esc(c.valor_total_extenso)}).</p>
          <p><b>FORMA DE INTEGRALIZAÇÃO:</b> ${parc} em 30/09/2025 (ou na data de subscrição); ${parc} em 31/03/2026; ${parc} em 30/09/2026; e ${parc} em 31/03/2027.</p>
          <p>Porto Alegre/RS, ${esc(c.Data)}.</p>
          <div style="margin-top:28px;text-align:center">
            <div style="border:1.5px dashed #33a0b8;border-radius:8px;padding:10px 16px;display:inline-block;color:#0a7d95;font-style:italic">campo de assinatura eletrônica → ${esc(c.Investidor)}</div>
          </div>
        </div>
        <div style="text-align:center;margin:22px 0">
          <button onclick="window.opener&&window.opener.postMessage('assinado','*');window.close()"
            style="background:linear-gradient(120deg,#33c4de,#69c966);color:#0a0a0a;border:0;
            padding:15px 26px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer">
            ✍️ Assinar documento
          </button>
        </div>
      </div>
    </body></html>`);
});

// POST /api/signature/confirm — marca o contrato como assinado.
app.post('/api/signature/confirm', (req, res) => {
  const { id } = req.body || {};
  const base = lerBase();
  const investidor = base[id];
  if (!investidor || !investidor.contrato)
    return res.status(404).json({ erro: 'Contrato não encontrado.' });
  investidor.contrato.status = 'assinado';
  investidor.contrato.assinadoEm = new Date().toISOString();
  salvarBase(base);
  console.log(`[signature] contrato assinado id=${id}`);
  res.json({ status: 'assinado' });
});

// GET /api/signature/status/:id
app.get('/api/signature/status/:id', (req, res) => {
  const base = lerBase();
  const c = base[req.params.id]?.contrato;
  res.json({ status: c?.status || 'inexistente' });
});

// Fallback para SPA.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local: escuta a porta. No Vercel (serverless) o app é exportado como handler.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n  WOW Onboarding rodando em http://localhost:${PORT}`);
    console.log(
      `  Assinatura Google: ${googleConfigurado() ? 'CONFIGURADA' : 'MODO DEMONSTRAÇÃO (configure o .env)'}\n`
    );
  });
}

export default app;
