/* ============================================================
   Instalar o CFM como aplicativo no celular/computador
   - Android/Chrome/Edge: o navegador oferece a instalação e o site
     mostra o botão "Instalar".
   - iPhone/iPad (Safari): não há botão automático; o site ensina o
     caminho "Compartilhar → Adicionar à Tela de Início".
   ============================================================ */
(function () {
  "use strict";

  var C = window.CFM;
  var CHAVE_DISPENSA = "cfm-instalar-dispensado";
  var pedido = null; // o convite de instalação guardado (Android/Chrome)

  // Registra o "service worker" (necessário para instalar e abrir sem internet)
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) { console.error(e); });
    });
  }

  function jaInstalado() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function ehIOS() {
    var ua = navigator.userAgent;
    var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua); // só o Safari permite adicionar à tela
  }
  function dispensadoRecentemente() {
    try {
      var t = Number(localStorage.getItem(CHAVE_DISPENSA));
      return t && Date.now() - t < 30 * 864e5; // não insiste por 30 dias
    } catch (e) { return false; }
  }
  function dispensar() {
    try { localStorage.setItem(CHAVE_DISPENSA, String(Date.now())); } catch (e) { /* ok */ }
    fecharConvite();
  }

  function fecharConvite() {
    var el = document.getElementById("convite-instalar");
    if (el) el.remove();
  }

  function mostrarConvite() {
    if (jaInstalado() || document.getElementById("convite-instalar")) return;
    var ios = !pedido && ehIOS();
    if (!pedido && !ios) return;
    var el = document.createElement("div");
    el.id = "convite-instalar";
    el.className = "convite-instalar";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Instalar o aplicativo");
    el.innerHTML =
      '<img src="assets/icone-192.png" alt="" width="48" height="48">' +
      '<div class="convite-texto"><strong>Instale o CFM no seu celular</strong>' +
        (ios
          ? "<span>Toque em <b>Compartilhar</b> " + iconeCompartilhar + " e depois em <b>“Adicionar à Tela de Início”</b>.</span>"
          : "<span>Acesse os cursos com um toque, direto da tela inicial. É grátis e não ocupa quase nada.</span>") +
      "</div>" +
      '<div class="convite-acoes">' +
        (ios ? "" : '<button type="button" class="botao botao-principal botao-pequeno" data-instalar>Instalar</button>') +
        '<button type="button" class="botao-link" data-dispensar>' + (ios ? "Entendi" : "Agora não") + "</button>" +
      "</div>";
    document.body.appendChild(el);
    el.querySelector("[data-dispensar]").addEventListener("click", dispensar);
    var botao = el.querySelector("[data-instalar]");
    if (botao) botao.addEventListener("click", instalar);
  }

  var iconeCompartilhar = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  function instalar() {
    if (!pedido) return;
    pedido.prompt();
    pedido.userChoice.then(function (escolha) {
      if (escolha.outcome !== "accepted") dispensar();
      pedido = null;
      fecharConvite();
      atualizarLinkRodape();
    });
  }

  // Link fixo no rodapé ("Instalar aplicativo"), para quem dispensou o convite
  function atualizarLinkRodape() {
    var link = document.getElementById("link-instalar");
    if (!link) return;
    link.hidden = jaInstalado() || (!pedido && !ehIOS());
  }
  document.addEventListener("DOMContentLoaded", function () {
    var link = document.getElementById("link-instalar");
    if (link) link.addEventListener("click", function (ev) {
      ev.preventDefault();
      try { localStorage.removeItem(CHAVE_DISPENSA); } catch (e) { /* ok */ }
      if (pedido) instalar(); else mostrarConvite();
    });
    atualizarLinkRodape();
    // iPhone: mostra as instruções depois de alguns segundos de uso
    if (ehIOS() && !jaInstalado() && !dispensadoRecentemente()) setTimeout(mostrarConvite, 8000);
  });

  // Android/Chrome: o navegador avisa que o site pode ser instalado
  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    pedido = ev;
    atualizarLinkRodape();
    if (!dispensadoRecentemente()) setTimeout(mostrarConvite, 8000);
  });

  window.addEventListener("appinstalled", function () {
    pedido = null;
    fecharConvite();
    atualizarLinkRodape();
    if (C && C.aviso) C.aviso("Aplicativo instalado! Procure o ícone do CFM na tela inicial.", "sucesso");
  });
})();
