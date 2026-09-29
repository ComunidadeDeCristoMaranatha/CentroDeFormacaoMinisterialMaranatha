/* ============================================================
   Centro de Formação Ministerial Maranatha — funcionamento do site
   Você normalmente NÃO precisa mexer neste arquivo.
   Para adicionar cursos e aulas, edite Cursos/cursos.js
   ============================================================ */
(function () {
  "use strict";

  var CURSOS = window.CURSOS || [];
  var app = document.getElementById("app");
  var CHAVE = "cfmm-progresso-v1";

  document.getElementById("ano").textContent = new Date().getFullYear();

  /* ---------- Progresso (fica salvo no navegador de cada aluno) ---------- */
  var progresso = {};
  try { progresso = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { progresso = {}; }

  function salvarProgresso() {
    try { localStorage.setItem(CHAVE, JSON.stringify(progresso)); } catch (e) { /* navegador bloqueou */ }
  }
  function concluida(cursoId, aulaId) {
    return !!(progresso[cursoId] && progresso[cursoId][aulaId]);
  }
  function alternarConcluida(cursoId, aulaId) {
    progresso[cursoId] = progresso[cursoId] || {};
    if (progresso[cursoId][aulaId]) delete progresso[cursoId][aulaId];
    else progresso[cursoId][aulaId] = Date.now();
    salvarProgresso();
  }

  /* ---------- Ajudantes ---------- */
  function todasAulas(curso) {
    var lista = [];
    (curso.modulos || []).forEach(function (m, mi) {
      (m.aulas || []).forEach(function (a) { lista.push({ aula: a, modulo: m, moduloIndice: mi }); });
    });
    return lista;
  }
  function percentual(curso) {
    var aulas = todasAulas(curso);
    if (!aulas.length) return 0;
    var feitas = aulas.filter(function (x) { return concluida(curso.id, x.aula.id); }).length;
    return Math.round((feitas / aulas.length) * 100);
  }
  function disponivel(curso) {
    return curso.status !== "em-breve" && todasAulas(curso).length > 0;
  }
  function proximaAula(curso) {
    var aulas = todasAulas(curso);
    for (var i = 0; i < aulas.length; i++) if (!concluida(curso.id, aulas[i].aula.id)) return aulas[i].aula;
    return aulas[0] && aulas[0].aula;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }

  // Transforma o texto simples das aulas em HTML:
  // linha em branco = novo parágrafo · **texto** = negrito · linhas com "- " = lista · "## " = subtítulo
  function negrito(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function formatarLinhas(linhas) {
    if (!linhas.length) return "";
    if (linhas[0].indexOf("## ") === 0) return "<h3>" + negrito(linhas[0].slice(3)) + "</h3>" + formatarLinhas(linhas.slice(1));
    if (linhas.every(function (l) { return l.indexOf("- ") === 0; })) {
      return "<ul>" + linhas.map(function (l) { return "<li>" + negrito(l.slice(2)) + "</li>"; }).join("") + "</ul>";
    }
    return "<p>" + linhas.map(negrito).join("<br>") + "</p>";
  }
  function formatarTexto(texto) {
    if (!texto) return "";
    return String(texto).trim().split(/\n\s*\n/).map(function (bloco) {
      bloco = bloco.replace(/^\s+|\s+$/g, "");
      if (bloco.charAt(0) === "<") return bloco;
      return formatarLinhas(bloco.split("\n").map(function (l) { return l.trim(); }));
    }).join("");
  }

  function idYoutube(v) {
    if (!v) return null;
    var m = String(v).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(v) ? v : null;
  }

  /* ---------- Ícones ---------- */
  var icone = {
    chama: '<svg class="chama" viewBox="0 0 200 260" aria-hidden="true"><path fill="#fff" d="M104 4c10 46 58 70 64 128 6 62-30 118-78 124C44 250 18 206 26 156c5-32 24-52 40-78 4 30 16 46 32 52-10-40-6-86 6-126zm-6 150c-14 18-26 34-22 58 3 20 18 32 34 30 18-2 30-22 26-44-3-18-18-28-24-48-4 14-8 22-14 4z"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    seta: '<svg class="seta" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    play: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    livro: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    relogio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pessoa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    presente: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    celular: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
    ritmo: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    arquivo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
    esquerda: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    direita: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>'
  };
  function chamaHero(classe) { return icone.chama.replace('class="chama"', 'class="hero-chama ' + (classe || "") + '"'); }

  function barraProgresso(p) {
    return '<div class="progresso"><div class="progresso-barra" role="progressbar" aria-valuenow="' + p +
      '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + p + '%"></span></div><strong>' + p + "%</strong></div>";
  }

  /* ---------- Card de curso ---------- */
  function cardCurso(curso) {
    var ok = disponivel(curso);
    var qtd = todasAulas(curso).length;
    var p = percentual(curso);
    var tag = ok ? "a" : "div";
    var href = ok ? ' href="#/curso/' + esc(curso.id) + '"' : "";
    return "<" + tag + ' class="card-curso' + (ok ? "" : " em-breve") + '"' + href + ">" +
      '<div class="card-capa">' +
        (curso.capa ? '<img src="' + esc(curso.capa) + '" alt="" loading="lazy">' : icone.chama + '<span class="card-capa-titulo">' + esc(curso.titulo) + "</span>") +
        '<span class="etiqueta ' + (ok ? "disponivel" : "") + '">' + (ok ? "Disponível" : "Em breve") + "</span>" +
      "</div>" +
      '<div class="card-corpo">' +
        "<h3>" + esc(curso.titulo) + "</h3>" +
        "<p>" + esc(curso.resumo || "") + "</p>" +
        '<div class="card-meta">' +
          (qtd ? "<span>" + icone.play + plural(qtd, "aula", "aulas") + "</span>" : "") +
          (curso.cargaHoraria ? "<span>" + icone.relogio + esc(curso.cargaHoraria) + "</span>" : "") +
          (curso.professor ? "<span>" + icone.pessoa + esc(curso.professor) + "</span>" : "") +
        "</div>" +
        (ok && p > 0 ? barraProgresso(p) : "") +
      "</div>" +
    "</" + tag + ">";
  }

  /* ---------- Página inicial ---------- */
  function paginaInicio(ancora) {
    var ordenados = CURSOS.slice().sort(function (a, b) { return disponivel(b) - disponivel(a); });
    app.innerHTML =
      '<section class="hero">' + chamaHero() + chamaHero("hero-chama-2") +
        '<div class="hero-inner">' +
          '<span class="selo">🔥 Um novo tempo · Isaías 43:18-21</span>' +
          "<h1>Centro de Formação <em>Ministerial</em></h1>" +
          '<p class="lead">Cursos online e gratuitos para crescer no conhecimento da Palavra e servir a Deus com excelência.</p>' +
          '<div class="hero-acoes">' +
            '<a class="botao botao-claro" href="#/cursos">Ver cursos</a>' +
            '<a class="botao botao-contorno" href="#/sobre">Conheça o CFM</a>' +
          "</div>" +
        "</div>" +
      "</section>" +

      '<div class="faixa-beneficios"><ul>' +
        "<li>" + icone.presente + "100% gratuito</li>" +
        "<li>" + icone.ritmo + "Estude no seu ritmo</li>" +
        "<li>" + icone.celular + "Assista pelo celular ou computador</li>" +
      "</ul></div>" +

      '<section class="secao" id="cursos"><div class="container">' +
        '<div class="secao-cabecalho">' +
          '<span class="sobretitulo">Nossos cursos</span>' +
          "<h2>Escolha por onde começar</h2>" +
          "<p>Novos cursos e aulas são adicionados aos poucos. Volte sempre para conferir as novidades.</p>" +
        "</div>" +
        (ordenados.length
          ? '<div class="grade-cursos">' + ordenados.map(cardCurso).join("") + "</div>"
          : '<p class="bloco-texto">Os primeiros cursos estão sendo preparados. Em breve!</p>') +
      "</div></section>" +

      '<section class="secao secao-alt"><div class="container">' +
        '<div class="secao-cabecalho"><span class="sobretitulo">Como funciona</span><h2>Simples assim</h2></div>' +
        '<div class="passos">' +
          '<div class="passo"><div class="passo-numero">1</div><h3>Escolha um curso</h3><p>Veja os cursos disponíveis e clique no que deseja fazer. Não precisa criar conta nem pagar nada.</p></div>' +
          '<div class="passo"><div class="passo-numero">2</div><h3>Assista às aulas</h3><p>Cada aula tem um vídeo e um texto de apoio. Estude quando e onde puder.</p></div>' +
          '<div class="passo"><div class="passo-numero">3</div><h3>Acompanhe seu avanço</h3><p>Marque as aulas concluídas e continue de onde parou na próxima visita.</p></div>' +
        "</div>" +
      "</div></section>" +

      '<section class="secao" id="sobre"><div class="container sobre">' +
        '<div class="sobre-visual"><img src="assets/logo.png" alt="Logo da Comunidade de Cristo Maranatha"></div>' +
        '<div class="sobre-texto">' +
          '<span class="sobretitulo">Sobre o CFM</span>' +
          "<h2>Formando discípulos que servem</h2>" +
          "<p>O Centro de Formação Ministerial é uma iniciativa da Comunidade de Cristo Maranatha para capacitar membros, líderes e todos que desejam servir no Reino de Deus.</p>" +
          "<p>Aqui você encontra ensino bíblico e ministerial de forma gratuita e acessível, para estudar no seu tempo, de qualquer lugar.</p>" +
          '<blockquote class="versiculo">“Eis que faço uma coisa nova, que agora sairá à luz.”<cite>Isaías 43:19</cite></blockquote>' +
        "</div>" +
      "</div></section>";

    if (ancora) {
      var alvo = document.getElementById(ancora);
      if (alvo) {
        alvo.scrollIntoView();
        // As fontes podem terminar de carregar depois e mudar a altura da página
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { alvo.scrollIntoView(); });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Lista de módulos ---------- */
  function listaModulos(curso, aulaAtualId, lateral) {
    var ok = disponivel(curso);
    return '<div class="modulos">' + (curso.modulos || []).map(function (m, mi) {
      var aulas = m.aulas || [];
      var temAtual = aulas.some(function (a) { return a.id === aulaAtualId; });
      var feitas = aulas.filter(function (a) { return concluida(curso.id, a.id); }).length;
      var aberto = lateral ? temAtual : mi === 0 || temAtual;
      return '<details class="modulo"' + (aberto ? " open" : "") + ">" +
        "<summary><div><h3>" + esc(m.titulo) + "</h3><small>" +
          (ok ? feitas + " de " + aulas.length + " concluídas" : plural(aulas.length, "aula", "aulas")) +
        "</small></div>" + icone.seta + "</summary>" +
        '<ul class="aulas">' + aulas.map(function (a) {
          var feito = concluida(curso.id, a.id);
          var conteudo = '<span class="marcador' + (feito ? " feito" : "") + '">' + icone.check + "</span>" +
            '<span class="titulo-aula">' + esc(a.titulo) + "</span>" +
            (a.duracao ? '<span class="duracao">' + esc(a.duracao) + "</span>" : "");
          if (!ok) return '<li><div class="aula-item bloqueada">' + conteudo + "</div></li>";
          return '<li><a class="aula-item' + (a.id === aulaAtualId ? " atual" : "") + '" href="#/curso/' +
            esc(curso.id) + "/aula/" + esc(a.id) + '"' + (a.id === aulaAtualId ? ' aria-current="page"' : "") + ">" + conteudo + "</a></li>";
        }).join("") + "</ul></details>";
    }).join("") + "</div>";
  }

  /* ---------- Página do curso ---------- */
  function paginaCurso(curso) {
    var ok = disponivel(curso);
    var aulas = todasAulas(curso);
    var p = percentual(curso);
    var prox = proximaAula(curso);
    var textoBotao = p === 0 ? "Começar o curso" : p === 100 ? "Rever o curso" : "Continuar de onde parei";

    app.innerHTML =
      '<section class="curso-topo">' + chamaHero() +
        '<div class="curso-topo-inner">' +
          '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <a href="#/cursos">Cursos</a> › <span>' + esc(curso.titulo) + "</span></nav>" +
          "<h1>" + esc(curso.titulo) + "</h1>" +
          (curso.resumo ? '<p class="lead">' + esc(curso.resumo) + "</p>" : "") +
          '<div class="curso-info">' +
            (curso.professor ? "<span>" + icone.pessoa + esc(curso.professor) + "</span>" : "") +
            "<span>" + icone.livro + plural((curso.modulos || []).length, "módulo", "módulos") + "</span>" +
            "<span>" + icone.play + plural(aulas.length, "aula", "aulas") + "</span>" +
            (curso.cargaHoraria ? "<span>" + icone.relogio + esc(curso.cargaHoraria) + "</span>" : "") +
          "</div>" +
          (ok && prox
            ? '<div class="curso-acoes"><a class="botao botao-claro" href="#/curso/' + esc(curso.id) + "/aula/" + esc(prox.id) + '">' + icone.play + textoBotao + "</a>" + barraProgresso(p) + "</div>"
            : '<span class="selo">Em breve</span>') +
        "</div>" +
      "</section>" +
      '<div class="container curso-corpo">' +
        "<div>" +
          (!ok ? '<div class="aviso-em-breve">' + icone.info + "<div><strong>Este curso está sendo preparado.</strong><p>As aulas serão liberadas em breve. Acompanhe as novidades no Instagram da igreja.</p></div></div>" : "") +
          (curso.descricao ? '<h2>Sobre o curso</h2><div class="bloco-texto">' + formatarTexto(curso.descricao) + "</div>" : "") +
          ((curso.modulos || []).length ? '<h2 style="margin-top:36px">Conteúdo do curso</h2>' + listaModulos(curso, null, false) : "") +
        "</div>" +
        "<aside>" +
          (curso.paraQuem || curso.voceVaiAprender
            ? '<div class="cartao">' +
                (curso.voceVaiAprender ? "<h3>O que você vai aprender</h3>" + listaItens(curso.voceVaiAprender) : "") +
                (curso.paraQuem ? '<h3 style="margin-top:22px">Para quem é</h3><p class="bloco-texto" style="font-size:15px;margin:0">' + esc(curso.paraQuem) + "</p>" : "") +
              "</div>"
            : "") +
        "</aside>" +
      "</div>";
    window.scrollTo(0, 0);
  }

  function listaItens(itens) {
    return '<ul class="lista-simples">' + itens.map(function (i) { return "<li>" + icone.check + "<span>" + esc(i) + "</span></li>"; }).join("") + "</ul>";
  }

  /* ---------- Página da aula ---------- */
  function paginaAula(curso, aulaId) {
    if (!disponivel(curso)) { location.hash = "#/curso/" + curso.id; return; }
    var aulas = todasAulas(curso);
    var i = -1;
    for (var k = 0; k < aulas.length; k++) if (aulas[k].aula.id === aulaId) i = k;
    if (i < 0) return naoEncontrado();

    var atual = aulas[i];
    var aula = atual.aula;
    var anterior = aulas[i - 1] && aulas[i - 1].aula;
    var seguinte = aulas[i + 1] && aulas[i + 1].aula;
    var yt = idYoutube(aula.video);
    var linkAula = function (a) { return "#/curso/" + esc(curso.id) + "/aula/" + esc(a.id); };

    var video = yt
      ? '<iframe src="https://www.youtube-nocookie.com/embed/' + yt + '?rel=0&modestbranding=1" title="' + esc(aula.titulo) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      : '<div class="video-vazio">' + icone.chama + "<strong>Vídeo em breve</strong><span>Enquanto isso, leia o conteúdo da aula abaixo.</span></div>";

    app.innerHTML =
      '<div class="container aula-layout">' +
        "<div>" +
          '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <a href="#/curso/' + esc(curso.id) + '">' + esc(curso.titulo) + "</a> › <span>Aula " + (i + 1) + "</span></nav>" +
          '<div class="video">' + video + "</div>" +
          '<div class="aula-cabecalho">' +
            "<div><h1>" + esc(aula.titulo) + "</h1><small>" + esc(atual.modulo.titulo) + " · Aula " + (i + 1) + " de " + aulas.length +
              (aula.duracao ? " · " + esc(aula.duracao) : "") + "</small></div>" +
            '<button class="botao" id="botao-concluir" type="button"></button>' +
          "</div>" +
          '<div class="bloco-texto">' + formatarTexto(aula.texto) + "</div>" +
          (aula.materiais && aula.materiais.length
            ? '<div class="materiais"><h2>Materiais de apoio</h2>' + aula.materiais.map(function (m) {
                return '<a href="' + esc(m.link) + '" target="_blank" rel="noopener">' + icone.arquivo + "<span>" + esc(m.nome) + "</span></a>";
              }).join("") + "</div>"
            : "") +
          '<nav class="navegacao-aulas" aria-label="Navegar entre aulas">' +
            (anterior ? '<a class="botao botao-secundario" href="' + linkAula(anterior) + '">' + icone.esquerda + "<span>Anterior</span></a>" : "<span></span>") +
            (seguinte
              ? '<a class="botao botao-principal" href="' + linkAula(seguinte) + '"><span>Próxima aula</span>' + icone.direita + "</a>"
              : '<a class="botao botao-principal" href="#/curso/' + esc(curso.id) + '"><span>Voltar ao curso</span>' + icone.direita + "</a>") +
          "</nav>" +
        "</div>" +
        '<aside class="aula-lateral"><div class="cartao" id="lateral"></div></aside>' +
      "</div>";

    function atualizar() {
      var feito = concluida(curso.id, aula.id);
      var botao = document.getElementById("botao-concluir");
      botao.className = "botao " + (feito ? "botao-concluido" : "botao-principal");
      botao.innerHTML = feito ? icone.check + "Aula concluída" : "Marcar como concluída";
      botao.setAttribute("aria-pressed", feito ? "true" : "false");
      document.getElementById("lateral").innerHTML =
        "<h3>" + esc(curso.titulo) + "</h3>" + barraProgresso(percentual(curso)) + listaModulos(curso, aula.id, true);
    }
    atualizar();
    document.getElementById("botao-concluir").addEventListener("click", function () {
      alternarConcluida(curso.id, aula.id);
      atualizar();
    });
    window.scrollTo(0, 0);
  }

  function naoEncontrado() {
    app.innerHTML = '<div class="vazio"><img src="assets/logo.png" alt=""><h1>Página não encontrada</h1>' +
      '<p>O endereço pode estar errado ou o conteúdo mudou de lugar.</p><a class="botao botao-principal" href="#/">Voltar ao início</a></div>';
    window.scrollTo(0, 0);
  }

  /* ---------- Rotas (endereços do site) ---------- */
  function rota() {
    var partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    var menu = "inicio";

    if (partes[0] === "curso" && partes[1]) {
      menu = "cursos";
      var curso = CURSOS.filter(function (c) { return c.id === partes[1]; })[0];
      if (!curso) naoEncontrado();
      else if (partes[2] === "aula" && partes[3]) paginaAula(curso, partes[3]);
      else paginaCurso(curso);
    } else if (!partes[0] || partes[0] === "cursos" || partes[0] === "sobre") {
      menu = partes[0] || "inicio";
      paginaInicio(partes[0]);
    } else {
      naoEncontrado();
    }

    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("ativo", a.getAttribute("data-nav") === menu);
    });
  }

  window.addEventListener("hashchange", rota);
  rota();
})();
