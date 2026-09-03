// Service worker do Portal de Metas — existe só pra deixar o site instalável como app
// (ícone na tela inicial do celular, abre sem barra de endereço). De propósito ele NÃO
// guarda nada em cache: como este é um site Next.js, cada novo deploy no Vercel gera
// arquivos com nomes diferentes por trás — cachear isso correria o risco de travar
// alguém numa versão antiga do site depois de uma atualização. Toda página e todo dado
// continuam vindo sempre direto da rede, normalmente.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Precisa existir um listener de "fetch" pro navegador considerar o site instalável,
// mesmo sem fazer nada de especial nele.
self.addEventListener("fetch", () => {});
