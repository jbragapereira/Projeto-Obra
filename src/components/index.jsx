// Peças reutilizáveis da interface.
import { useEffect, useState } from 'react'
import { COR_SITUACAO } from '../lib/painel.js'
import { emMil } from '../lib/formato.js'
import { arredondar, formatarNumero, lerNumero, limparDigitacao } from '../lib/numero.js'

/* ── Ícones (SVG desenhados à mão; nada de emoji) ── */
const PATHS = {
  painel: <><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  diario: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 3v18M12 8h4M12 12h4" /></>,
  servicos: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  medicao: <><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  recados: <path d="M4 5h16v11H8l-4 4z" />,
  ajustes: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  avanco: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  fotos: <><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-9 7" /></>,
  mais: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  check: <path d="M5 12l5 5L20 7" />,
  topo: <path d="M12 19V5M5 12l7-7 7 7" />,
  planilha: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 11h7M9 14h7M9 17h4" /></>,
  obra: <><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M10 21v-6h4v6" /></>,
  sair: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  ferramenta: <path d="M14 7l3-3 3 3-3 3M17 4l-9 9-3 7 7-3 9-9" />,
  critico: <path d="M12 3l8 9-8 9-8-9z" />,
  planejamento: <><rect x="3" y="4" width="18" height="17" rx="1" /><path d="M7 9h6M7 13h10M7 17h4" /></>,
  trocar: <><path d="M7 4L3 8l4 4" /><path d="M3 8h14" /><path d="M17 20l4-4-4-4" /><path d="M21 16H7" /></>,
  // Tipos de restrição do médio prazo
  material: <><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  metodo: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></>,
  projeto: <><path d="M4 4h16v16H4z" /><path d="M4 15h6v5M14 4v7h6" /></>,
  seguranca: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />,
  logistica: <><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
}

export function Icon({ nome, tamanho = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[nome]}
    </svg>
  )
}

// Dados em sequência, lado a lado (em vez de "a · b · c"). Itens vazios somem.
export function Meta({ children }) {
  const itens = (Array.isArray(children) ? children : [children]).flat().filter(Boolean)
  return <div className="meta">{itens.map((x, i) => <span key={i}>{x}</span>)}</div>
}

export function Critico() {
  return (
    <span className="critico">
      <Icon nome="critico" tamanho={14} />Crítico
    </span>
  )
}

// Barra de avanço do serviço com a marca de onde ele deveria estar hoje.
export function Barra({ feito, hoje, atras }) {
  return (
    <div className="minibar" role="img" aria-label={`${feito}% feito${hoje != null ? `; o esperado para hoje é ${hoje}%` : ''}`}>
      <i className={atras ? 'atras' : ''} style={{ width: `${Math.min(100, feito)}%` }} />
      {hoje != null && <span className="hoje" style={{ left: `${Math.min(100, hoje)}%` }} />}
    </div>
  )
}

export function Pill({ situacao }) {
  return <span className={`pill ${COR_SITUACAO[situacao] ?? 'done'}`}>{situacao}</span>
}

// Número grande dos cartões: "R$" e "mil" pequenos, o valor grande.
export function Dinheiro({ valor }) {
  const { valor: v, sufixo } = emMil(valor ?? 0)
  return <><span className="cur">R$</span>{v}{sufixo && <span className="suf">{sufixo}</span>}</>
}

/* ── Campo de número do jeito brasileiro ("1.234,56") ──
   Guarda o texto do jeito que a pessoa digita e avisa o número entendido.
   Quando o valor muda por fora (botões − e +), o texto acompanha. */
