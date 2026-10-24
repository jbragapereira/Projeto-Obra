import { Faixa, Fase2 } from '../components/index.jsx'

export default function Recados() {
  return (
    <>
      <Faixa><div className="faixa-titulo">Recados e pendências</div></Faixa>
      <div className="view">
        <Fase2 titulo="Recados e pendências"
          texto="Aqui vão ficar registrados os pedidos que chegam da diretoria e da fiscalização por WhatsApp, e-mail ou pessoalmente, com prazo e situação. Entra na Fase 2." />
      </div>
    </>
  )
}
