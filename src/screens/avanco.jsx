import { Faixa, Fase2 } from '../components/index.jsx'

export default function Avanco() {
  return (
    <>
      <Faixa><div className="faixa-titulo">Avanço por serviço</div></Faixa>
      <div className="view">
        <Fase2 titulo="Avanço da obra para a fiscalização"
          texto="Aqui a fiscalização vai ver o avanço de cada serviço sobre o contratado, pela quantidade e em R$, só desta obra. Entra na Fase 2." />
      </div>
    </>
  )
}
