/* ============================================================
   "Service worker" do CFM: permite instalar o site como aplicativo
   e abrir mesmo com internet fraca ou sem internet.

   Estratégia: SEMPRE tenta a versão mais nova pela internet primeiro
   (assim, qualquer atualização aparece na hora); se não houver
   internet, usa a última cópia guardada no aparelho.
   Login, dados (Supabase) e vídeos (YouTube) nunca são guardados.
   ============================================================ */
var VERSAO = "cfm-v1";
var ESSENCIAIS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/style.css",
  "assets/config.js",
  "assets/conta.js",
  "assets/app.js",
  "assets/painel.js",
  "assets/interacao.js",
  "assets/instalar.js",
  "Cursos/cursos.js",
  "assets/simbolo.png",
  "assets/logo-circular.png",
  "assets/favicon-64.png",
  "assets/icone-192.png"
];

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(VERSAO)
      .then(function (cache) { return cache.addAll(ESSENCIAIS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys()
      .then(function (nomes) {
        return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Arquivos de fora que podem ser guardados (bibliotecas e fontes)
function podeGuardarDeFora(url) {
  return url.hostname === "cdn.jsdelivr.net" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var doSite = url.origin === self.location.origin;
  if (!doSite && !podeGuardarDeFora(url)) return; // Supabase, YouTube etc.: direto pela internet

  ev.respondWith(
    fetch(req)
      .then(function (resp) {
        if (resp && (resp.ok || resp.type === "opaque")) {
          var copia = resp.clone();
          caches.open(VERSAO).then(function (cache) { cache.put(req, copia); });
        }
        return resp;
      })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (guardado) {
          if (guardado) return guardado;
          if (req.mode === "navigate") return caches.match("index.html");
          return Response.error();
        });
      })
  );
});
