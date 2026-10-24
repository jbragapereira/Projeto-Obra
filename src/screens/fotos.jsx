import { Faixa, Fase2 } from '../components/index.jsx'

export default function Fotos() {
  return (
    <>
      <Faixa><div className="faixa-titulo">Fotos da semana</div></Faixa>
      <div className="view">
        <Fase2 titulo="Fotos da semana"
          texto="Aqui a fiscalização vai ver as fotos da semana desta obra, organizadas por serviço. Entra na Fase 2." />
      </div>
    </>
  )
}
