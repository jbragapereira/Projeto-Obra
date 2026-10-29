import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Os dados de exemplo (com as 418 linhas do orçamento da ARRECIFES) vão num arquivo à parte: o arquivo
        // principal do app fica abaixo do limite de 500 kB e o navegador guarda cada um no cache em separado.
        codeSplitting: { groups: [{ name: 'dados-exemplo', test: /src[\\/]lib[\\/]mock/ }] },
      },
    },
  },
})
