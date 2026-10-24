// GPS do aparelho, para foto tirada agora pela câmera do app que não trouxe o dela.
// O navegador pergunta à pessoa na primeira vez.
// Devolve { lat, lon } ou null (negado, sem sinal ou demorou demais).
export function gpsDoAparelho() {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lon: Math.round(p.coords.longitude * 1e6) / 1e6 }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}
