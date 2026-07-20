/* ==========================================================================
   WOW Aceleradora — Onboarding do Investidor (frontend)
   Jornada gamificada de 9 etapas com progresso persistente (localStorage).
   ========================================================================== */

const STORAGE_KEY = 'wow_onboarding_v1';
const TOTAL = 9;

// Configuração padrão (sobrescrita por /api/config quando o backend responde).
let CONFIG = {
  fundo: {
    nome: 'Investac VII',
    cotaValor: 80000,
    cotaMax: 4,
    parcelasTexto: '4 parcelas semestrais de R$ 20.000 (set/25, mar/26, set/26, mar/27)',
  },
  aporte: {
    pixChave: 'CHAVE_PIX_AQUI', pixTipo: 'CNPJ', favorecido: 'Investac VII S.A.',
    cnpj: '00.000.000/0001-00', banco: '000 - Banco', agencia: '0000', conta: '00000-0',
  },
  links: {
    jotformPerfil: 'https://form.jotform.com/251054018334649',
    whatsappGrupo: 'https://chat.whatsapp.com/LWLTkvHfXXpGxLitXogu9W',
    contatoEmail: 'contato@wow.ac',
  },
};

// ---- Estado ---------------------------------------------------------------
const defaultState = () => ({
  step: 0,
  reached: 0,
  cotas: 1,
  dados: { email:'', nomeCompleto:'', nacionalidade:'Brasileira', rg:'', cpf:'',
           rua:'', numero:'', complemento:'', cidade:'', estado:'', cep:'' },
  investorId: null,
  signed: false,
});
let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && typeof s.step === 'number') return { ...defaultState(), ...s };
  } catch {}
  return defaultState();
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

// ---- Utilidades -----------------------------------------------------------
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const brl = n => n.toLocaleString('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 });
const brlFull = n => n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
const milhar = n => n.toLocaleString('pt-BR');
const extenso = ['zero','uma','duas','três','quatro'];

// ---- Número por extenso (inteiros de reais) -------------------------------
function numeroPorExtenso(n) {
  n = Math.round(n);
  if (n === 0) return 'zero';
  const uni = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez',
    'onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dez = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const cem = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function ate999(x) {
    if (x === 0) return '';
    if (x === 100) return 'cem';
    let p = [];
    const c = Math.floor(x/100), resto = x%100;
    if (c) p.push(cem[c]);
    if (resto) {
      if (resto < 20) p.push(uni[resto]);
      else {
        const d = Math.floor(resto/10), u = resto%10;
        p.push(u ? dez[d] + ' e ' + uni[u] : dez[d]);
      }
    }
    return p.join(' e ');
  }
  const partes = [];
  const milhoes = Math.floor(n/1000000);
  const milhares = Math.floor((n%1000000)/1000);
  const resto = n%1000;
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : ate999(milhoes) + ' milhões');
  if (milhares) partes.push(milhares === 1 ? 'mil' : ate999(milhares) + ' mil');
  if (resto) partes.push(ate999(resto));
  return partes.join(' e ');
}

// ---- Datas -----------------------------------------------------------------
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function dataPorExtenso(d = new Date()) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// ==========================================================================
//  Boletim de Subscrição — preenchido com os dados do investidor
//  Campos «...» do modelo são substituídos pelos dados da etapa de cadastro
//  e pelos valores calculados a partir das cotas escolhidas.
// ==========================================================================
function dadosBoletim() {
  const d = state.dados;
  const cotas = state.cotas;
  const valorCota = CONFIG.fundo.cotaValor;      // R$ 80.000
  const total = valorCota * cotas;                // valor total do compromisso
  const acoes = total;                            // preço de emissão R$ 1,00/ação
  const parcela = total / 4;                      // 4 parcelas semestrais
  const endereco = d.rua ? `${d.rua}, ${d.numero}${d.complemento ? ' - ' + d.complemento : ''}` : (d.endereco || '');
  return {
    investidor: d.nomeCompleto || '', nacionalidade: d.nacionalidade || '',
    rg: d.rg || '', cpf: d.cpf || '', endereco, cidade: d.cidade || '',
    estado: d.estado || '', cep: d.cep || '', email: d.email || '',
    acoes, total, parcela,
    acoesTxt: milhar(acoes),
    totalTxt: brlFull(total), totalExtenso: numeroPorExtenso(total) + ' reais',
    parcelaTxt: brlFull(parcela), parcelaExtenso: numeroPorExtenso(parcela) + ' reais',
    data: dataPorExtenso(),
  };
}

