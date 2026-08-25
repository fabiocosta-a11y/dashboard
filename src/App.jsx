import React, { useState, useEffect, useMemo, useCallback } from "react";

/*  ────────────────────────────────────────────────────────────
    COSTA CORP · CASH FLOW
    Fluxo de caixa por semanas (1–7 / 8–14 / 15–21 / 22–31)
    Persistência automática via window.storage
    ──────────────────────────────────────────────────────────── */

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEKS = [
  { key: "w1", label: "1 a 7",  from: 1,  to: 7  },
  { key: "w2", label: "8 a 14", from: 8,  to: 14 },
  { key: "w3", label: "15 a 21",from: 15, to: 21 },
  { key: "w4", label: "22 a 31",from: 22, to: 31 },
];

// Início padrão dos dados dos prints: Agosto / 26
const SEED_MES = 7, SEED_ANO = 26;

// Empresas (cada uma com dados 100% isolados). Costa Corp herda os dados dos prints; G2 nasce vazia.
const EMPRESAS = [
  { id: "costa", nome: "Costa Corp", bases: ["Costa Corp", "Pessoal (Fábio)"] },
  { id: "g2", nome: "G2", bases: ["G2", "Pessoal (Luana)"] },
];
const basesDe = (empresaId) => (EMPRESAS.find((e) => e.id === empresaId)?.bases || ["Costa Corp", "Pessoal (Fábio)"]);

// Categorias do Pipeline (leads)
const CATEGORIAS_LEAD = ["Site", "Negócio Local", "Infoproduto", "E-commerce"];
const storageKey = (empresaId) => `cashflow:data:${empresaId}`;

// ── SENHA (barreira simples, não é segurança forte) ──────────
// Para trocar a senha, altere o valor abaixo e republique.
const SENHA_APP = "ccg2dash#";
const LEMBRAR_DIAS = 30;

// índice absoluto de mês (ano*12+mes) para comparar linhas do tempo
const monthIndex = (mes, ano) => ano * 12 + mes;

// decide se um lançamento está ativo num dado mês/ano, conforme seu período
function ativoNoMes(item, mes, ano) {
  const mi0 = monthIndex(item.mesInicio ?? SEED_MES, item.anoInicio ?? SEED_ANO);
  const mi = monthIndex(mes, ano);
  if (mi < mi0) return false;                    // antes de começar, nunca
  const diff = mi - mi0;
  switch (item.periodo) {
    case "Pontual":     return diff === 0;       // só no mês de início
    case "Anual":       return diff % 12 === 0;  // mesmo mês, todo ano
    case "Trimestral":  return diff % 3 === 0;   // a cada 3 meses
    case "Semanal":
    case "Mensal":
    default:            return true;             // todo mês
  }
}

// ── SEED · dados reais dos prints ────────────────────────────
const SEED_RECEITAS = [
  ["Fresca Aromas","Pessoal (Fábio)","E-commerce","Pontual",1,375.01],
  ["Hexsolutions","Costa Corp","Negócio Local","Mensal",1,2100],
  ["Pitchucas (mensal)","Costa Corp","E-commerce","Mensal",3,985],
  ["Diviflex 1 de 4","Costa Corp","Negócio Local","Semanal",7,500],
  ["Botelho","Costa Corp","Negócio Local","Mensal",10,500],
  ["Núcleo","Costa Corp","Negócio Local","Mensal",10,400],
  ["Chalupe","Costa Corp","Negócio Local","Mensal",10,1302],
  ["Embella","Costa Corp","Negócio Local","Mensal",10,1200],
  ["Sashé Company","Costa Corp","E-commerce","Mensal",10,1575],
  ["Diviflex 2 de 4","Costa Corp","Negócio Local","Semanal",14,500],
  ["Jenny","Costa Corp","Negócio Local","Mensal",14,250],
  ["GAcomercial25 - 1 de 2","Costa Corp","E-commerce","Pontual",14,500],
  ["Pitchucas","Costa Corp","E-commerce","Pontual",17,750],
  ["Ancillotti","Costa Corp","Negócio Local","Mensal",20,500],
  ["Maranduba","Costa Corp","Negócio Local","Mensal",20,0],
  ["Dr. Itamar","Costa Corp","Negócio Local","Mensal",20,800],
  ["Ricardo Queiroz","Costa Corp","Negócio Local","Mensal",20,500],
  ["Diviflex 3 de 4","Costa Corp","Negócio Local","Semanal",21,500],
  ["Hydrodata","Costa Corp","Negócio Local","Mensal",23,625],
  ["Diviflex 4 de 4","Costa Corp","Negócio Local","Semanal",28,500],
].map((r, i) => ({
  id: "r" + i, tipo: "receita",
  desc: r[0], base: r[1], categoria: r[2], periodo: r[3], venc: r[4], valor: r[5],
  mesInicio: SEED_MES, anoInicio: SEED_ANO,
}));

// G2 nasce com uma CÓPIA das receitas da CC (ids próprios), sem despesas
const SEED_RECEITAS_G2 = SEED_RECEITAS.map((r, i) => ({ ...r, id: "g2r" + i }));

const SEED_DESPESAS = [
  ["Quebra-dedo 1 de 4","Pessoal (Fábio)","Extorsão","Semanal",5,1875,"Inegociável"],
  ["Quebra-dedo 2 de 4","Pessoal (Fábio)","Extorsão","Semanal",12,1875,"Inegociável"],
  ["Quebra-dedo 3 de 4","Pessoal (Fábio)","Extorsão","Semanal",19,1875,"Inegociável"],
  ["Quebra-dedo 4 de 4","Pessoal (Fábio)","Extorsão","Semanal",26,1875,"Inegociável"],
  ["Condomínio (2 de 2)","Pessoal (Fábio)","Residência","Mensal",10,1500,"Nice to have"],
  ["Condomínio (1 de 2)","Pessoal (Fábio)","Residência","Mensal",5,1500,"Nice to have"],
  ["Aluguel 4 de 4","Pessoal (Fábio)","Aluguel","Mensal",25,1500,"Nice to have"],
  ["Aluguel 3 de 4","Pessoal (Fábio)","Aluguel","Mensal",20,1500,"Nice to have"],
  ["Aluguel 2 de 4","Pessoal (Fábio)","Aluguel","Mensal",10,1500,"Nice to have"],
  ["Aluguel 1 de 4","Pessoal (Fábio)","Aluguel","Mensal",5,1500,"Nice to have"],
  ["Carro C3 - 3 de 3","Pessoal (Fábio)","Carros","Mensal",12,1000,"Inegociável"],
  ["Carro C3 - 2 de 3","Pessoal (Fábio)","Carros","Mensal",12,1000,"Inegociável"],
  ["Gás","Pessoal (Fábio)","Residência","Mensal",26,800,"Nice to have"],
  ["Campanhas - semana 4","Costa Corp","Marketing","Mensal",22,700,"Nice to have"],
  ["Campanhas - semana 3","Costa Corp","Marketing","Mensal",15,700,"Nice to have"],
  ["Campanhas - semana 1","Costa Corp","Marketing","Mensal",1,700,"Nice to have"],
  ["Campanhas - semana 2","Costa Corp","Marketing","Mensal",8,700,"Nice to have"],
  ["IPTU","Pessoal (Fábio)","Residência","Mensal",15,700,"Nice to have"],
  ["Convênio","Pessoal (Fábio)","Plano de Saúde","Mensal",5,700,"Nice to have"],
  ["Vivo - Celulares","Pessoal (Fábio)","Telefonia","Mensal",21,650,"Inegociável"],
  ["Microsoft Office (Agosto)","Pessoal (Fábio)","Ferramenta","Anual",26,599,"Nice to have"],
  ["Hostgator 1 (Agosto)","Costa Corp","Ferramenta","Anual",26,543.09,"Inegociável"],
  ["Claro - Internet de casa + Netflix","Pessoal (Fábio)","Internet","Mensal",20,520,"Inegociável"],
  ["Luz","Pessoal (Fábio)","Residência","Mensal",21,450,"Nice to have"],
  ["Mercado 3 de 4","Pessoal (Fábio)","Alimentação","Semanal",17,380,"Nice to have"],
  ["Mercado 2 de 4","Pessoal (Fábio)","Alimentação","Semanal",10,380,"Nice to have"],
  ["Mercado 1 de 4","Pessoal (Fábio)","Alimentação","Semanal",3,380,"Nice to have"],
  ["Contador (2 de 2)","Costa Corp","Contábil","Mensal",25,380,"Prioridade"],
  ["Contador (1 de 2)","Costa Corp","Contábil","Mensal",5,380,"Prioridade"],
  ["Mercado 4 de 4","Pessoal (Fábio)","Alimentação","Semanal",24,380,"Nice to have"],
  ["Carro C3 - 1 de 3","Pessoal (Fábio)","Carros","Mensal",12,366,"Inegociável"],
  ["Sem Parar","Pessoal (Fábio)","Carros","Mensal",29,300,"Prioridade"],
  ["Design - Thati","Costa Corp","Design","Mensal",20,300,"Prioridade"],
  ["Diviflex - Artes","Costa Corp","Design","Mensal",5,280,"Prioridade"],
  ["ClickUp","Costa Corp","Ferramenta","Mensal",18,265,"Prioridade"],
  ["Remédios","Pessoal (Fábio)","Remédio","Mensal",1,260,"Prioridade"],
  ["Feira 4 de 4","Pessoal (Fábio)","Alimentação","Semanal",27,200,"Prioridade"],
  ["Feira 3 de 4","Pessoal (Fábio)","Alimentação","Semanal",20,200,"Prioridade"],
  ["Feira 2 de 4","Pessoal (Fábio)","Alimentação","Semanal",13,200,"Prioridade"],
  ["Feira 1 de 4","Pessoal (Fábio)","Alimentação","Semanal",6,200,"Prioridade"],
  ["Google Workspace","Costa Corp","Email","Mensal",1,200,"Prioridade"],
  ["Memberkit","Costa Corp","Ferramenta","Mensal",23,197,"Prioridade"],
  ["Rafael (2 de 2)","Costa Corp","Folha","Mensal",30,150,"Prioridade"],
  ["Letícia (2 de 2)","Costa Corp","Folha","Mensal",30,150,"Prioridade"],
  ["Rafael (1 de 2)","Costa Corp","Folha","Mensal",15,150,"Prioridade"],
  ["Letícia (1 de 2)","Costa Corp","Folha","Mensal",15,150,"Prioridade"],
  ["Windsor","Costa Corp","Ferramenta","Mensal",12,130,"Prioridade"],
  ["Claude","Costa Corp","Ferramenta","Mensal",23,110,"Prioridade"],
  ["Calendly","Costa Corp","Ferramenta","Mensal",24,100,"Prioridade"],
  ["Z-API","Costa Corp","Ferramenta","Mensal",13,100,"Prioridade"],
  ["Vimeo","Pessoal (Fábio)","Ferramenta","Mensal",13,85,"Prioridade"],
  ["Domínios","Costa Corp","Ferramenta","Mensal",20,80,"Prioridade"],
  ["Apple iCloud","Pessoal (Fábio)","Ferramenta","Mensal",27,66.9,"Prioridade"],
  ["Make","Costa Corp","Ferramenta","Mensal",10,60,"Prioridade"],
  ["Vivo Easy","Costa Corp","Ferramenta","Mensal",15,55,"Prioridade"],
  ["YouTube Premium","Pessoal (Fábio)","Streaming","Mensal",6,55,"Prioridade"],
  ["(Apple) Instagram verificado","Pessoal (Fábio)","Ferramenta","Mensal",27,53.9,"Prioridade"],
  ["Disney +","Pessoal (Fábio)","Streaming","Mensal",9,50,"Prioridade"],
  ["Google One 2 TB","Pessoal (Fábio)","Ferramenta","Mensal",23,49.99,"Prioridade"],
  ["Max - HBO","Pessoal (Fábio)","Streaming","Trimestral",2,44.9,"Prioridade"],
  ["Spotify","Pessoal (Fábio)","Streaming","Mensal",1,40.9,"Prioridade"],
  ["Canva","Costa Corp","Ferramenta","Mensal",14,35,"Prioridade"],
  ["Apple TV+","Pessoal (Fábio)","Streaming","Mensal",3,29.9,"Prioridade"],
  ["Hospedagem - Gator Protect","Costa Corp","Ferramenta","Mensal",5,19.99,"Prioridade"],
  ["Amazon Prime","Pessoal (Fábio)","Streaming","Mensal",1,19.9,"Prioridade"],
  ["Amazon Prime Ad Free","Pessoal (Fábio)","Streaming","Mensal",26,10,"Prioridade"],
  ["Hostgator 2 (Outubro e Março)","Costa Corp","Ferramenta","Anual",19,0,"Prioridade"],
].map((r, i) => ({
  id: "d" + i, tipo: "despesa",
  desc: r[0], base: r[1], categoria: r[2], periodo: r[3], venc: r[4], valor: r[5], status: r[6],
  mesInicio: SEED_MES, anoInicio: SEED_ANO,
}));