export function CampoNumero({ valor, onMudar, onConfirmar, casas = 3, inteiro = false, ...props }) {
  const [texto, setTexto] = useState(valor ? formatarNumero(valor, casas) : '')
  const [anterior, setAnterior] = useState(valor)
  if (valor !== anterior) {
    setAnterior(valor)
    if (lerNumero(texto) !== valor) setTexto(valor ? formatarNumero(valor, casas) : '')
  }
  const invalido = texto !== '' && (lerNumero(texto) === null || (inteiro && !Number.isInteger(lerNumero(texto))))
  return (
    <input type="text" inputMode={inteiro ? 'numeric' : 'decimal'} autoComplete="off" value={texto} aria-invalid={invalido || undefined} {...props}
      onChange={(e) => {
        const t = limparDigitacao(e.target.value)
        setTexto(t)
        const n = arredondar(lerNumero(t), casas)
        onMudar?.(n === null ? (t === '' ? null : valor) : n)
      }}
      onBlur={() => {
        const n = arredondar(lerNumero(texto), casas)
        if (n === null && texto !== '') return // texto que não dá para entender: fica marcado e nada é gravado
        if (n !== null) setTexto(n ? formatarNumero(n, casas) : '')
        onConfirmar?.(n)
      }} />
  )
}

/* ── Faixa escura com o título da tela ── */
export function Faixa({ children }) {
  return <div className="faixa">{children}</div>
}

/* ── Estados ── */
export function Carregando() {
  return (
    <div className="view" aria-busy="true">
      <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
    </div>
  )
}

export function ErroCarga({ erro, onTentar }) {
  return (
    <div className="view">
      <section className="card empty" role="alert">
        <h2>Não deu para carregar</h2>
        <p>{erro}</p>
        {onTentar && <button className="btn primary" onClick={onTentar}>Tentar de novo</button>}
      </section>
    </div>
  )
}

export function Vazio({ icone = 'planilha', titulo, texto, acao, onAcao }) {
  return (
    <section className="card empty">
      <div className="ico"><Icon nome={icone} tamanho={40} /></div>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {acao && <button className="btn primary" onClick={onAcao}>＋ {acao}</button>}
    </section>
  )
}

export function Fase2({ titulo, texto }) {
  return (
    <section className="card empty">
      <div className="ico"><Icon nome="ferramenta" tamanho={40} /></div>
      <span className="pill soft">Fase 2</span>
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </section>
  )
}

/* ── Botão flutuante "Topo": aparece depois que a página desce e volta ao cabeçalho ── */
export function VoltarAoTopo({ aPartirDe = 300 }) {
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const olhar = () => setVisivel(window.scrollY > aPartirDe)
    olhar()
    window.addEventListener('scroll', olhar, { passive: true })
    return () => window.removeEventListener('scroll', olhar)
  }, [aPartirDe])
  if (!visivel) return null
  const subir = () => {
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' })
  }
  return (
    <button className="voltar-topo" onClick={subir} aria-label="Voltar ao topo da página">
      <Icon nome="topo" tamanho={20} /><span>Topo</span>
    </button>
  )
}

/* ── Folha que sobe de baixo (celular) ou abre ao lado (computador) ── */
export function Sheet({ titulo, subtitulo, topo, onFechar, children }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])
  return (
    <>
      <div className="scrim" onClick={onFechar} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="sheet-h">
          <div>
            {subtitulo && <div className="m">{subtitulo}</div>}
            <div className="t">{titulo}</div>
            {topo}
          </div>
          <button className="close" onClick={onFechar} autoFocus>Fechar ✕</button>
        </div>
        {children}
      </div>
    </>
  )
}

/* ── Aviso rápido: avisar('Salvo') de qualquer lugar ── */
export const avisar = (mensagem) => window.dispatchEvent(new CustomEvent('avisar', { detail: mensagem }))

export function Avisos() {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let t
    const ouvir = (e) => { setMsg(e.detail); clearTimeout(t); t = setTimeout(() => setMsg(null), 2800) }
    window.addEventListener('avisar', ouvir)
    return () => { window.removeEventListener('avisar', ouvir); clearTimeout(t) }
  }, [])
  return msg ? <div className="toast" role="status">{msg}</div> : null
}

/* ── Buscar dados ao abrir a tela, com carregando / erro / recarregar ── */
export function useDados(carregar) {
  const [estado, setEstado] = useState({ carregando: true, erro: null, data: null })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    carregar().then((r) => { if (vivo) setEstado({ carregando: false, erro: r.erro, data: r.data }) })
    return () => { vivo = false }
  }, [versao])
  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}
