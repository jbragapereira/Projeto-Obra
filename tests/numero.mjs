// Números do jeito brasileiro (src/lib/numero.js) e o Concluído pelo saldo (src/lib/diario.js).
import { lerNumero, limparDigitacao, formatarNumero, arredondar } from '../src/lib/numero.js'
import { saldoDoItem, saldoRestante, concluiPeloSaldo, feitoNoMesComODia } from '../src/lib/diario.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('vírgula decimal', lerNumero('12,5'), 12.5)
conferir('ponto de milhar e vírgula decimal', lerNumero('1.234,56'), 1234.56)
conferir('vários milhares', lerNumero('1.234.567,8'), 1234567.8)
conferir('só ponto de milhar', lerNumero('1.234'), 1234)
conferir('ponto como decimal quando não é milhar', lerNumero('12.5'), 12.5)
conferir('"0.500" é meio, não quinhentos (milhar não começa com zero)', lerNumero('0.500'), 0.5)
conferir('"12.345" é doze mil (padrão brasileiro)', lerNumero('12.345'), 12345)
conferir('inteiro simples', lerNumero('40'), 40)
conferir('vírgula no começo', lerNumero(',5'), 0.5)
conferir('digitando: "12," ainda vale 12', lerNumero('12,'), 12)
conferir('espaços são ignorados', lerNumero(' 1 234,5 '), 1234.5)
conferir('vazio é null', lerNumero(''), null)
conferir('duas vírgulas não dá para entender', lerNumero('1,2,3'), null)
conferir('ponto de milhar mal colocado com vírgula', lerNumero('12.34,5'), null)
conferir('letras não entram na digitação', limparDigitacao('12a,5 m²'), '12,5')
conferir('mostra de volta no padrão brasileiro', formatarNumero(1234.5), '1.234,5')
conferir('arredonda em 3 casas', formatarNumero(2.34567), '2,346')
conferir('o valor guardado tem as mesmas casas que o campo mostra', arredondar(44.4234, 3), 44.423)
conferir('pessoas: inteiro', arredondar(12.6, 0), 13)

// Saldo do item e Concluído automático
conferir('saldo = contratado − acumulado', saldoDoItem({ contratado: 180, acumulado: 90 }), 90)
conferir('saldo nunca é negativo', saldoDoItem({ contratado: 100, acumulado: 120 }), 0)
conferir('quantidade igual ao saldo conclui', concluiPeloSaldo({ quantidade: 90, saldo: 90 }), true)
conferir('quantidade acima do saldo conclui', concluiPeloSaldo({ quantidade: 95, saldo: 90 }), true)
conferir('quantidade abaixo do saldo não conclui', concluiPeloSaldo({ quantidade: 89.99, saldo: 90 }), false)
conferir('sem saldo (já concluído antes) não conclui de novo', concluiPeloSaldo({ quantidade: 5, saldo: 0 }), false)
conferir('decimais com arredondamento conferem', concluiPeloSaldo({ quantidade: 0.1 + 0.2, saldo: 0.3 }), true)

conferir('saldo em tempo real: 90 − 12,5 = 77,5', saldoRestante({ saldo: 90, quantidade: 12.5 }), 77.5)
conferir('saldo em tempo real nunca fica negativo', saldoRestante({ saldo: 90, quantidade: 120 }), 0)
conferir('campo vazio não mexe no saldo', saldoRestante({ saldo: 90, quantidade: null }), 90)

// Feito no mês em tempo real
const medicao = { data_inicio: '2026-10-02', data_fim: '2026-11-01' }
conferir('feito no mês soma a quantidade digitada', feitoNoMesComODia({ executadoNoMes: 30, quantidade: 12.5, dia: '2026-10-24', medicao }), 42.5)
conferir('campo vazio não mexe no feito', feitoNoMesComODia({ executadoNoMes: 30, quantidade: null, dia: '2026-10-24', medicao }), 30)
conferir('dia fora do período da medição não entra no mês', feitoNoMesComODia({ executadoNoMes: 30, quantidade: 10, dia: '2026-09-28', medicao }), 30)
conferir('sem medição em andamento, nada entra no mês', feitoNoMesComODia({ executadoNoMes: 0, quantidade: 10, dia: '2026-10-24', medicao: null }), 0)

console.log(`${ok}/${tot} — números, saldo do item e feito no mês`)
process.exit(ok === tot ? 0 : 1)