const STATUS_ORDER = { "Inegociável": 0, "Prioridade": 1, "Nice to have": 2 };
const STATUS_COLOR = {
  "Inegociável": { bg: "rgba(244,63,94,.14)", fg: "#fb7185", dot: "#f43f5e" },
  "Prioridade":  { bg: "rgba(99,102,241,.14)", fg: "#a5b4fc", dot: "#6366f1" },
  "Nice to have":{ bg: "rgba(148,163,184,.12)", fg: "#cbd5e1", dot: "#94a3b8" },
};

const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlK = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const weekOf = (dia) => WEEKS.find((w) => dia >= w.from && dia <= w.to) || WEEKS[3];

// ── Porta de entrada: pede senha e lembra por N dias ─────────
export default function App() {
  const [ok, setOk] = useState(false);
  const [check, setCheck] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cashflow:auth");
      if (raw) {
        const { until } = JSON.parse(raw);
        if (until && Date.now() < until) setOk(true);
      }
    } catch (e) {}
    setCheck(true);
  }, []);

  const desbloquear = () => {
    const until = Date.now() + LEMBRAR_DIAS * 24 * 60 * 60 * 1000;
    try { localStorage.setItem("cashflow:auth", JSON.stringify({ until })); } catch (e) {}
    setOk(true);
  };

  if (!check) return null;
  if (!ok) return <Lock onOk={desbloquear} />;
  return <AppInner onLogout={() => { try { localStorage.removeItem("cashflow:auth"); } catch (e) {} setOk(false); }} />;
}

function Lock({ onOk }) {
  const [val, setVal] = useState("");
  const [erro, setErro] = useState(false);
  const tentar = () => {
    if (val === SENHA_APP) onOk();
    else { setErro(true); setVal(""); }
  };
  return (
    <div style={LK.page}>
      <div style={LK.card}>
        <div style={LK.brand}>CC&amp;G2</div>
        <div style={LK.sub}>Dashboard · acesso restrito</div>
        <input
          type="password" autoFocus placeholder="Senha" value={val}
          onChange={(e) => { setVal(e.target.value); setErro(false); }}
          onKeyDown={(e) => e.key === "Enter" && tentar()}
          style={{ ...LK.input, borderColor: erro ? "#f43f5e" : "rgba(129,140,248,.3)" }}
        />
        {erro && <div style={LK.erro}>Senha incorreta</div>}
        <button onClick={tentar} style={LK.btn}>Entrar</button>
      </div>
    </div>
  );
}