function boletimHTML() {
  const b = dadosBoletim();
  const M = v => `<mark>${v || '—'}</mark>`; // destaca campos preenchidos
  return `
    <h3 class="doc-title">BOLETIM DE SUBSCRIÇÃO</h3>
    <p><strong>SUBSCRITOR:</strong> ${M(b.investidor)}, ${M(b.nacionalidade)}, maior, portador da cédula de
      identidade RG nº ${M(b.rg)}, inscrito no CPF/ME sob o nº ${M(b.cpf)}, residente e domiciliado na
      ${M(b.endereco)}, ${M(b.cidade)}, ${M(b.estado)}, CEP ${M(b.cep)}, titular do seguinte endereço
      eletrônico: ${M(b.email)}.</p>
    <p><strong>NÚMERO DE AÇÕES SUBSCRITAS:</strong> ${M(b.acoesTxt)} ações ordinárias, nominativas, sem valor nominal.</p>
    <p><strong>PREÇO DE EMISSÃO DE CADA AÇÃO:</strong> R$ 1,00 (um real).</p>
    <p><strong>VALOR TOTAL:</strong> R$ ${M(b.totalTxt)} (${M(b.totalExtenso)}).</p>
    <p><strong>FORMA DE INTEGRALIZAÇÃO:</strong> R$ ${M(b.parcelaTxt)} (${M(b.parcelaExtenso)}) serão integralizados
      até o dia 30 de setembro de 2025 ou na data de subscrição, caso a subscrição seja posterior a esta data;
      R$ ${M(b.parcelaTxt)} (${M(b.parcelaExtenso)}) serão integralizados até o dia 31 de março de 2026;
      R$ ${M(b.parcelaTxt)} (${M(b.parcelaExtenso)}) serão integralizados até o dia 30 de setembro de 2026; e
      R$ ${M(b.parcelaTxt)} (${M(b.parcelaExtenso)}) serão integralizados até o dia 31 de março de 2027.</p>
    <p><strong>MORA:</strong> A não realização, pelo subscritor, do valor subscrito nas condições previstas neste
      boletim fará com que o subscritor fique, de pleno direito, constituído em mora, para fins dos arts. 106 e 107
      da Lei das S.A., sujeitando-se ao pagamento do valor em atraso corrigido monetariamente de acordo com a
      variação do IGP-M/FGV, além de juros de mora de 1% (um por cento) ao mês, calculados pro rata die, e multa
      correspondente a 10% (dez por cento) do valor da prestação em atraso, devidamente atualizada.</p>
    <p>Declaro estar de acordo com as condições aprovadas na Assembleia Geral Extraordinária realizada em 13 de
      agosto de 2025 e expressas neste Boletim de Subscrição.</p>
    <p>Porto Alegre/RS, ${M(b.data)}.</p>
    <div class="doc-signs">
      <div class="doc-sign"><span class="sig-line" data-esign="subscritor">assinatura eletrônica</span>${M(b.investidor)}<small>Subscritor</small></div>
      <div class="doc-sign"><span class="sig-line">_______________________</span>Jaime Barreiro Wagner<small>Investac VII S.A.</small></div>
      <div class="doc-sign"><span class="sig-line">_______________________</span>André Ghignatti<small>Investac VII S.A.</small></div>
    </div>`;
}

const BADGES = [
  'Boas-vindas', 'Cotas', 'Cadastro', 'Revisão', 'Assinatura',
  'Comunidade', 'Perfil', 'Grupo', 'Concluído',
];

const CHEERS = [
  '', // etapa 0 não dispara
  '🎯 Ótima escolha! Sua participação está definida.',
  '📝 Dados registrados com segurança.',
  '✅ Tudo conferido. Você está quase lá!',
  '✍️ Contrato assinado — bem-vindo(a) a bordo!',
  '🎉 Você agora faz parte da comunidade WOW!',
  '🧩 Perfil enviado. Obrigado!',
  '💬 Você entrou no grupo dos investidores!',
];