const LK = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(1200px 600px at 20% -10%, #1e2a52 0%, #0b1020 55%, #070a15 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif", padding: 20 },
  card: { width: "100%", maxWidth: 340, background: "rgba(16,23,48,.7)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 20, padding: 32, backdropFilter: "blur(14px)", textAlign: "center" },
  brand: { fontSize: 22, fontWeight: 800, letterSpacing: 2, background: "linear-gradient(90deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  sub: { fontSize: 13, color: "#94a3b8", marginTop: 4, marginBottom: 22 },
  input: { width: "100%", boxSizing: "border-box", background: "rgba(10,16,38,.7)", border: "1px solid rgba(129,140,248,.3)", color: "#e2e8f0", padding: "12px 14px", borderRadius: 12, fontSize: 15, outline: "none", textAlign: "center" },
  erro: { color: "#fb7185", fontSize: 12.5, marginTop: 8 },
  btn: { width: "100%", marginTop: 16, background: "linear-gradient(90deg,#6366f1,#a855f7)", color: "#fff", border: "none", padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: "pointer" },
};

function AppInner({ onLogout }) {
  const [empresa, setEmpresa] = useState("costa"); // empresa ativa
  const [receitas, setReceitas] = useState(SEED_RECEITAS);
  const [despesas, setDespesas] = useState(SEED_DESPESAS);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [mes, setMes] = useState(7); // Ago (0-index)
  const [ano, setAno] = useState(26);
  const [loaded, setLoaded] = useState(false);
  const [expand, setExpand] = useState({ entradas: false, saidas: false });
  const [tab, setTab] = useState("fluxo"); // fluxo | cadastro | fila
  const [novoTipo, setNovoTipo] = useState("receita");
  const [filaOrder, setFilaOrder] = useState([]); // ordem manual dos Nice to have (ids)
  const [pagos, setPagos] = useState({}); // { "id__mes_ano": true } efetuados por mês
  const [ajustes, setAjustes] = useState({}); // { "id__mes_ano": valor } override de valor por mês
  const [avulsos, setAvulsos] = useState([]); // lançamentos pontuais de um mês específico
  const [avForm, setAvForm] = useState({ open: false, tipo: "despesa", desc: "", valor: "", status: "Inegociável" });
  const [leads, setLeads] = useState([]); // Pipeline (único, junta as empresas)

  // ── migração: divide Quebra-dedo (7500 mensal) em 4 parcelas semanais ──
  const migrarQuebraDedo = (lista) => {
    const idx = lista.findIndex((d) => d.desc === "Quebra-dedo" && d.valor === 7500);
    if (idx === -1) return lista;
    const base = lista[idx];
    const parcelas = [
      { ...base, desc: "Quebra-dedo 1 de 4", periodo: "Semanal", venc: 5,  valor: 1875, id: "d_qd1" },
      { ...base, desc: "Quebra-dedo 2 de 4", periodo: "Semanal", venc: 12, valor: 1875, id: "d_qd2" },
      { ...base, desc: "Quebra-dedo 3 de 4", periodo: "Semanal", venc: 19, valor: 1875, id: "d_qd3" },
      { ...base, desc: "Quebra-dedo 4 de 4", periodo: "Semanal", venc: 26, valor: 1875, id: "d_qd4" },
    ];
    return [...lista.slice(0, idx), ...parcelas, ...lista.slice(idx + 1)];
  };

  // garante mesInicio/anoInicio em dados salvos antes desta versão
  const normalizarInicio = (lista) =>
    lista.map((x) => ({
      ...x,
      mesInicio: x.mesInicio ?? SEED_MES,
      anoInicio: x.anoInicio ?? SEED_ANO,
      base: x.base === "Pessoal" ? "Pessoal (Fábio)" : x.base,
    }));

  // ── persistência POR EMPRESA (dados isolados no localStorage) ─────────
  const aplicarDados = (d, empresaId) => {
    // G2 salva porém completamente vazia (entrou antes de existir o seed): trata como 1ª vez
    const g2VaziaSalva = empresaId === "g2" && d
      && (!d.receitas || d.receitas.length === 0)
      && (!d.despesas || d.despesas.length === 0)
      && (!d.avulsos || d.avulsos.length === 0);
    if (d && !g2VaziaSalva) {
      setReceitas(normalizarInicio(d.receitas || []));
      setDespesas(normalizarInicio(migrarQuebraDedo(d.despesas || [])));
      setSaldoAnterior(typeof d.saldoAnterior === "number" ? d.saldoAnterior : 0);
      setFilaOrder(Array.isArray(d.filaOrder) ? d.filaOrder : []);
      setPagos(d.pagos && typeof d.pagos === "object" ? d.pagos : {});
      setAjustes(d.ajustes && typeof d.ajustes === "object" ? d.ajustes : {});
      setAvulsos(Array.isArray(d.avulsos) ? d.avulsos : []);
    } else if (empresaId === "costa") {
      // Costa Corp sem dados salvos: parte dos dados dos prints
      setReceitas(SEED_RECEITAS); setDespesas(SEED_DESPESAS); setSaldoAnterior(0);
      setFilaOrder([]); setPagos({}); setAjustes({}); setAvulsos([]);
    } else if (empresaId === "g2") {
      // G2 na primeira vez: só as receitas (cópia da CC), sem despesas
      setReceitas(SEED_RECEITAS_G2); setDespesas([]); setSaldoAnterior(0);
      setFilaOrder([]); setPagos({}); setAjustes({}); setAvulsos([]);
    } else {
      // Outras empresas: começam vazias
      setReceitas([]); setDespesas([]); setSaldoAnterior(0);
      setFilaOrder([]); setPagos({}); setAjustes({}); setAvulsos([]);
    }
  };

  const coletarDados = () => ({ receitas, despesas, saldoAnterior, filaOrder, pagos, ajustes, avulsos });

  // carga inicial: descobre empresa ativa e carrega os dados dela
  useEffect(() => {
    let empAtiva = "costa";
    try {
      const e = localStorage.getItem("cashflow:empresaAtiva");
      if (e && EMPRESAS.some((x) => x.id === e)) empAtiva = e;
    } catch (e) {}
    // migração: chave única antiga vira os dados da Costa Corp
    try {
      const antigo = localStorage.getItem("cashflow:data");
      const jaTemCosta = localStorage.getItem(storageKey("costa"));
      if (antigo && !jaTemCosta) {
        localStorage.setItem(storageKey("costa"), antigo);
        localStorage.removeItem("cashflow:data");
      }
    } catch (e) {}
    setEmpresa(empAtiva);
    try {
      const raw = localStorage.getItem(storageKey(empAtiva));
      aplicarDados(raw ? JSON.parse(raw) : null, empAtiva);
    } catch (e) { aplicarDados(null, empAtiva); }
    // Pipeline (único, independente de empresa)
    try {
      const rawP = localStorage.getItem("cashflow:pipeline");
      if (rawP) { const p = JSON.parse(rawP); if (Array.isArray(p)) setLeads(p); }
    } catch (e) {}
    setLoaded(true);
  }, []);

  // salva o pipeline sempre que mudar
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("cashflow:pipeline", JSON.stringify(leads)); } catch (e) {}
  }, [leads, loaded]);

  // salva sempre que os dados da empresa ativa mudarem
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey(empresa), JSON.stringify(coletarDados()));
      localStorage.setItem("cashflow:empresaAtiva", empresa);
    } catch (e) { /* silencioso */ }
  }, [receitas, despesas, saldoAnterior, filaOrder, pagos, ajustes, avulsos, empresa, loaded]);

  // troca de empresa: salva a atual e carrega a nova
  const trocarEmpresa = (novaId) => {
    if (novaId === empresa) return;
    try { localStorage.setItem(storageKey(empresa), JSON.stringify(coletarDados())); } catch (e) {}
    try {
      const raw = localStorage.getItem(storageKey(novaId));
      aplicarDados(raw ? JSON.parse(raw) : null, novaId);
    } catch (e) { aplicarDados(null, novaId); }
    setEmpresa(novaId);
    setExpand({ entradas: false, saidas: false });
  };

  // ── lançamentos ATIVOS no mês/ano selecionado (recorrência) ──
  // aplica override de valor por mês (ajustes), ex: zerar só neste mês
  const aplicaAjuste = (item) => {
    const k = `${item.id}__${mes}_${ano}`;
    return k in ajustes ? { ...item, valor: ajustes[k], valorOriginal: item.valor, ajustado: true } : item;
  };
  const receitasMes = useMemo(() => {
    const base = receitas.filter((r) => ativoNoMes(r, mes, ano)).map(aplicaAjuste);
    const extra = avulsos.filter((x) => x.tipo === "receita" && x.mesAvulso === mes && x.anoAvulso === ano);
    return [...base, ...extra];
  }, [receitas, mes, ano, ajustes, avulsos]);
  const despesasMes = useMemo(() => {
    const base = despesas.filter((d) => ativoNoMes(d, mes, ano)).map(aplicaAjuste);
    const extra = avulsos.filter((x) => x.tipo === "despesa" && x.mesAvulso === mes && x.anoAvulso === ano);
    return [...base, ...extra];
  }, [despesas, mes, ano, ajustes, avulsos]);

  // ── 80/20 sobre as despesas do mês ────────────────────────
  const totalDesp = useMemo(() => despesasMes.reduce((s, d) => s + d.valor, 0), [despesasMes]);
  const despCalc = useMemo(() => {
    const sorted = [...despesasMes].sort((a, b) => b.valor - a.valor);
    let acc = 0;
    return sorted.map((d) => {
      const pct = totalDesp ? d.valor / totalDesp : 0;
      acc += pct;
      return { ...d, pct, pctAcum: acc, classe8020: acc <= 0.8 ? "80 dos 20" : "20 dos 80" };
    });
  }, [despesasMes, totalDesp]);
  const classeById = useMemo(() => {
    const m = {}; despCalc.forEach((d) => (m[d.id] = d.classe8020)); return m;
  }, [despCalc]);

  // ── agrega por semana ─────────────────────────────────────
  const byWeek = useMemo(() => {
    const acc = {};
    WEEKS.forEach((w) => (acc[w.key] = { entradas: 0, saidas: 0, itensR: [], itensD: [] }));
    receitasMes.forEach((r) => { const w = weekOf(r.venc).key; acc[w].entradas += r.valor; acc[w].itensR.push(r); });
    // Só Inegociável e Prioridade entram no fluxo. Nice to have fica de fora (só na fila).
    despesasMes.filter((d) => d.status !== "Nice to have").forEach((d) => {
      const w = weekOf(d.venc).key; acc[w].saidas += d.valor;
      acc[w].itensD.push({ ...d, classe8020: classeById[d.id] });
    });
    return acc;
  }, [receitasMes, despesasMes, classeById]);

  const totEntradasMes = useMemo(() => receitasMes.reduce((s, r) => s + r.valor, 0), [receitasMes]);
  // Saídas do fluxo = tudo menos Nice to have
  const totSaidasMes = useMemo(
    () => despesasMes.filter((d) => d.status !== "Nice to have").reduce((s, d) => s + d.valor, 0),
    [despesasMes]
  );

  // ── ENCADEAMENTO DE SALDO ENTRE MESES ─────────────────────
  // saldoAnterior = saldo inicial (âncora em Ago/26). O "saldo do mês anterior"
  // de qualquer mês é o saldo inicial + soma dos fluxos (entradas-saídas fixas)
  // de todos os meses entre a âncora e o mês selecionado.
  const ANCHOR = monthIndex(SEED_MES, SEED_ANO);

  const fluxoFixoDoMes = useCallback((m, a) => {
    const val = (item) => {
      const k = `${item.id}__${m}_${a}`;
      return k in ajustes ? ajustes[k] : item.valor;
    };
    let ent = 0, sai = 0;
    receitas.forEach((r) => { if (ativoNoMes(r, m, a)) ent += val(r); });
    despesas.forEach((d) => { if (ativoNoMes(d, m, a) && d.status !== "Nice to have") sai += val(d); });
    // lançamentos avulsos daquele mês
    avulsos.forEach((x) => {
      if (x.mesAvulso === m && x.anoAvulso === a) {
        if (x.tipo === "receita") ent += x.valor;
        else if (x.status !== "Nice to have") sai += x.valor;
      }
    });
    return ent - sai;
  }, [receitas, despesas, ajustes, avulsos]);

  const saldoMesAnterior = useMemo(() => {
    const alvo = monthIndex(mes, ano);
    let saldo = saldoAnterior; // ponto de partida na âncora
    // soma os fluxos de cada mês da âncora até o mês ANTERIOR ao selecionado
    for (let mi = ANCHOR; mi < alvo; mi++) {
      saldo += fluxoFixoDoMes(mi % 12, Math.floor(mi / 12));
    }
    // se o mês selecionado é anterior à âncora, apenas usa o saldo inicial
    return saldo;
  }, [mes, ano, saldoAnterior, fluxoFixoDoMes, ANCHOR]);

  // saldo acumulado semana a semana (parte do saldo do mês anterior encadeado)
  const fluxoSemanal = useMemo(() => {
    let running = saldoMesAnterior;
    return WEEKS.map((w) => {
      running += byWeek[w.key].entradas - byWeek[w.key].saidas;
      return { key: w.key, saldo: running };
    });
  }, [byWeek, saldoMesAnterior]);

  // ── FILA DE PRIORIZAÇÃO ───────────────────────────────────
  // caixa disponível = saldo do mês anterior (encadeado) + entradas do mês
  const caixaDisp = saldoMesAnterior + totEntradasMes;
  // Fixos = Inegociável + Prioridade (já entram no fluxo)
  const totalFixos = totSaidasMes;
  // Caixa que sobra depois de cobrir os fixos → é o que pode absorver Nice to have
  const caixaResidual = caixaDisp - totalFixos;

  // Fila = SOMENTE os Nice to have do mês, na ORDEM MANUAL escolhida pelo usuário
  const fila = useMemo(() => {
    const nth = despesasMes
      .filter((d) => d.status === "Nice to have")
      .map((d) => ({ ...d, classe8020: classeById[d.id] }));
    // ordena conforme filaOrder; itens ainda não ordenados vão pro fim (na ordem atual)
    const pos = (id) => {
      const i = filaOrder.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const ordered = [...nth].sort((a, b) => pos(a.id) - pos(b.id));
    let acc = 0;
    return ordered.map((d) => {
      acc += d.valor;
      return { ...d, acumulado: acc, cabe: acc <= caixaResidual };
    });
  }, [despesasMes, classeById, caixaResidual, filaOrder]);

  // mantém filaOrder sincronizado com os Nice to have existentes
  useEffect(() => {
    if (!loaded) return;
    const nthIds = despesas.filter((d) => d.status === "Nice to have").map((d) => d.id);
    const cleaned = filaOrder.filter((id) => nthIds.includes(id));
    const missing = nthIds.filter((id) => !cleaned.includes(id));
    const next = [...cleaned, ...missing];
    if (next.length !== filaOrder.length || next.some((id, i) => id !== filaOrder[i])) {
      setFilaOrder(next);
    }
  }, [despesas, loaded]); // eslint-disable-line

  const moveFila = (id, dir) => {
    setFilaOrder((prev) => {
      const arr = [...prev];
      const i = arr.indexOf(id);
      if (i === -1) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const ultimoQueCabe = useMemo(() => {
    let idx = -1; fila.forEach((f, i) => { if (f.cabe) idx = i; }); return idx;
  }, [fila]);
  const totalNiceToHave = useMemo(
    () => despesasMes.filter((d) => d.status === "Nice to have").reduce((s, d) => s + d.valor, 0),
    [despesasMes]
  );
  const sobra = caixaResidual - (ultimoQueCabe >= 0 ? fila[ultimoQueCabe].acumulado : 0);

  // Situação de cada despesa: no fluxo (fixos) / pode entrar (nice to have que cabe) / espera
  const situacaoById = useMemo(() => {
    const m = {};
    despesasMes.forEach((d) => {
      if (d.status !== "Nice to have") m[d.id] = "fluxo";
      else m[d.id] = "espera";
    });
    fila.forEach((f) => { if (f.cabe) m[f.id] = "cabe"; });
    return m;
  }, [despesasMes, fila]);

  // ── CRUD ──────────────────────────────────────────────────
  const emptyRow = { desc: "", base: basesDe(empresa)[0], categoria: "", periodo: "Mensal", venc: 1, valor: 0, status: "Prioridade", mesInicio: mes, anoInicio: ano };
  const [form, setForm] = useState(emptyRow);
  // mantém o mês/ano de início do formulário em sincronia com o mês visível
  useEffect(() => { setForm((f) => ({ ...f, mesInicio: mes, anoInicio: ano })); }, [mes, ano]);
  // ao trocar de empresa, ajusta a base padrão do formulário
  useEffect(() => { setForm((f) => ({ ...f, base: basesDe(empresa)[0] })); }, [empresa]);
  const addRow = () => {
    if (!form.desc.trim()) return;
    const item = { ...form, id: novoTipo[0] + Date.now(), tipo: novoTipo,
      venc: Number(form.venc) || 1, valor: Number(form.valor) || 0,
      mesInicio: Number(form.mesInicio), anoInicio: Number(form.anoInicio) };
    if (novoTipo === "receita") { delete item.status; setReceitas((p) => [...p, item]); }
    else setDespesas((p) => [...p, item]);
    setForm({ ...emptyRow, mesInicio: mes, anoInicio: ano });
  };
  const delRow = (tipo, id) => {
    if (tipo === "receita") setReceitas((p) => p.filter((x) => x.id !== id));
    else setDespesas((p) => p.filter((x) => x.id !== id));
  };
  const updateRow = (tipo, id, field, value) => {
    const numFields = ["venc", "valor", "mesInicio", "anoInicio"];
    const cast = numFields.includes(field) ? Number(value) || 0 : value;
    const apply = (p) => p.map((x) => (x.id === id ? { ...x, [field]: cast } : x));
    if (tipo === "receita") setReceitas(apply);
    else setDespesas(apply);
  };
  const resetSeed = () => {
    setFilaOrder([]); setPagos({}); setAjustes({}); setAvulsos([]); setSaldoAnterior(0);
    if (empresa === "costa") { setReceitas(SEED_RECEITAS); setDespesas(SEED_DESPESAS); }
    else if (empresa === "g2") { setReceitas(SEED_RECEITAS_G2); setDespesas([]); }
    else { setReceitas([]); setDespesas([]); }
  };

  // ── LANÇAMENTOS AVULSOS (pontuais de um mês) ──────────────
  const addAvulso = (tipo, desc, valor, status) => {
    if (!desc.trim()) return;
    const item = {
      id: "av" + Date.now(), tipo, avulso: true,
      desc: desc.trim(), valor: Number(valor) || 0,
      venc: 1, base: "Costa Corp", categoria: tipo === "despesa" ? "Avulso" : "Extra",
      periodo: "Pontual", mesAvulso: mes, anoAvulso: ano,
      ...(tipo === "despesa" ? { status: status || "Inegociável" } : {}),
    };
    setAvulsos((prev) => [...prev, item]);
  };
  const delAvulso = (id) => setAvulsos((prev) => prev.filter((x) => x.id !== id));

  // ── PIPELINE (leads / follow-ups quentes) ─────────────────
  const addLead = () => {
    setLeads((prev) => [...prev, {
      id: "lead" + Date.now(), empresa: "", nome: "", email: "", whatsapp: "",
      categoria: CATEGORIAS_LEAD[0], valor: 0,
    }]);
  };
  const updateLead = (id, field, value) => {
    const cast = field === "valor" ? (Number(value) || 0) : value;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: cast } : l)));
  };
  const delLead = (id) => setLeads((prev) => prev.filter((l) => l.id !== id));
  const moveLead = (id, dir) => {
    setLeads((prev) => {
      const arr = [...prev];
      const i = arr.findIndex((l) => l.id === id);
      if (i === -1) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };
  const totalPipeline = useMemo(() => leads.reduce((s, l) => s + (Number(l.valor) || 0), 0), [leads]);
  // limpa o whatsapp pra formato wa.me (só dígitos, com 55 se faltar)
  const waLink = (num) => {
    const d = String(num || "").replace(/\D/g, "");
    if (!d) return null;
    const full = d.length <= 11 ? "55" + d : d;
    return "https://wa.me/" + full;
  };

  // ── EFETUADO / PAGO (por lançamento e por mês) ────────────
  const payKey = (id, m = mes, a = ano) => `${id}__${m}_${a}`;
  const isPago = (id, m = mes, a = ano) => !!pagos[payKey(id, m, a)];
  const togglePago = (id, m = mes, a = ano) => {
    setPagos((prev) => {
      const k = payKey(id, m, a);
      const next = { ...prev };
      if (next[k]) delete next[k]; else next[k] = true;
      return next;
    });
  };

  // ── AJUSTE DE VALOR POR MÊS (ex: zerar só neste mês) ──────
  const zerarNoMes = (id, m = mes, a = ano) => {
    setAjustes((prev) => ({ ...prev, [payKey(id, m, a)]: 0 }));
  };
  const restaurarValorMes = (id, m = mes, a = ano) => {
    setAjustes((prev) => {
      const next = { ...prev }; delete next[payKey(id, m, a)]; return next;
    });
  };

  // ── UI ────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      <div style={S.shell}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.brand}>{(EMPRESAS.find((e) => e.id === empresa)?.nome || "").toUpperCase()}</div>
            <div style={S.subbrand}>Dashboard · Fluxo de Caixa</div>
          </div>
          <div style={S.monthPicker}>
            <select value={mes} onChange={(e) => setMes(+e.target.value)} style={S.select}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={ano} onChange={(e) => setAno(+e.target.value)} style={S.select}>
              {[25, 26, 27].map((a) => <option key={a} value={a}>/ {a}</option>)}
            </select>
            {onLogout && (
              <button onClick={onLogout} title="Bloquear (pedir senha)" style={S.lockBtn}>🔒</button>
            )}
          </div>
        </div>

        {/* Seletor de empresa */}
        <div style={S.empresaBar}>
          {EMPRESAS.map((e) => (
            <button key={e.id} onClick={() => trocarEmpresa(e.id)}
              style={{ ...S.empresaBtn, ...(empresa === e.id ? S.empresaBtnOn : {}) }}>
              {e.nome}
            </button>
          ))}
          <span style={S.empresaHint}>dados isolados por empresa</span>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {[["fluxo","Fluxo de Caixa"],["fila","Fila de Priorização"],["cadastro","Cadastro"],["pipeline","Pipeline"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...S.tab, ...(tab === k ? S.tabOn : {}) }}>{l}</button>
          ))}
        </div>

        {/* KPIs */}
        <div style={S.kpis}>
          <Kpi label="Entradas previstas" value={brl(totEntradasMes)} accent="#4ade80" />
          <Kpi label="Saídas previstas" value={brl(totSaidasMes)} accent="#fb7185" />
          {monthIndex(mes, ano) === ANCHOR ? (
            <Kpi label="Saldo inicial (mês âncora)" value={brl(saldoMesAnterior)} accent="#818cf8" editable
                 onEdit={(v) => setSaldoAnterior(Number(v) || 0)} raw={saldoAnterior} />
          ) : (
            <Kpi label="Saldo mês anterior (auto)" value={brl(saldoMesAnterior)}
                 accent={saldoMesAnterior >= 0 ? "#818cf8" : "#f43f5e"} />
          )}
          <Kpi label="Fluxo final do mês" value={brl(fluxoSemanal[3].saldo)}
               accent={fluxoSemanal[3].saldo >= 0 ? "#60a5fa" : "#f43f5e"} />
        </div>

        {/* ─── TAB: FLUXO ─── */}
        {tab === "fluxo" && (
          <div style={S.card}>
            <div style={S.gridHead}>
              <div style={{ ...S.gcell, ...S.glabel }}>{MONTHS[mes]} / {ano}</div>
              <div style={S.gcell}>Saldo Ant.</div>
              {WEEKS.map((w) => <div key={w.key} style={S.gcell}>{w.label}</div>)}
            </div>

            {/* Entradas */}
            <Row
              icon="+" title="Entradas" tone="#4ade80"
              open={expand.entradas}
              onToggle={() => setExpand((e) => ({ ...e, entradas: !e.entradas }))}
              cells={["", ...WEEKS.map((w) => byWeek[w.key].entradas)]}
            />
            {expand.entradas && WEEKS.some((w) => byWeek[w.key].itensR.length) && (
              <ExpandBlock weeks={WEEKS} byWeek={byWeek} field="itensR" isPago={isPago} togglePago={togglePago} onZerar={zerarNoMes} onRestaurar={restaurarValorMes} onDelAvulso={delAvulso} />
            )}

            {/* Saídas */}
            <Row
              icon="+" title="Saídas" tone="#fb7185"
              open={expand.saidas}
              onToggle={() => setExpand((e) => ({ ...e, saidas: !e.saidas }))}
              cells={["", ...WEEKS.map((w) => byWeek[w.key].saidas)]}
            />
            {expand.saidas && (
              <ExpandBlock weeks={WEEKS} byWeek={byWeek} field="itensD" showStatus isPago={isPago} togglePago={togglePago} onZerar={zerarNoMes} onRestaurar={restaurarValorMes} onDelAvulso={delAvulso} />
            )}

            {/* Fluxo de Caixa (saldo acumulado) */}
            <div style={{ ...S.row, ...S.rowFluxo }}>
              <div style={{ ...S.rowLabel }}>
                <span style={{ ...S.dot, background: "#60a5fa" }} />
                <b>Fluxo de Caixa</b>
              </div>
              <div style={S.gcellVal}><b>{brlK(saldoMesAnterior)}</b></div>
              {fluxoSemanal.map((f) => (
                <div key={f.key} style={S.gcellVal}>
                  <b style={{ color: f.saldo >= 0 ? "#93c5fd" : "#fb7185" }}>{brlK(f.saldo)}</b>
                </div>
              ))}
            </div>

            <div style={S.hint}>Clique em <b style={{color:"#e879f9"}}>＋ Entradas</b> ou <b style={{color:"#e879f9"}}>＋ Saídas</b> para expandir e ver os lançamentos daquela semana.</div>

            {/* Lançamento avulso (pontual do mês) */}
            <div style={S.avulsoBar}>
              {!avForm.open ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={S.avulsoBtnR} onClick={() => setAvForm({ open: true, tipo: "receita", desc: "", valor: "", status: "Inegociável" })}>+ Entrada avulsa</button>
                  <button style={S.avulsoBtnD} onClick={() => setAvForm({ open: true, tipo: "despesa", desc: "", valor: "", status: "Inegociável" })}>+ Saída avulsa</button>
                  <span style={{ fontSize: 11.5, color: "#64748b", alignSelf: "center" }}>lançamento pontual só em {MONTHS[mes]}/{ano}, não recorre</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ ...S.miniPill, background: avForm.tipo === "receita" ? "rgba(74,222,128,.14)" : "rgba(251,113,133,.14)", color: avForm.tipo === "receita" ? "#4ade80" : "#fb7185" }}>
                    {avForm.tipo === "receita" ? "Entrada" : "Saída"} avulsa · {MONTHS[mes]}/{ano}
                  </span>
                  <input autoFocus placeholder="Descrição" value={avForm.desc}
                    onChange={(e) => setAvForm({ ...avForm, desc: e.target.value })}
                    style={{ ...S.input, width: 200 }} />
                  <input type="number" step="0.01" placeholder="Valor" value={avForm.valor}
                    onChange={(e) => setAvForm({ ...avForm, valor: e.target.value })}
                    style={{ ...S.input, width: 120 }} />
                  {avForm.tipo === "despesa" && (
                    <select value={avForm.status} onChange={(e) => setAvForm({ ...avForm, status: e.target.value })} style={{ ...S.input, width: 140 }}>
                      <option>Inegociável</option><option>Prioridade</option><option>Nice to have</option>
                    </select>
                  )}
                  <button style={S.addBtnSmall}
                    onClick={() => { addAvulso(avForm.tipo, avForm.desc, avForm.valor, avForm.status); setAvForm({ ...avForm, open: false, desc: "", valor: "" }); }}>
                    Adicionar
                  </button>
                  <button style={S.cancelBtn} onClick={() => setAvForm({ ...avForm, open: false })}>Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: FILA ─── */}
        {tab === "fila" && (
          <div style={S.card}>
            <div style={S.filaTop}>
              <div>
                <div style={S.filaCaixaLabel}>Caixa residual (disponível − fixos que já entram)</div>
                <div style={{ ...S.filaCaixaVal, color: caixaResidual >= 0 ? "#4ade80" : "#f43f5e" }}>{brl(caixaResidual)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.filaCaixaLabel}>Total em espera (Nice to have)</div>
                <div style={S.filaCaixaVal}>{brl(totalNiceToHave)}</div>
              </div>
            </div>
            <div style={S.legend}>
              <Lg c="#4ade80" t="Cabe no caixa residual — pode entrar" />
              <Lg c="#94a3b8" t="Em espera — só entra com nova receita" />
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginBottom: 14, lineHeight: 1.5 }}>
              Os <b style={{ color: "#cbd5e1" }}>Nice to have</b> <b>não entram</b> no fluxo para não deixá-lo negativo.
              Use as setas <b style={{ color: "#a5b4fc" }}>↑ ↓</b> para definir livremente a ordem de entrada. O caixa residual é consumido de cima para baixo.
            </div>

            {fila.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Nenhum item em espera.</div>
            ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["","Ordem","Descrição","Base","Categoria","Venc","Valor","Status","Acumulado","Situação",""].map((h, i) => (
                      <th key={h + i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fila.map((f, i) => {
                    const cutoff = i === ultimoQueCabe;
                    return (
                      <React.Fragment key={f.id}>
                        <tr style={{ opacity: f.cabe ? 1 : 0.5 }}>
                          <td style={{ ...S.td, whiteSpace: "nowrap", paddingRight: 4 }}>
                            <button onClick={() => moveFila(f.id, "up")} disabled={i === 0}
                              style={{ ...S.arrow, opacity: i === 0 ? 0.25 : 1 }}>↑</button>
                            <button onClick={() => moveFila(f.id, "down")} disabled={i === fila.length - 1}
                              style={{ ...S.arrow, opacity: i === fila.length - 1 ? 0.25 : 1 }}>↓</button>
                          </td>
                          <td style={S.td}>{i + 1}º</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>
                            <EditCell value={f.desc} onSave={(v) => updateRow("despesa", f.id, "desc", v)} />
                          </td>
                          <td style={{ ...S.td, fontSize: 12 }}>
                            <EditCell value={f.base} type="select" options={basesDe(empresa)} muted
                              onSave={(v) => updateRow("despesa", f.id, "base", v)} />
                          </td>
                          <td style={{ ...S.td, fontSize: 12 }}>
                            <EditCell value={f.categoria} muted onSave={(v) => updateRow("despesa", f.id, "categoria", v)} />
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <EditCell value={f.venc} type="number" min={1} max={31} align="center"
                              onSave={(v) => updateRow("despesa", f.id, "venc", v)} />
                          </td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <EditCell value={f.valor} type="number" step="0.01" align="right" display={brl(f.valor)}
                              onSave={(v) => updateRow("despesa", f.id, "valor", v)} />
                          </td>
                          <td style={S.td}>
                            <EditCell value={f.status} type="select" options={["Inegociável","Prioridade","Nice to have"]}
                              render={(v) => <span style={{ ...S.miniPill, background: STATUS_COLOR[v].bg, color: STATUS_COLOR[v].fg }}>{v}</span>}
                              onSave={(v) => updateRow("despesa", f.id, "status", v)} />
                          </td>
                          <td style={{ ...S.td, textAlign: "right", color: "#93c5fd" }}>{brl(f.acumulado)}</td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            {f.cabe
                              ? <span style={{ ...S.pill, background: "rgba(74,222,128,.14)", color: "#4ade80" }}>pode entrar</span>
                              : <span style={{ ...S.pill, background: "rgba(148,163,184,.12)", color: "#cbd5e1" }}>em espera</span>}
                          </td>
                          <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                            <PromoverBtn onPromover={(novoStatus) => updateRow("despesa", f.id, "status", novoStatus)} />
                            <button onClick={() => delRow("despesa", f.id)} style={{ ...S.del, marginLeft: 6 }}>×</button>
                          </td>
                        </tr>
                        {cutoff && (
                          <tr><td colSpan={11} style={S.cutoff}>
                            ▲ até aqui o caixa residual cobre — abaixo, só entra com nova receita
                          </td></tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ─── TAB: CADASTRO ─── */}
        {tab === "cadastro" && (
          <div style={S.card}>
            <div style={S.formTypeRow}>
              {["receita","despesa"].map((t) => (
                <button key={t} onClick={() => { setNovoTipo(t); setForm(emptyRow); }}
                  style={{ ...S.typeBtn, ...(novoTipo === t ? S.typeBtnOn : {}) }}>
                  {t === "receita" ? "＋ Receita" : "＋ Despesa"}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12.5, color: "#94a3b8", marginBottom: 14, lineHeight: 1.5, background: "rgba(99,102,241,.08)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(129,140,248,.15)" }}>
              <b style={{ color: "#c084fc" }}>Recorrência automática:</b> defina o <b>Início (mês/ano)</b> de cada lançamento.
              A partir dele: <b>Mensal/Semanal</b> repetem todo mês · <b>Trimestral</b> a cada 3 meses · <b>Anual</b> no mesmo mês todo ano · <b>Pontual</b> aparece só no mês de início.
              Os meses se encadeiam sozinhos e o saldo passa de um para o outro.
            </div>

            <div style={S.form}>
              <F label="Descrição" wide>
                <input style={S.input} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Nome do lançamento" />
              </F>
              <F label="Base">
                <select style={S.input} value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })}>
                  {basesDe(empresa).map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </F>
              <F label="Categoria">
                <input style={S.input} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Ferramenta" />
              </F>
              <F label="Período">
                <select style={S.input} value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })}>
                  <option>Mensal</option><option>Semanal</option><option>Pontual</option><option>Anual</option><option>Trimestral</option>
                </select>
              </F>
              <F label="Venc. (dia)">
                <input type="number" min={1} max={31} inputMode="numeric" maxLength={2} style={S.input} value={form.venc}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); setForm({ ...form, venc: v }); }}
                  onBlur={(e) => { let n = parseInt(e.target.value, 10); if (isNaN(n)) n = 1; if (n < 1) n = 1; if (n > 31) n = 31; setForm({ ...form, venc: n }); }} />
              </F>
              <F label="Início (mês)">
                <select style={S.input} value={form.mesInicio} onChange={(e) => setForm({ ...form, mesInicio: +e.target.value })}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </F>
              <F label="Início (ano)">
                <select style={S.input} value={form.anoInicio} onChange={(e) => setForm({ ...form, anoInicio: +e.target.value })}>
                  {[25, 26, 27, 28].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </F>
              <F label="Valor (R$)">
                <input type="number" step="0.01" style={S.input} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </F>
              {novoTipo === "despesa" && (
                <F label="Status">
                  <select style={S.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Inegociável</option><option>Prioridade</option><option>Nice to have</option>
                  </select>
                </F>
              )}
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={addRow} style={S.addBtn}>Adicionar</button>
              </div>
            </div>

            {/* Listas */}
            <div style={S.listWrap}>
              <ListTable title={`Receitas (${receitas.length})`} rows={receitas} tipo="receita" onDel={(id) => delRow("receita", id)} onEdit={updateRow} isPago={isPago} togglePago={togglePago} />
              <ListTable title={`Despesas (${despesas.length})`} rows={despCalc.map((d) => ({ ...d, situacao: situacaoById[d.id] }))} tipo="despesa" onDel={(id) => delRow("despesa", id)} onEdit={updateRow} showStatus isPago={isPago} togglePago={togglePago} />
            </div>

            <button onClick={resetSeed} style={S.reset}>↺ Restaurar dados originais dos prints</button>
          </div>
        )}

        {/* ─── TAB: PIPELINE ─── */}
        {tab === "pipeline" && (
          <div style={S.card}>
            <div style={S.pipeTop}>
              <div>
                <div style={S.pipeTitle}>Pipeline · follow-ups quentes</div>
                <div style={S.pipeSub}>Leads com chance real de fechar · único (Costa Corp + G2)</div>
              </div>
              <div style={S.pipeTotalBox}>
                <div style={S.pipeTotalLabel}>TOTAL</div>
                <div style={S.pipeTotalVal}>{brl(totalPipeline)}</div>
              </div>
            </div>

            <button onClick={addLead} style={S.addBtnSmall}>+ Novo lead</button>

            {leads.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Nenhum lead ainda. Clique em "+ Novo lead".</div>
            ) : (
            <div style={{ overflowX: "auto", marginTop: 14 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["","Empresa","Nome","Email","WhatsApp","Categoria","Valor",""].map((h, i) => (
                      <th key={h + i} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => (
                    <tr key={l.id}>
                      <td style={{ ...S.td, whiteSpace: "nowrap", paddingRight: 4 }}>
                        <button onClick={() => moveLead(l.id, "up")} disabled={i === 0}
                          style={{ ...S.arrow, opacity: i === 0 ? 0.25 : 1 }}>↑</button>
                        <button onClick={() => moveLead(l.id, "down")} disabled={i === leads.length - 1}
                          style={{ ...S.arrow, opacity: i === leads.length - 1 ? 0.25 : 1 }}>↓</button>
                      </td>
                      <td style={{ ...S.td, fontWeight: 600 }}>
                        <EditCell value={l.empresa} onSave={(v) => updateLead(l.id, "empresa", v)} />
                      </td>
                      <td style={S.td}>
                        <EditCell value={l.nome} onSave={(v) => updateLead(l.id, "nome", v)} />
                      </td>
                      <td style={{ ...S.td, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <EditCell value={l.email} muted onSave={(v) => updateLead(l.id, "email", v)} />
                          {l.email && <a href={`mailto:${l.email}`} title="Enviar email" style={S.linkBtn}>✉</a>}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <EditCell value={l.whatsapp} muted onSave={(v) => updateLead(l.id, "whatsapp", v)} />
                          {waLink(l.whatsapp) && <a href={waLink(l.whatsapp)} target="_blank" rel="noreferrer" title="Abrir WhatsApp" style={{ ...S.linkBtn, color: "#4ade80", borderColor: "rgba(74,222,128,.4)" }}>WA</a>}
                        </div>
                      </td>
                      <td style={S.td}>
                        <EditCell value={l.categoria} type="select" options={CATEGORIAS_LEAD}
                          render={(v) => <span style={{ fontSize: 12, color: "#a5b4fc" }}>{v}</span>}
                          onSave={(v) => updateLead(l.id, "categoria", v)} />
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <EditCell value={l.valor} type="number" step="0.01" align="right" display={brl(l.valor)}
                          onSave={(v) => updateLead(l.id, "valor", v)} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button onClick={() => delLead(l.id)} style={S.del}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        <div style={S.footer}>Dados salvos automaticamente neste app · {EMPRESAS.find((e) => e.id === empresa)?.nome} · {MONTHS[mes]}/{ano}</div>
      </div>
    </div>
  );
}

/* ── Componentes ── */
function Kpi({ label, value, accent, editable, onEdit, raw }) {
  const [edit, setEdit] = useState(false);
  return (
    <div style={S.kpi}>
      <div style={{ ...S.kpiBar, background: accent }} />
      <div style={S.kpiLabel}>{label}</div>
      {editable && edit ? (
        <input autoFocus type="number" defaultValue={raw} onBlur={(e) => { onEdit(e.target.value); setEdit(false); }}
          onKeyDown={(e) => e.key === "Enter" && (onEdit(e.target.value), setEdit(false))}
          style={{ ...S.input, marginTop: 4 }} />
      ) : (
        <div style={{ ...S.kpiVal, color: accent, cursor: editable ? "pointer" : "default" }}
          onClick={() => editable && setEdit(true)} title={editable ? "clique para editar" : ""}>{value}</div>
      )}
    </div>
  );
}

function Row({ icon, title, tone, cells, open, onToggle }) {
  return (
    <div style={S.row} onClick={onToggle}>
      <div style={S.rowLabel}>
        <span style={{ ...S.plus, borderColor: tone, transform: open ? "rotate(45deg)" : "none" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: "block" }}>
            <rect x="5.1" y="1.5" width="1.8" height="9" rx="0.9" fill={tone} />
            <rect x="1.5" y="5.1" width="9" height="1.8" rx="0.9" fill={tone} />
          </svg>
        </span>
        <b>{title}</b>
      </div>
      {cells.map((c, i) => (
        <div key={i} style={S.gcellVal}>{c === "" ? "" : brlK(c)}</div>
      ))}
    </div>
  );
}

function ExpandBlock({ weeks, byWeek, field, showStatus, isPago, togglePago, onZerar, onRestaurar, onDelAvulso }) {
  const max = Math.max(...weeks.map((w) => byWeek[w.key][field].length));
  return (
    <div style={S.expand}>
      {Array.from({ length: max }).map((_, ri) => (
        <div key={ri} style={S.expandRow}>
          <div style={S.expandLabel} />
          <div style={S.gcell} />
          {weeks.map((w) => {
            const it = byWeek[w.key][field][ri];
            const pago = it && isPago ? isPago(it.id) : false;
            const ajustado = it && it.ajustado;
            const avulso = it && it.avulso;
            return (
              <div key={w.key} style={S.expandCell}>
                {it ? (
                  <div style={{ ...S.expItem, opacity: pago ? 0.6 : 1, border: pago ? "1px solid rgba(74,222,128,.4)" : avulso ? "1px dashed rgba(232,121,249,.5)" : ajustado ? "1px solid rgba(251,191,36,.4)" : "1px solid transparent" }}>
                    <span style={S.expDesc}>
                      {avulso && <span style={S.avTag}>avulso</span>}{it.desc}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...S.expVal, textDecoration: pago ? "line-through" : "none", color: ajustado ? "#fbbf24" : undefined }}>{brlK(it.valor)}</span>
                      {togglePago && (
                        <button onClick={() => togglePago(it.id)} title={pago ? "Efetuado — clique para desmarcar" : "Marcar como efetuado"}
                          style={{ ...S.check, ...(pago ? S.checkOn : {}) }}>{pago ? "✓" : ""}</button>
                      )}
                      {avulso ? (
                        onDelAvulso && (
                          <button onClick={() => onDelAvulso(it.id)} title="Excluir lançamento avulso"
                            style={S.del}>×</button>
                        )
                      ) : (
                        <>
                          {onZerar && !ajustado && (
                            <button onClick={() => onZerar(it.id)} title="Zerar valor só neste mês"
                              style={S.zero}>0</button>
                          )}
                          {onRestaurar && ajustado && (
                            <button onClick={() => onRestaurar(it.id)} title={`Restaurar valor (${brlK(it.valorOriginal)}) neste mês`}
                              style={S.undo}>↺</button>
                          )}
                        </>
                      )}
                    </div>
                    {showStatus && it.status && (
                      <span style={{ ...S.miniPill, background: STATUS_COLOR[it.status].bg, color: STATUS_COLOR[it.status].fg }}>{it.status}</span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ListTable({ title, rows, tipo, onDel, onEdit, showStatus, isPago, togglePago }) {
  return (
    <div style={{ flex: 1, minWidth: 320 }}>
      <div style={S.listTitle}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Clique em qualquer célula para editar. O ✓ marca como efetuado no mês selecionado.</div>
      <div style={{ maxHeight: 340, overflow: "auto" }}>
        <table style={S.table}>
          <thead><tr>
            {(showStatus
              ? ["✓","Descrição","Venc","Valor","Categoria","Recorrência","Status","Situação",""]
              : ["✓","Descrição","Venc","Valor","Categoria","Recorrência",""]
            ).map((h, i) => <th key={h + i} style={S.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => {
              const pago = isPago ? isPago(r.id) : false;
              return (
              <tr key={r.id} style={{ opacity: pago ? 0.6 : 1 }}>
                <td style={{ ...S.td, textAlign: "center" }}>
                  <button onClick={() => togglePago && togglePago(r.id)} title={pago ? "Efetuado — clique para desmarcar" : "Marcar como efetuado"}
                    style={{ ...S.check, ...(pago ? S.checkOn : {}) }}>{pago ? "✓" : ""}</button>
                </td>
                <td style={{ ...S.td, fontWeight: 600, textDecoration: pago ? "line-through" : "none" }}>
                  <EditCell value={r.desc} onSave={(v) => onEdit(tipo, r.id, "desc", v)} />
                </td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  <EditCell value={r.venc} type="number" min={1} max={31} align="center" onSave={(v) => onEdit(tipo, r.id, "venc", v)} />
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  <EditCell value={r.valor} type="number" step="0.01" align="right" display={brlK(r.valor)} onSave={(v) => onEdit(tipo, r.id, "valor", v)} />
                </td>
                <td style={S.td}>
                  <EditCell value={r.categoria} muted onSave={(v) => onEdit(tipo, r.id, "categoria", v)} />
                </td>
                <td style={S.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <EditCell value={r.periodo} type="select" options={["Mensal","Semanal","Pontual","Anual","Trimestral"]}
                      render={(v) => <span style={{ fontSize: 12, color: "#a5b4fc" }}>{v}</span>}
                      onSave={(v) => onEdit(tipo, r.id, "periodo", v)} />
                    <span style={{ fontSize: 10, color: "#64748b" }}>desde {MONTHS[r.mesInicio ?? 7]}/{r.anoInicio ?? 26}</span>
                  </div>
                </td>
                {showStatus && (
                  <td style={S.td}>
                    <EditCell value={r.status} type="select" options={["Inegociável","Prioridade","Nice to have"]}
                      render={(v) => <span style={{ ...S.miniPill, background: STATUS_COLOR[v].bg, color: STATUS_COLOR[v].fg }}>{v}</span>}
                      onSave={(v) => onEdit(tipo, r.id, "status", v)} />
                  </td>
                )}
                {showStatus && (
                  <td style={{ ...S.td, textAlign: "center" }}>
                    {r.situacao === "fluxo" && <span style={{ ...S.miniPill, background: "rgba(74,222,128,.14)", color: "#4ade80" }}>no fluxo</span>}
                    {r.situacao === "cabe" && <span style={{ ...S.miniPill, background: "rgba(96,165,250,.14)", color: "#60a5fa" }}>pode entrar</span>}
                    {r.situacao === "espera" && <span style={{ ...S.miniPill, background: "rgba(148,163,184,.14)", color: "#cbd5e1" }}>em espera</span>}
                  </td>
                )}
                <td style={{ ...S.td, textAlign: "center" }}>
                  <button onClick={() => onDel(r.id)} style={S.del}>×</button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromoverBtn({ onPromover }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} title="Tirar da fila e enviar para o fluxo" style={S.promo}>→ fluxo</button>
      {open && (
        <span style={S.promoPop}>
          <span style={S.promoLabel}>Enviar como:</span>
          <button style={{ ...S.promoOpt, color: STATUS_COLOR["Prioridade"].fg }}
            onClick={() => { onPromover("Prioridade"); setOpen(false); }}>Prioridade</button>
          <button style={{ ...S.promoOpt, color: STATUS_COLOR["Inegociável"].fg }}
            onClick={() => { onPromover("Inegociável"); setOpen(false); }}>Inegociável</button>
          <button style={S.promoCancel} onClick={() => setOpen(false)}>cancelar</button>
        </span>
      )}
    </span>
  );
}

function EditCell({ value, onSave, type = "text", options, render, display, muted, align = "left", min, max, step }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  // para campos com limite (ex: Venc. dia): no máximo 2 dígitos e valor entre min e max
  const limitado = type === "number" && max != null;
  const commit = () => {
    setEditing(false);
    let out = val;
    if (limitado) {
      let n = parseInt(val, 10);
      if (isNaN(n)) n = min ?? 1;
      if (min != null && n < min) n = min;
      if (max != null && n > max) n = max;
      out = n;
    }
    if (out !== value) onSave(out);
  };

  const onChangeNum = (e) => {
    let v = e.target.value;
    if (limitado) {
      v = v.replace(/\D/g, "").slice(0, 2); // só dígitos, máx 2
    }
    setVal(v);
  };

  if (editing) {
    if (type === "select") {
      return (
        <select autoFocus value={val} style={S.cellInput}
          onChange={(e) => { onSave(e.target.value); setEditing(false); }}
          onBlur={() => setEditing(false)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <input autoFocus type={type} value={val} min={min} max={max} step={step}
        inputMode={limitado ? "numeric" : undefined} maxLength={limitado ? 2 : undefined}
        style={{ ...S.cellInput, textAlign: align }}
        onChange={onChangeNum}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(value); setEditing(false); } }} />
    );
  }
  return (
    <span onClick={() => setEditing(true)} style={{ ...S.cellView, color: muted ? "#94a3b8" : "inherit", fontSize: muted ? 12 : "inherit" }}>
      {render ? render(value) : (display != null ? display : value)}
    </span>
  );
}

const F = ({ label, wide, children }) => (
  <div style={{ gridColumn: wide ? "span 2" : "span 1" }}>
    <div style={S.fLabel}>{label}</div>{children}
  </div>
);
const Lg = ({ c, t }) => (
  <div style={S.lg}><span style={{ ...S.dot, background: c }} />{t}</div>
);

/* ── Estilos ── */
const S = {
  page: { minHeight: "100vh", background: "radial-gradient(1200px 600px at 20% -10%, #1e2a52 0%, #0b1020 55%, #070a15 100%)", padding: 20, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif", color: "#e2e8f0" },
  shell: { maxWidth: 1180, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  brand: { fontSize: 22, fontWeight: 800, letterSpacing: 2, background: "linear-gradient(90deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  subbrand: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  monthPicker: { display: "flex", gap: 8 },
  lockBtn: { background: "rgba(30,41,80,.6)", border: "1px solid rgba(129,140,248,.3)", borderRadius: 10, padding: "8px 12px", fontSize: 14, cursor: "pointer" },
  promo: { background: "rgba(96,165,250,.14)", border: "1px solid rgba(96,165,250,.4)", color: "#60a5fa", borderRadius: 7, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  promoPop: { position: "absolute", top: "115%", right: 0, zIndex: 20, background: "#0d1430", border: "1px solid rgba(129,140,248,.35)", borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 8px 24px rgba(0,0,0,.5)", minWidth: 130 },
  promoLabel: { fontSize: 10, color: "#64748b", padding: "0 2px 2px" },
  promoOpt: { background: "rgba(30,41,80,.5)", border: "1px solid rgba(129,140,248,.2)", borderRadius: 6, padding: "6px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" },
  promoCancel: { background: "transparent", border: "none", color: "#64748b", fontSize: 10.5, cursor: "pointer", padding: "2px", textAlign: "center" },
  pipeTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16, flexWrap: "wrap" },
  pipeTitle: { fontSize: 16, fontWeight: 700, color: "#e2e8f0" },
  pipeSub: { fontSize: 12, color: "#94a3b8", marginTop: 3 },
  pipeTotalBox: { background: "linear-gradient(135deg, rgba(245,158,11,.9), rgba(217,119,6,.9))", borderRadius: 12, padding: "10px 20px", textAlign: "right", minWidth: 150 },
  pipeTotalLabel: { fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,.6)", letterSpacing: 1 },
  pipeTotalVal: { fontSize: 22, fontWeight: 800, color: "#1a1206" },
  linkBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 20, padding: "0 6px", borderRadius: 6, border: "1px solid rgba(129,140,248,.4)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, textDecoration: "none", cursor: "pointer" },
  empresaBar: { display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  empresaBtn: { background: "rgba(20,28,58,.55)", border: "1px solid rgba(129,140,248,.2)", color: "#94a3b8", padding: "7px 18px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: 0.3 },
  empresaBtnOn: { background: "linear-gradient(90deg,#6366f1,#a855f7)", color: "#fff", borderColor: "transparent" },
  empresaHint: { fontSize: 11, color: "#64748b", marginLeft: 4 },
  select: { background: "rgba(30,41,80,.6)", border: "1px solid rgba(129,140,248,.3)", color: "#e2e8f0", padding: "8px 12px", borderRadius: 10, fontSize: 14, outline: "none" },
  tabs: { display: "flex", gap: 8, marginBottom: 18 },
  tab: { background: "rgba(30,41,80,.4)", border: "1px solid rgba(129,140,248,.15)", color: "#94a3b8", padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  tabOn: { background: "linear-gradient(90deg,rgba(99,102,241,.35),rgba(168,85,247,.25))", color: "#fff", borderColor: "rgba(129,140,248,.5)" },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 18 },
  kpi: { position: "relative", background: "rgba(20,28,58,.55)", border: "1px solid rgba(129,140,248,.15)", borderRadius: 16, padding: "16px 18px", backdropFilter: "blur(12px)", overflow: "hidden" },
  kpiBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  kpiLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 6 },
  kpiVal: { fontSize: 22, fontWeight: 700 },
  card: { background: "rgba(16,23,48,.6)", border: "1px solid rgba(129,140,248,.15)", borderRadius: 20, padding: 22, backdropFilter: "blur(14px)" },
  gridHead: { display: "grid", gridTemplateColumns: "0.7fr 0.6fr repeat(4,1fr)", gap: 8, paddingBottom: 12, borderBottom: "1px solid rgba(129,140,248,.15)", marginBottom: 6 },
  gcell: { fontSize: 12, color: "#94a3b8", fontWeight: 600, textAlign: "right" },
  glabel: { textAlign: "left", color: "#c084fc", fontSize: 14 },
  gcellVal: { fontSize: 14, textAlign: "right", color: "#e2e8f0" },
  row: { display: "grid", gridTemplateColumns: "0.7fr 0.6fr repeat(4,1fr)", gap: 8, alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(129,140,248,.08)", cursor: "pointer" },
  rowFluxo: { cursor: "default", borderTop: "1px solid rgba(129,140,248,.25)", borderBottom: "none", marginTop: 4 },
  rowLabel: { display: "flex", alignItems: "center", gap: 10, fontSize: 15 },
  plus: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, minWidth: 22, borderRadius: "50%", border: "1.5px solid", transition: "transform .2s", boxSizing: "border-box", flexShrink: 0, lineHeight: 0 },
  dot: { display: "inline-block", width: 9, height: 9, borderRadius: "50%" },
  expand: { padding: "4px 0 10px" },
  expandRow: { display: "grid", gridTemplateColumns: "0.7fr 0.6fr repeat(4,1fr)", gap: 8, padding: "3px 0" },
  expandLabel: {}, expandCell: {},
  expItem: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, background: "rgba(30,41,80,.35)", borderRadius: 8, padding: "5px 8px" },
  expDesc: { fontSize: 11, color: "#cbd5e1", textAlign: "right", lineHeight: 1.2 },
  expVal: { fontSize: 12, fontWeight: 700, color: "#93c5fd" },
  miniPill: { fontSize: 9, padding: "1px 6px", borderRadius: 6, marginTop: 2 },
  hint: { marginTop: 16, fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 },
  filaTop: { display: "flex", justifyContent: "space-between", marginBottom: 14 },
  filaCaixaLabel: { fontSize: 12, color: "#94a3b8" },
  filaCaixaVal: { fontSize: 24, fontWeight: 800, color: "#e2e8f0", marginTop: 2 },
  legend: { display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(129,140,248,.15)" },
  lg: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", fontSize: 11, color: "#94a3b8", fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid rgba(129,140,248,.15)", position: "sticky", top: 0, background: "#0d1430" },
  td: { padding: "9px 10px", borderBottom: "1px solid rgba(129,140,248,.06)", color: "#e2e8f0" },
  pill: { display: "inline-flex", alignItems: "center", fontSize: 11, padding: "3px 9px", borderRadius: 8, fontWeight: 600 },
  cutoff: { textAlign: "center", fontSize: 11, color: "#4ade80", padding: "6px", background: "rgba(74,222,128,.08)", fontWeight: 600 },
  formTypeRow: { display: "flex", gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, background: "rgba(30,41,80,.4)", border: "1px solid rgba(129,140,248,.15)", color: "#94a3b8", padding: "10px", borderRadius: 10, cursor: "pointer", fontWeight: 600 },
  typeBtnOn: { background: "linear-gradient(90deg,rgba(99,102,241,.35),rgba(168,85,247,.25))", color: "#fff" },
  form: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 },
  fLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", background: "rgba(10,16,38,.7)", border: "1px solid rgba(129,140,248,.25)", color: "#e2e8f0", padding: "9px 11px", borderRadius: 9, fontSize: 13, outline: "none" },
  addBtn: { width: "100%", background: "linear-gradient(90deg,#6366f1,#a855f7)", color: "#fff", border: "none", padding: "10px", borderRadius: 9, fontWeight: 700, cursor: "pointer" },
  listWrap: { display: "flex", gap: 18, flexWrap: "wrap" },
  listTitle: { fontSize: 13, fontWeight: 700, color: "#c084fc", marginBottom: 8 },
  del: { background: "rgba(244,63,94,.15)", color: "#fb7185", border: "none", width: 24, height: 24, borderRadius: 6, cursor: "pointer", fontSize: 16, lineHeight: 1 },
  cellView: { cursor: "pointer", borderRadius: 4, padding: "1px 3px", display: "inline-block", minWidth: 20, minHeight: 16 },
  arrow: { background: "rgba(99,102,241,.15)", border: "1px solid rgba(129,140,248,.3)", color: "#a5b4fc", width: 22, height: 22, borderRadius: 6, cursor: "pointer", fontSize: 12, lineHeight: 1, marginRight: 3, padding: 0 },
  check: { width: 20, height: 20, borderRadius: 6, border: "1.5px solid rgba(129,140,248,.4)", background: "transparent", color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  checkOn: { background: "rgba(74,222,128,.2)", borderColor: "#4ade80", color: "#4ade80" },
  zero: { width: 20, height: 20, borderRadius: 6, border: "1.5px solid rgba(251,113,133,.4)", background: "transparent", color: "#fb7185", cursor: "pointer", fontSize: 11, fontWeight: 700, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  undo: { width: 20, height: 20, borderRadius: 6, border: "1.5px solid rgba(251,191,36,.5)", background: "rgba(251,191,36,.15)", color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  avulsoBar: { marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(129,140,248,.12)" },
  avulsoBtnR: { background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.35)", color: "#4ade80", padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  avulsoBtnD: { background: "rgba(251,113,133,.12)", border: "1px solid rgba(251,113,133,.35)", color: "#fb7185", padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  addBtnSmall: { background: "linear-gradient(90deg,#6366f1,#a855f7)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 9, fontWeight: 700, cursor: "pointer", fontSize: 13 },
  cancelBtn: { background: "transparent", border: "1px solid rgba(129,140,248,.25)", color: "#94a3b8", padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13 },
  avTag: { fontSize: 9, background: "rgba(232,121,249,.18)", color: "#e879f9", padding: "1px 5px", borderRadius: 5, marginRight: 5, verticalAlign: "middle" },
  cellInput: { width: "100%", minWidth: 44, boxSizing: "border-box", background: "rgba(10,16,38,.95)", border: "1px solid rgba(129,140,248,.5)", color: "#e2e8f0", padding: "4px 6px", borderRadius: 6, fontSize: 13, outline: "none" },
  reset: { marginTop: 18, background: "transparent", border: "1px solid rgba(129,140,248,.25)", color: "#94a3b8", padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontSize: 12 },
  footer: { textAlign: "center", fontSize: 11, color: "#64748b", marginTop: 20 },
};