// ==========================================================================
//  Renderização das etapas
// ==========================================================================
function render() {
  const stage = $('#stage');
  stage.innerHTML = STEPS[state.step].html();
  STEPS[state.step].init?.(stage);
  updateChrome();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateChrome() {
  const pct = Math.round((state.step / (TOTAL - 1)) * 100);
  $('#progressFill').style.width = pct + '%';
  $('#progressPct').textContent = pct + '%';
  $('#progressLabel').textContent = `Etapa ${state.step + 1} de ${TOTAL}`;
  renderBadges();
}

function renderBadges() {
  const wrap = $('#badges');
  wrap.innerHTML = BADGES.map((b, i) => {
    const done = i < state.reached || (i === state.reached && state.step > i);
    return `<span class="badge ${i < state.reached ? 'done' : ''}" data-i="${i}">
      <span class="dot"></span>${b}</span>`;
  }).join('');
}

function goNext() {
  if (state.step < TOTAL - 1) {
    const finishing = state.step; // etapa que acabou de concluir
    state.step++;
    state.reached = Math.max(state.reached, state.step);
    save();
    render();
    popBadge(finishing);
    if (CHEERS[state.step]) toast(CHEERS[state.step]);
  }
}
function goBack() { if (state.step > 0) { state.step--; save(); render(); } }

function popBadge(i) {
  const el = $(`.badge[data-i="${i}"]`);
  if (el) { el.classList.add('done', 'pop'); setTimeout(()=>el.classList.remove('pop'), 600); }
}

// ---- Toast ----------------------------------------------------------------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

// ==========================================================================
//  Definição das 9 etapas
// ==========================================================================
const STEPS = [
  // 0 — Boas-vindas -------------------------------------------------------
  {
    html: () => `
      <section class="card">
        <img class="hero-logo" src="logo-wow.svg" alt="WOW Aceleradora de Startups" />
        <span class="eyebrow">Bem-vindo(a) à WOW</span>
        <h1 class="step-title">você está a poucos passos de investir na nova geração de tech founders</h1>
        <p class="lead">A <strong>WOW</strong> é a maior aceleradora independente do Brasil, com mais de
          <strong>500 investidores</strong> anjo e um track record de <strong>178 startups aceleradas</strong>
          e <strong>14 exits</strong>. O fundo <span class="accent">Investac VII</span> reforça nossa aposta em
          equipes <strong>AI-first</strong> em estágio super early.</p>
        <div class="facts">
          <div class="fact"><div class="num">R$ 18M</div><div class="lbl">tamanho do fundo</div></div>
          <div class="fact"><div class="num">225</div><div class="lbl">cotas totais</div></div>
          <div class="fact"><div class="num">R$ 80k</div><div class="lbl">valor da cota</div></div>
        </div>
        <p class="lead" style="margin-bottom:0">Vamos guiar você por uma jornada simples: escolher suas cotas,
          preencher seus dados, assinar o contrato e entrar na comunidade. A cada etapa, uma conquista. 🚀</p>
        <a class="doc-link" href="apresentacao-investac-vii.pdf" target="_blank" rel="noopener">
          <span class="doc-ico">PDF</span>
          <span>Apresentação do fundo — Investac VII
            <small>Leia a tese, governança e retorno antes de avançar</small></span>
        </a>
        <div class="actions">
          <button class="btn btn-primary btn-wide" data-next>Começar minha jornada</button>
        </div>
      </section>`,
    init: (root) => { $('[data-next]', root).onclick = goNext; },
  },

  // 1 — Escolha de cotas ---------------------------------------------------
  {
    html: () => {
      const max = CONFIG.fundo.cotaMax, v = CONFIG.fundo.cotaValor;
      return `
      <section class="card">
        <span class="eyebrow">Etapa 2 · Sua participação</span>
        <h1 class="step-title">quantas cotas você deseja adquirir?</h1>
        <p class="lead">Cada cota vale <strong>${brl(v)}</strong>, integralizada em ${CONFIG.fundo.parcelasTexto}.
          Mínimo de 1 e máximo de ${max} cotas por investidor.</p>
        <div class="quota-picker">
          <button class="stepper-btn" id="minus" aria-label="Menos uma cota">−</button>
          <div class="quota-count" id="qCount">${state.cotas}</div>
          <button class="stepper-btn" id="plus" aria-label="Mais uma cota">+</button>
        </div>
        <div class="quota-word" id="qWord"></div>
        <div class="pips" id="pips"></div>
        <div class="quota-total">
          <div class="big" id="qTotal"></div>
          <div class="sub">valor total do seu compromisso de investimento</div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost" data-back>Voltar</button>
          <button class="btn btn-primary" data-next>Confirmar cotas</button>
        </div>
      </section>`;
    },
    init: (root) => {
      const max = CONFIG.fundo.cotaMax, v = CONFIG.fundo.cotaValor;
      const paint = () => {
        $('#qCount', root).textContent = state.cotas;
        $('#qWord', root).textContent = `${extenso[state.cotas]} cota${state.cotas>1?'s':''} selecionada${state.cotas>1?'s':''}`;
        $('#qTotal', root).textContent = brl(v * state.cotas);
        $('#pips', root).innerHTML = Array.from({length:max}, (_,i)=>
          `<span class="pip ${i<state.cotas?'on':''}"></span>`).join('');
        $('#minus', root).disabled = state.cotas <= 1;
        $('#plus', root).disabled = state.cotas >= max;
      };
      $('#minus', root).onclick = () => { if (state.cotas>1){state.cotas--; save(); paint();} };
      $('#plus', root).onclick  = () => { if (state.cotas<max){state.cotas++; save(); paint();} };
      $('[data-back]', root).onclick = goBack;
      $('[data-next]', root).onclick = goNext;
      paint();
    },
  },

  // 2 — Cadastro e dados ---------------------------------------------------
  {
    html: () => {
      const d = state.dados;
      const f = (id, label, val, ph, extra='') =>
        `<div class="field ${extra}"><label for="${id}">${label}</label>
          <input id="${id}" value="${val||''}" placeholder="${ph}" autocomplete="off"/>
          <span class="hint-err" data-err="${id}"></span></div>`;
      return `
      <section class="card">
        <span class="eyebrow">Etapa 3 · Seus dados</span>
        <h1 class="step-title">cadastro do investidor</h1>
        <p class="lead">Precisamos destes dados para emitir o contrato de investimento. Suas informações são
          tratadas com segurança e usadas apenas para esta finalidade (LGPD).</p>
        <div class="form-grid">
          ${f('nomeCompleto','Nome completo', d.nomeCompleto,'Seu nome como no documento','full')}
          ${f('email','E-mail', d.email,'voce@email.com')}
          ${f('nacionalidade','Nacionalidade', d.nacionalidade,'Brasileira')}
          ${f('rg','RG', d.rg,'00.000.000-0')}
          ${f('cpf','CPF', d.cpf,'000.000.000-00')}
          ${f('rua','Rua / Logradouro', d.rua,'Nome da rua ou avenida','full')}
          ${f('numero','Número', d.numero,'Ex.: 1234')}
          ${f('complemento','Complemento (opcional)', d.complemento,'Apto, bloco, sala')}
          ${f('cidade','Cidade', d.cidade,'Cidade')}
          ${f('estado','Estado', d.estado,'UF')}
          ${f('cep','CEP', d.cep,'00000-000')}
        </div>
        <label class="lgpd"><input type="checkbox" id="lgpd"/>
          <span>Autorizo o tratamento dos meus dados para fins de formalização do investimento no fundo Investac VII, conforme a LGPD.</span></label>
        <div class="actions">
          <button class="btn btn-ghost" data-back>Voltar</button>
          <button class="btn btn-primary" data-next>Revisar meu investimento</button>
        </div>
      </section>`;
    },
    init: (root) => {
      const ids = ['nomeCompleto','email','nacionalidade','rg','cpf','rua','numero','complemento','cidade','estado','cep'];
      ids.forEach(id => {
        const inp = $('#'+id, root);
        if (id === 'cpf') inp.oninput = () => { inp.value = maskCPF(inp.value); state.dados.cpf = inp.value; save(); };
        else if (id === 'cep') inp.oninput = () => { inp.value = maskCEP(inp.value); state.dados.cep = inp.value; save(); };
        else if (id === 'estado') inp.oninput = () => { inp.value = inp.value.toUpperCase().slice(0,2); state.dados.estado = inp.value; save(); };
        else inp.oninput = () => { state.dados[id] = inp.value; save(); };
      });
      $('[data-back]', root).onclick = goBack;
      $('[data-next]', root).onclick = () => {
        if (validarCadastro(root)) {
          const d = state.dados;
          d.endereco = `${d.rua}, ${d.numero}${d.complemento ? ' - ' + d.complemento : ''}`;
          save();
          goNext();
        }
      };
    },
  },

  // 3 — Revisão e confirmação ---------------------------------------------
  {
    html: () => {
      const v = CONFIG.fundo.cotaValor, total = v * state.cotas, d = state.dados;
      const row = (k, val) => `<div class="summary-row"><span class="k">${k}</span><span class="v">${val||'—'}</span></div>`;
      return `
      <section class="card">
        <span class="eyebrow">Etapa 4 · Revisão</span>
        <h1 class="step-title">confira antes de assinar</h1>
        <p class="lead">Revise as informações do seu investimento. Se algo estiver incorreto, volte e ajuste.</p>
        <div class="summary">
          ${row('Nome completo', d.nomeCompleto)}
          ${row('E-mail', d.email)}
          ${row('Nacionalidade', d.nacionalidade)}
          ${row('RG', d.rg)}
          ${row('CPF', d.cpf)}
          ${row('Endereço', d.rua ? `${d.rua}, ${d.numero}${d.complemento ? ' - ' + d.complemento : ''}` : d.endereco)}
          ${row('Cidade / Estado', d.cidade || d.estado ? `${d.cidade || '—'} / ${d.estado || '—'}` : '')}
          ${row('CEP', d.cep)}
          ${row('Cotas', `${state.cotas} × ${brl(v)}`)}
          <div class="summary-row summary-total"><span class="k">Total do compromisso</span><span class="v">${brl(total)}</span></div>
        </div>
        <p class="lead" style="margin:18px 0 0">Integralização: ${CONFIG.fundo.parcelasTexto}. Os dados para o aporte
          serão exibidos <strong>após a assinatura do contrato</strong>.</p>
        <div class="actions">
          <button class="btn btn-ghost" data-back>Ajustar dados</button>
          <button class="btn btn-primary" data-next>Ir para a assinatura</button>
        </div>
      </section>`;
    },
    init: (root) => {
      $('[data-back]', root).onclick = goBack;
      $('[data-next]', root).onclick = goNext;
    },
  },

  // 4 — Assinatura do contrato --------------------------------------------
  {
    html: () => `
      <section class="card">
        <span class="eyebrow">Etapa 5 · Contrato</span>
        <h1 class="step-title">assinatura eletrônica do contrato</h1>
        <p class="lead">Este é o seu <strong>Boletim de Subscrição</strong>, gerado automaticamente com os dados que
          você informou. Confira e assine com o recurso de <strong>eSignature do Google Workspace</strong>.</p>
        <div class="contract" id="contractBox">${boletimHTML()}</div>
        <div class="sign-status pend" id="signStatus">
          <span class="ico" id="signIco">…</span>
          <div><strong id="signTitle">Preparando seu contrato</strong>
            <div style="font-size:13px;color:var(--ink-mute)" id="signSub">Aguarde um instante</div></div>
        </div>
        <p class="note">🔒 Dados sensíveis são tratados com cuidado. A assinatura tem validade jurídica e uma
          cópia é arquivada no Drive da WOW e enviada ao seu e-mail.</p>
        <div class="actions">
          <button class="btn btn-ghost" data-back>Voltar</button>
          <button class="btn btn-primary" id="signBtn" disabled>Ler e assinar contrato</button>
          <button class="btn btn-primary" id="contBtn" style="display:none">Continuar</button>
        </div>
      </section>`,
    init: async (root) => {
      $('[data-back]', root).onclick = goBack;
      const setStatus = (mode, title, sub, ico) => {
        const s = $('#signStatus', root);
        s.className = 'sign-status ' + mode;
        $('#signTitle', root).textContent = title;
        $('#signSub', root).textContent = sub;
        $('#signIco', root).textContent = ico;
      };
      const markSigned = () => {
        state.signed = true; save();
        setStatus('ok','Contrato assinado ✓','Você já pode avançar','✓');
        $('#signBtn', root).style.display = 'none';
        const c = $('#contBtn', root); c.style.display=''; c.onclick = goNext;
      };

      if (state.signed) { markSigned(); return; }

      // 1) Salva o investidor no backend.
      let sig;
      try {
        const inv = await api('/api/investor', 'POST', { id: state.investorId, cotas: state.cotas, dados: state.dados });
        state.investorId = inv.id; save();
        // 2) Cria a solicitação de assinatura.
        sig = await api('/api/signature/create', 'POST', { id: state.investorId });
        setStatus('pend','Contrato pronto para assinatura','Clique em "Ler e assinar contrato"','✍');
      } catch (e) {
        // Sem backend (ex.: aberto como arquivo): permite avanço manual.
        setStatus('pend','Assine pelo link enviado','Não foi possível contatar o servidor — confirme manualmente após assinar','!');
      }

      const btn = $('#signBtn', root);
      btn.disabled = false;
      btn.onclick = () => {
        const url = sig?.signatureUrl || '#';
        const win = window.open(url, '_blank', 'noopener');
        setStatus('pend','Aguardando assinatura','Conclua a assinatura na aba aberta','⏳');
        // Confirmação automática (modo demonstração envia postMessage).
        const onMsg = async (ev) => {
          if (ev.data === 'assinado') {
            window.removeEventListener('message', onMsg);
            try { await api('/api/signature/confirm','POST',{ id: state.investorId }); } catch {}
            markSigned();
          }
        };
        window.addEventListener('message', onMsg);
        // Fallback manual, caso o postMessage não chegue.
        btn.textContent = 'Já assinei — continuar';
        btn.onclick = async () => { try { await api('/api/signature/confirm','POST',{ id: state.investorId }); } catch {} markSigned(); };
      };
    },
  },

  // 5 — Boas-vindas à comunidade (celebração) + dados de aporte -----------
  {
    html: () => {
      const a = CONFIG.aporte, total = CONFIG.fundo.cotaValor * state.cotas;
      const copy = (label, val, id) => `<div class="copyline"><span>${label}<br><code id="${id}">${val}</code></span>
        <button class="copy-btn" data-copy="${id}">Copiar</button></div>`;
      return `
      <section class="card celebrate">
        <div class="medal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <span class="eyebrow" style="justify-content:center">Etapa 6 · Bem-vindo(a)!</span>
        <h1 class="step-title">você agora faz parte da WOW! 🎉</h1>
        <p class="lead">Parabéns, <strong>${(state.dados.nomeCompleto||'').split(' ')[0] || 'investidor(a)'}</strong>!
          Seu compromisso de investimento no <span class="accent">Investac VII</span> está registrado e o contrato
          assinado. Você entra agora para uma comunidade de <strong>+500 investidores</strong> e centenas de founders.</p>

        <div class="pix-box" style="text-align:left">
          <h4>💸 Agora faça seu aporte (PIX / transferência)</h4>
          <p style="font-size:13px;color:var(--ink-mute);margin:0 0 8px">Aporte de <strong>${brl(total)}</strong>
            (${CONFIG.fundo.parcelasTexto}), feito diretamente ao veículo. Guarde o comprovante — nossa equipe confirma o recebimento.</p>
          ${copy('Chave PIX ('+a.pixTipo+')', a.pixChave, 'cpix')}
          ${copy('Favorecido', a.favorecido, 'cfav')}
          ${copy('CNPJ', a.cnpj, 'ccnpj')}
          ${copy('Banco / Agência / Conta', `${a.banco} · Ag ${a.agencia} · CC ${a.conta}`, 'cbank')}
        </div>

        <p class="lead">Faltam só dois passos rápidos para conectar você à comunidade.</p>
        <div class="actions">
          <button class="btn btn-primary btn-wide" data-next>Continuar</button>
        </div>
      </section>`;
    },
    init: (root) => {
      fireConfetti();
      root.querySelectorAll('[data-copy]').forEach(btn => {
        btn.onclick = () => {
          const txt = $('#'+btn.dataset.copy, root).textContent;
          navigator.clipboard?.writeText(txt).then(()=>{ btn.textContent='Copiado ✓'; setTimeout(()=>btn.textContent='Copiar',1500); });
        };
      });
      $('[data-next]', root).onclick = goNext;
    },
  },

  // 6 — Formulário de perfil ----------------------------------------------
  {
    html: () => `
      <section class="card">
        <span class="eyebrow">Etapa 7 · Seu perfil</span>
        <h1 class="step-title">complete seu perfil de investidor</h1>
        <p class="lead">Isso nos ajuda a conectar você às startups e mentorias mais alinhadas ao seu interesse.
          Preencha o formulário abaixo (abre em nova aba) e depois volte aqui para continuar.</p>
        <a class="doc-link" href="${CONFIG.links.jotformPerfil}" target="_blank" rel="noopener" id="formLink">
          <span class="doc-ico">↗</span>
          <span>Abrir formulário de perfil
            <small>Leva cerca de 3 minutos</small></span>
        </a>
        <div class="actions">
          <button class="btn btn-ghost" data-back>Voltar</button>
          <button class="btn btn-primary" id="contBtn" disabled>Já preenchi — continuar</button>
        </div>
      </section>`,
    init: (root) => {
      $('[data-back]', root).onclick = goBack;
      const cont = $('#contBtn', root);
      $('#formLink', root).onclick = () => { setTimeout(()=>{ cont.disabled = false; }, 800); };
      cont.onclick = goNext;
    },
  },

  // 7 — Grupo do WhatsApp --------------------------------------------------
  {
    html: () => `
      <section class="card">
        <span class="eyebrow">Etapa 8 · Comunidade</span>
        <h1 class="step-title">entre no grupo dos investidores</h1>
        <p class="lead">O grupo no WhatsApp é onde acontecem as conversas do dia a dia: novidades das startups,
          convites para o WOW Day e trocas entre investidores. Toque para entrar.</p>
        <a class="doc-link" href="${CONFIG.links.whatsappGrupo}" target="_blank" rel="noopener" id="waLink"
          style="border-color:rgba(76,224,122,.4)">
          <span class="doc-ico" style="background:linear-gradient(135deg,#25d366,#128c4b)">WA</span>
          <span>Entrar no grupo de investidores da WOW
            <small>Abre o WhatsApp em nova aba</small></span>
        </a>
        <div class="actions">
          <button class="btn btn-ghost" data-back>Voltar</button>
          <button class="btn btn-primary" id="contBtn" disabled>Entrei no grupo — continuar</button>
        </div>
      </section>`,
    init: (root) => {
      $('[data-back]', root).onclick = goBack;
      const cont = $('#contBtn', root);
      $('#waLink', root).onclick = () => { setTimeout(()=>{ cont.disabled = false; }, 800); };
      cont.onclick = goNext;
    },
  },

  // 8 — Canais de comunicação (final) -------------------------------------
  {
    html: () => `
      <section class="card celebrate">
        <div class="medal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M19 5l-2.8 2.8M7.8 16.2 5 19"/>
            <circle cx="12" cy="12" r="3.4"/></svg>
        </div>
        <h1 class="step-title">tudo pronto! bem-vindo(a) à WOW 🚀</h1>
        <p class="lead">Sua jornada de onboarding está completa. A partir de agora, é aqui que vamos nos comunicar
          com você:</p>
        <div class="channel-cards">
          <div class="channel">
            <div class="ch-ico ch-wa">WA</div>
            <h4>Grupo no WhatsApp</h4>
            <p>Canal principal do dia a dia: avisos rápidos, eventos e trocas entre investidores.</p>
          </div>
          <div class="channel">
            <div class="ch-ico ch-mail">@</div>
            <h4>E-mail</h4>
            <p>Comunicados oficiais, reports semestrais do portfólio e documentos. Fique de olho na caixa de entrada.</p>
          </div>
        </div>
        <p class="note">📌 Mantenha o WhatsApp e o e-mail (${state.dados.email||CONFIG.links.contatoEmail}) ativos — são
          nossos <strong>canais oficiais</strong> de comunicação. Dúvidas? Fale com a gente em ${CONFIG.links.contatoEmail}.</p>
        <div class="actions">
          <button class="btn btn-ghost" data-restart>Recomeçar</button>
          <a class="btn btn-primary" href="${CONFIG.links.whatsappGrupo}" target="_blank" rel="noopener">Abrir o grupo</a>
        </div>
      </section>`,
    init: (root) => {
      fireConfetti();
      $('[data-restart]', root).onclick = () => {
        if (confirm('Recomeçar a jornada? O progresso atual será apagado.')) {
          localStorage.removeItem(STORAGE_KEY); state = defaultState(); render();
        }
      };
    },
  },
];

// ==========================================================================
//  Validação e máscaras
// ==========================================================================
function maskCPF(v){ v=v.replace(/\D/g,'').slice(0,11); return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
function maskCEP(v){ v=v.replace(/\D/g,'').slice(0,8); return v.replace(/(\d{5})(\d)/,'$1-$2'); }

function validCPF(cpf){
  cpf = (cpf||'').replace(/\D/g,'');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let s=0; for(let i=0;i<9;i++) s+=+cpf[i]*(10-i);
  let d=(s*10)%11; if(d===10)d=0; if(d!==+cpf[9]) return false;
  s=0; for(let i=0;i<10;i++) s+=+cpf[i]*(11-i);
  d=(s*10)%11; if(d===10)d=0; return d===+cpf[10];
}

function validarCadastro(root){
  const d = state.dados;
  const rules = {
    nomeCompleto: v => v.trim().split(' ').length >= 2 || 'Informe nome e sobrenome',
    email: v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || 'E-mail inválido',
    nacionalidade: v => v.trim().length >= 3 || 'Campo obrigatório',
    rg: v => v.trim().length >= 5 || 'RG inválido',
    cpf: v => validCPF(v) || 'CPF inválido',
    rua: v => v.trim().length >= 3 || 'Informe a rua',
    numero: v => v.trim().length >= 1 || 'Informe o número',
    cidade: v => v.trim().length >= 2 || 'Informe a cidade',
    estado: v => v.trim().length === 2 || 'UF (2 letras)',
    cep: v => v.replace(/\D/g,'').length === 8 || 'CEP inválido',
  };
  let ok = true, first;
  for (const [id, rule] of Object.entries(rules)) {
    const res = rule(d[id] || '');
    const inp = $('#'+id, root), err = $(`[data-err="${id}"]`, root);
    if (res !== true) { ok=false; inp?.classList.add('invalid'); if(err) err.textContent = res; if(!first) first=inp; }
    else { inp?.classList.remove('invalid'); if(err) err.textContent=''; }
  }
  if (!$('#lgpd', root)?.checked) { ok=false; toast('⚠️ Autorize o uso dos dados (LGPD) para continuar.'); }
  if (!ok && first) first.focus();
  return ok;
}

// ==========================================================================
//  API helper
// ==========================================================================
async function api(path, method='GET', body){
  const r = await fetch(path, {
    method, headers: { 'Content-Type':'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

// ==========================================================================
//  Confete
// ==========================================================================
function fireConfetti(){
  const c = $('#confetti'); const ctx = c.getContext('2d');
  c.width = innerWidth; c.height = innerHeight;
  const colors = ['#33c4de','#69c966','#2ee6a6','#ffce6b','#ffffff'];
  const parts = Array.from({length:140}, () => ({
    x: Math.random()*c.width, y: -20 - Math.random()*c.height*0.5,
    r: 4+Math.random()*6, c: colors[(Math.random()*colors.length)|0],
    vy: 2+Math.random()*4, vx: -2+Math.random()*4, rot: Math.random()*6, vr: -0.2+Math.random()*0.4,
  }));
  let frames = 0;
  (function anim(){
    frames++; ctx.clearRect(0,0,c.width,c.height);
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c;
      ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6); ctx.restore(); });
    if (frames < 200) requestAnimationFrame(anim); else ctx.clearRect(0,0,c.width,c.height);
  })();
}

// ==========================================================================
//  Bootstrap
// ==========================================================================
(async function init(){
  try {
    const cfg = await api('/api/config');
    CONFIG = { ...CONFIG, ...cfg, fundo:{...CONFIG.fundo,...cfg.fundo}, aporte:{...CONFIG.aporte,...cfg.aporte}, links:{...CONFIG.links,...cfg.links} };
  } catch { /* usa CONFIG padrão (modo estático) */ }
  render();
})();
