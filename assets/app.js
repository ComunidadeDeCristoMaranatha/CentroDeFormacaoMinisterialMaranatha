/* ============================================================
   Centro de Formação Ministerial Maranatha — funcionamento do site
   Você normalmente NÃO precisa mexer neste arquivo.
   Para adicionar cursos e aulas, edite Cursos/cursos.js
   ============================================================ */
(function () {
  "use strict";

  var CURSOS = window.CURSOS || [];
  var Conta = window.Conta;
  var app = document.getElementById("app");
  // Quando a página sabe se atualizar sozinha (sem recarregar o vídeo), guarda a função aqui
  var atualizarPagina = null;

  document.getElementById("ano").textContent = new Date().getFullYear();

  /* ---------- Progresso (no navegador ou na conta do aluno — ver conta.js) ---------- */
  function concluida(cursoId, aulaId) { return Conta.concluida(cursoId, aulaId); }
  function alternarConcluida(cursoId, aulaId) { Conta.alternar(cursoId, aulaId); }

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
  /* ---------- Mostrar/esconder cursos (controlado pelos admins no Painel → Cursos) ---------- */
  var CHAVE_CONFIG = "cfm-config-cursos-v1";
  var configCursos = {};
  try { configCursos = JSON.parse(localStorage.getItem(CHAVE_CONFIG)) || {}; } catch (e) { configCursos = {}; }

  function carregarConfigCursos() {
    if (!Conta.cliente) return Promise.resolve(false);
    return Conta.cliente.from("cursos_config").select("curso_id, visivel, abre_em, fecha_em").then(function (r) {
      if (r.error) { console.error(r.error); return false; }
      var novo = {};
      r.data.forEach(function (l) { novo[l.curso_id] = l; });
      var mudou = JSON.stringify(novo) !== JSON.stringify(configCursos);
      configCursos = novo;
      try { localStorage.setItem(CHAVE_CONFIG, JSON.stringify(novo)); } catch (e) { /* ok */ }
      return mudou;
    });
  }

  // "aberto" | "agendado" (abre depois) | "encerrado" (já fechou) | "oculto" (escondido pelo admin)
  function situacao(curso) {
    var c = configCursos[curso.id];
    if (!c) return "aberto";
    if (!c.visivel) return "oculto";
    var agora = Date.now();
    if (c.fecha_em && agora > Date.parse(c.fecha_em)) return "encerrado";
    if (c.abre_em && agora < Date.parse(c.abre_em)) return "agendado";
    return "aberto";
  }
  function ehAdmin() { return Conta.ativo && Conta.ehAdmin(); }
  function temAulas(curso) {
    return curso.status !== "em-breve" && todasAulas(curso).length > 0;
  }
  // Aparece na lista de cursos? (admins sempre veem tudo, com aviso)
  function visivelNoSite(curso) {
    var s = situacao(curso);
    return s === "aberto" || s === "agendado" || ehAdmin();
  }
  // As aulas podem ser abertas?
  function disponivel(curso) {
    return temAulas(curso) && (situacao(curso) === "aberto" || ehAdmin());
  }
  function dataCurta(d) {
    return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
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
    var html = "", paragrafo = [], lista = [];
    function fecharParagrafo() {
      if (paragrafo.length) html += "<p>" + paragrafo.map(negrito).join("<br>") + "</p>";
      paragrafo = [];
    }
    function fecharLista() {
      if (lista.length) html += "<ul>" + lista.map(function (l) { return "<li>" + negrito(l) + "</li>"; }).join("") + "</ul>";
      lista = [];
    }
    linhas.forEach(function (l) {
      if (l.indexOf("## ") === 0) { fecharParagrafo(); fecharLista(); html += "<h3>" + negrito(l.slice(3)) + "</h3>"; }
      else if (l.indexOf("- ") === 0) { fecharParagrafo(); lista.push(l.slice(2)); }
      else { fecharLista(); paragrafo.push(l); }
    });
    fecharParagrafo();
    fecharLista();
    return html;
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
  function etiquetaCurso(curso) {
    var s = situacao(curso);
    var c = configCursos[curso.id] || {};
    if (s === "oculto") return { texto: "Oculto", classe: "oculto" };
    if (s === "encerrado") return { texto: "Encerrado", classe: "oculto" };
    if (!temAulas(curso)) return { texto: "Em breve", classe: "" };
    if (s === "agendado") return { texto: "Abre em " + dataCurta(c.abre_em), classe: "agendado" };
    return { texto: "Disponível", classe: "disponivel" };
  }

  function cardCurso(curso) {
    var ok = disponivel(curso);
    var clicavel = temAulas(curso);
    var etiqueta = etiquetaCurso(curso);
    var qtd = todasAulas(curso).length;
    var p = percentual(curso);
    var tag = clicavel ? "a" : "div";
    var href = clicavel ? ' href="#/curso/' + esc(curso.id) + '"' : "";
    return "<" + tag + ' class="card-curso' + (ok ? "" : " em-breve") + '"' + href + ">" +
      '<div class="card-capa">' +
        (curso.capa ? '<img src="' + esc(curso.capa) + '" alt="" loading="lazy">' : icone.chama + '<span class="card-capa-titulo">' + esc(curso.titulo) + "</span>") +
        '<span class="etiqueta ' + etiqueta.classe + '">' + esc(etiqueta.texto) + "</span>" +
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
    // Disponíveis primeiro, depois os que abrem em breve, depois os em preparação
    var peso = function (c) { return disponivel(c) ? 2 : temAulas(c) ? 1 : 0; };
    var ordenados = CURSOS.filter(visivelNoSite).sort(function (a, b) { return peso(b) - peso(a); });
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
    if (!visivelNoSite(curso)) return cursoIndisponivel();
    var ok = disponivel(curso);
    var s = situacao(curso);
    var cfg = configCursos[curso.id] || {};
    var aulas = todasAulas(curso);
    var p = percentual(curso);
    var prox = proximaAula(curso);
    var textoBotao = p === 0 ? "Começar o curso" : p === 100 ? "Rever o curso" : "Continuar de onde parei";

    var aviso = "";
    if (s !== "aberto" && ehAdmin()) {
      var motivo = s === "oculto" ? "este curso está <strong>oculto</strong> para os alunos."
        : s === "encerrado" ? "o prazo deste curso terminou em " + dataCurta(cfg.fecha_em) + " e ele não aparece mais para os alunos."
        : "para os alunos, as aulas só abrem em " + dataCurta(cfg.abre_em) + ".";
      aviso = '<div class="aviso-admin">' + icone.info + "<div><strong>Visão de administrador</strong><p>Você está vendo porque é admin: " + motivo +
        ' Para mudar, vá em <a href="#/painel/cursos">Painel → Cursos</a>.</p></div></div>';
    } else if (!temAulas(curso)) {
      aviso = '<div class="aviso-em-breve">' + icone.info + "<div><strong>Este curso está sendo preparado.</strong><p>As aulas serão liberadas em breve. Acompanhe as novidades no Instagram da igreja.</p></div></div>";
    } else if (s === "agendado") {
      aviso = '<div class="aviso-em-breve">' + icone.info + "<div><strong>As aulas abrem em " + dataCurta(cfg.abre_em) + ".</strong><p>Enquanto isso, conheça o conteúdo do curso abaixo.</p></div></div>";
    }

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
            : '<span class="selo">' + (s === "agendado" && temAulas(curso) ? "Abre em " + dataCurta(cfg.abre_em) : "Em breve") + "</span>") +
        "</div>" +
      "</section>" +
      '<div class="container curso-corpo">' +
        "<div>" +
          aviso +
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

  function cursoIndisponivel() {
    app.innerHTML = '<div class="vazio"><img src="assets/logo.png" alt=""><h1>Curso indisponível</h1>' +
      "<p>Este curso não está disponível no momento. Veja os outros cursos do CFM.</p>" +
      '<a class="botao botao-principal" href="#/cursos">Ver cursos</a></div>';
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
        "<h3>" + esc(curso.titulo) + "</h3>" + barraProgresso(percentual(curso)) +
        (Conta.ativo && Conta.estado.pronto && !Conta.estado.usuario
          ? '<p class="dica-login"><a href="#/entrar">Entre na sua conta</a> para salvar seu progresso em qualquer aparelho.</p>'
          : "") +
        listaModulos(curso, aula.id, true);
    }
    atualizar();
    atualizarPagina = atualizar;
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

  function carregando() {
    app.innerHTML = '<div class="vazio"><img src="assets/logo.png" alt=""><p>Carregando…</p></div>';
  }

  /* ============================================================
     CONTA DO ALUNO — entrar, criar conta, cadastro, minha conta
     ============================================================ */

  var ESTADOS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
    "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
  var IGREJA_CCM = "Comunidade de Cristo Maranatha";
  var SEM_IGREJA = "Não frequento igreja no momento";

  function irPara(hash) {
    if (location.hash === hash) rota();
    else location.hash = hash;
  }

  function aviso(texto, tipo) {
    var el = document.getElementById("aviso");
    el.textContent = texto;
    el.className = "aviso visivel " + (tipo || "");
    clearTimeout(aviso.tempo);
    aviso.tempo = setTimeout(function () { el.className = "aviso"; }, 5000);
  }

  function traduzirErro(e) {
    var m = String((e && (e.message || e.error_description)) || e || "");
    var mapa = [
      [/invalid login credentials/i, "E-mail ou senha incorretos."],
      [/already registered|already been registered|already exists/i, "Este e-mail já tem cadastro. Tente entrar ou recuperar a senha."],
      [/email not confirmed/i, "Você ainda não confirmou seu e-mail. Procure a mensagem de confirmação na caixa de entrada (e no spam)."],
      [/password should be|weak password/i, "Senha fraca. Use pelo menos 8 caracteres."],
      [/rate limit|too many requests|security purposes/i, "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo."],
      [/provider is not enabled|unsupported provider/i, "O login com Google ainda não está disponível."],
      [/code verifier|auth code|flow state|otp_expired|expired/i, "Este link expirou ou foi aberto em outro aparelho. Peça um novo link e abra no mesmo aparelho e navegador."],
      [/different from the old|same password/i, "A nova senha precisa ser diferente da anterior."],
      [/invalid email|unable to validate email/i, "Esse e-mail não parece válido."],
      [/failed to fetch|network/i, "Sem conexão com o servidor. Verifique sua internet."]
    ];
    for (var i = 0; i < mapa.length; i++) if (mapa[i][0].test(m)) return mapa[i][1];
    return "Algo deu errado. Tente de novo em instantes." + (m ? " (" + m + ")" : "");
  }

  // Liga um formulário: trava o botão enquanto envia e mostra erros em português
  function ligarFormulario(form, enviar) {
    var msg = form.querySelector(".mensagem");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var botao = form.querySelector('button[type="submit"]');
      msg.className = "mensagem";
      msg.textContent = "";
      botao.disabled = true;
      Promise.resolve()
        .then(function () { return enviar(new FormData(form)); })
        .then(function (sucesso) {
          if (sucesso) { msg.className = "mensagem sucesso"; msg.textContent = sucesso; }
        })
        .catch(function (e) {
          if (!e || !e.validacao) console.error(e);
          msg.className = "mensagem erro";
          msg.textContent = e && e.validacao ? e.message : traduzirErro(e);
        })
        .then(function () { botao.disabled = false; });
    });
  }
  function erroValidacao(texto) { var e = new Error(texto); e.validacao = true; return e; }

  // Páginas que só abrem com a conta aberta. Devolve true se pode mostrar.
  function exigirLogin() {
    if (!Conta.ativo) { naoEncontrado(); return false; }
    if (!Conta.estado.pronto) { carregando(); return false; }
    if (!Conta.estado.usuario) {
      Conta.lembrarDestino(location.hash);
      irPara("#/entrar");
      return false;
    }
    return true;
  }

  /* ---------- Botão da conta no topo ---------- */
  function renderContaTopo() {
    var el = document.getElementById("conta-topo");
    if (!Conta.ativo || !Conta.estado.pronto) { el.innerHTML = ""; return; }
    var u = Conta.estado.usuario;
    if (!u) {
      el.innerHTML = '<a class="botao botao-principal botao-pequeno" href="#/entrar">Entrar</a>';
      return;
    }
    var nome = (Conta.estado.perfil && Conta.estado.perfil.nome_completo) || u.email || "";
    var primeiro = nome.split(/[\s@]/)[0];
    el.innerHTML =
      (Conta.temPainel()
        ? '<a class="link-painel' + (/^#\/painel/.test(location.hash) ? " ativo" : "") + '" href="#/painel" title="Painel">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' +
            "<span>Painel</span></a>"
        : "") +
      '<a class="avatar-topo" href="#/minha-conta" title="Minha conta">' +
      '<span class="avatar">' + esc(primeiro.charAt(0).toUpperCase()) + "</span>" +
      '<span class="avatar-nome">' + esc(primeiro) + "</span></a>";
  }

  /* ---------- Entrar / Criar conta / Recuperar senha ---------- */
  function cabecalhoConta(titulo, subtitulo) {
    return '<img class="cartao-conta-logo" src="assets/logo.png" alt="">' +
      "<h1>" + titulo + "</h1><p class=\"cartao-conta-sub\">" + subtitulo + "</p>";
  }
  function botaoGoogle() {
    if (!Conta.googleAtivo) return "";
    return '<button type="button" class="botao botao-google" id="entrar-google">' +
      '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>' +
      "Continuar com Google</button>" +
      '<div class="divisor"><span>ou use seu e-mail</span></div>';
  }
  function ligarGoogle() {
    var b = document.getElementById("entrar-google");
    if (!b) return;
    b.addEventListener("click", function () {
      b.disabled = true;
      Conta.entrarComGoogle().catch(function (e) {
        b.disabled = false;
        var msg = app.querySelector(".mensagem");
        msg.className = "mensagem erro";
        msg.textContent = traduzirErro(e);
      });
    });
  }

  function paginaEntrar(modo) {
    if (!Conta.ativo) return naoEncontrado();
    if (!Conta.estado.pronto) return carregando();
    if (Conta.estado.usuario) return irPara("#/minha-conta");

    var abas = '<div class="abas" role="tablist">' +
      '<a role="tab" href="#/entrar" class="' + (modo === "entrar" ? "ativa" : "") + '">Entrar</a>' +
      '<a role="tab" href="#/criar-conta" class="' + (modo === "criar" ? "ativa" : "") + '">Criar conta</a></div>';
    var corpo;

    if (modo === "criar") {
      corpo = cabecalhoConta("Criar sua conta", "É gratuito. Com a conta, seu progresso fica salvo em qualquer aparelho — e, em breve, você poderá fazer as provas e receber certificados.") +
        abas + botaoGoogle() +
        '<form class="formulario" novalidate>' +
          campo("Nome completo", '<input name="nome" autocomplete="name" required maxlength="150">') +
          campo("E-mail", '<input name="email" type="email" autocomplete="email" required>') +
          campo("Senha", '<input name="senha" type="password" autocomplete="new-password" required minlength="8">', "Pelo menos 8 caracteres.") +
          campo("Repita a senha", '<input name="senha2" type="password" autocomplete="new-password" required>') +
          '<button class="botao botao-principal botao-largo" type="submit">Criar minha conta</button>' +
          '<div class="mensagem" role="alert"></div>' +
        "</form>";
    } else if (modo === "recuperar") {
      corpo = cabecalhoConta("Recuperar senha", "Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.") +
        '<form class="formulario" novalidate>' +
          campo("E-mail", '<input name="email" type="email" autocomplete="email" required>') +
          '<button class="botao botao-principal botao-largo" type="submit">Enviar link</button>' +
          '<div class="mensagem" role="alert"></div>' +
        "</form>" +
        '<p class="links-conta"><a href="#/entrar">Voltar para o login</a></p>';
    } else {
      corpo = cabecalhoConta("Entrar na sua conta", "Salve seu progresso e continue de onde parou em qualquer aparelho.") +
        abas + botaoGoogle() +
        '<form class="formulario" novalidate>' +
          campo("E-mail", '<input name="email" type="email" autocomplete="email" required>') +
          campo("Senha", '<input name="senha" type="password" autocomplete="current-password" required>') +
          '<button class="botao botao-principal botao-largo" type="submit">Entrar</button>' +
          '<div class="mensagem" role="alert"></div>' +
        "</form>" +
        '<p class="links-conta"><a href="#/recuperar-senha">Esqueci minha senha</a></p>';
    }

    app.innerHTML = '<div class="container pagina-conta"><div class="cartao-conta">' + corpo + "</div></div>";
    ligarGoogle();

    var form = app.querySelector("form");
    ligarFormulario(form, function (d) {
      var email = String(d.get("email") || "").trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw erroValidacao("Digite um e-mail válido.");

      if (modo === "criar") {
        var nome = String(d.get("nome") || "").trim();
        if (nome.split(/\s+/).length < 2) throw erroValidacao("Digite seu nome completo (nome e sobrenome).");
        if (String(d.get("senha")).length < 8) throw erroValidacao("A senha precisa ter pelo menos 8 caracteres.");
        if (d.get("senha") !== d.get("senha2")) throw erroValidacao("As duas senhas não são iguais.");
        return Conta.criarConta(nome, email, String(d.get("senha"))).then(function (r) {
          if (r.precisaConfirmar) {
            form.reset();
            return "Quase lá! Enviamos um link de confirmação para " + email + ". Abra o e-mail neste mesmo aparelho e clique no link (confira também o spam).";
          }
        });
      }
      if (modo === "recuperar") {
        return Conta.recuperarSenha(email).then(function () {
          return "Se existir uma conta com esse e-mail, você vai receber o link em alguns minutos. Abra o e-mail neste mesmo aparelho.";
        });
      }
      if (!d.get("senha")) throw erroValidacao("Digite sua senha.");
      return Conta.entrarComEmail(email, String(d.get("senha")));
    });

    // Erro que veio no endereço (ex.: link de e-mail expirado)
    if (Conta.estado.erroUrl) {
      var msg = form.querySelector(".mensagem");
      msg.className = "mensagem erro";
      msg.textContent = traduzirErro(Conta.estado.erroUrl);
      Conta.estado.erroUrl = null;
    }
    window.scrollTo(0, 0);
  }

  function campo(rotulo, controle, dica) {
    return '<label class="campo"><span class="campo-rotulo">' + rotulo + "</span>" + controle +
      (dica ? '<small class="campo-dica">' + dica + "</small>" : "") + "</label>";
  }

  /* ---------- Formulário de dados pessoais (cadastro e minha conta) ---------- */
  function formPerfil(p, textoBotao) {
    p = p || {};
    var igreja = p.igreja || "";
    var tipoIgreja = !igreja ? "" : igreja === IGREJA_CCM ? "ccm" : igreja === SEM_IGREJA ? "nenhuma" : "outra";
    var radio = function (valor, texto) {
      return '<label class="opcao"><input type="radio" name="tipo_igreja" value="' + valor + '"' +
        (tipoIgreja === valor ? " checked" : "") + " required><span>" + texto + "</span></label>";
    };
    return '<form class="formulario" id="form-perfil" novalidate>' +
      campo("Nome completo", '<input name="nome_completo" autocomplete="name" required maxlength="150" value="' + esc(p.nome_completo) + '">', "Do jeito que deve aparecer no certificado.") +
      campo("WhatsApp", '<input name="telefone" type="tel" autocomplete="tel" required maxlength="30" placeholder="(85) 99999-9999" value="' + esc(p.telefone) + '">') +
      '<div class="campo-linha">' +
        campo("Cidade", '<input name="cidade" autocomplete="address-level2" required maxlength="100" value="' + esc(p.cidade) + '">') +
        campo("Estado", '<select name="estado" required><option value="">UF</option>' + ESTADOS.map(function (uf) {
          return '<option value="' + uf + '"' + (p.estado === uf ? " selected" : "") + ">" + uf + "</option>";
        }).join("") + "</select>") +
      "</div>" +
      '<fieldset class="campo"><legend class="campo-rotulo">Qual igreja você frequenta?</legend>' +
        radio("ccm", IGREJA_CCM) +
        radio("outra", "Outra igreja") +
        '<input name="outra_igreja" class="campo-extra" placeholder="Nome da igreja" maxlength="150" value="' + esc(tipoIgreja === "outra" ? igreja : "") + '"' + (tipoIgreja === "outra" ? "" : " hidden") + ">" +
        radio("nenhuma", SEM_IGREJA) +
      "</fieldset>" +
      (p.aceitou_termos_em ? "" :
        '<label class="opcao opcao-termos"><input type="checkbox" name="termos" required><span>Li e concordo com a <a href="#/privacidade" target="_blank">Política de Privacidade</a> e com o uso dos meus dados pelo CFM.</span></label>') +
      '<button class="botao botao-principal botao-largo" type="submit">' + textoBotao + "</button>" +
      '<div class="mensagem" role="alert"></div>' +
    "</form>";
  }

  function ligarFormPerfil(aoSalvar) {
    var form = document.getElementById("form-perfil");
    var outra = form.querySelector('[name="outra_igreja"]');
    form.querySelectorAll('[name="tipo_igreja"]').forEach(function (r) {
      r.addEventListener("change", function () {
        outra.hidden = r.value !== "outra" || !r.checked;
        if (!outra.hidden) outra.focus();
      });
    });
    ligarFormulario(form, function (d) {
      var dados = {
        nome_completo: String(d.get("nome_completo") || "").trim().replace(/\s+/g, " "),
        telefone: String(d.get("telefone") || "").trim(),
        cidade: String(d.get("cidade") || "").trim(),
        estado: String(d.get("estado") || "")
      };
      var tipo = d.get("tipo_igreja");
      dados.igreja = tipo === "ccm" ? IGREJA_CCM : tipo === "nenhuma" ? SEM_IGREJA : String(d.get("outra_igreja") || "").trim();

      if (dados.nome_completo.split(" ").length < 2) throw erroValidacao("Digite seu nome completo (nome e sobrenome).");
      if (dados.telefone.replace(/\D/g, "").length < 10) throw erroValidacao("Digite o WhatsApp com DDD.");
      if (!dados.cidade || !dados.estado) throw erroValidacao("Informe sua cidade e estado.");
      if (!tipo) throw erroValidacao("Diga qual igreja você frequenta.");
      if (!dados.igreja) throw erroValidacao("Digite o nome da igreja.");
      var termos = form.querySelector('[name="termos"]');
      if (termos && !termos.checked) throw erroValidacao("Para continuar, é preciso concordar com a Política de Privacidade.");
      if (termos) dados.aceitou_termos_em = new Date().toISOString();

      return Conta.salvarPerfil(dados).then(aoSalvar);
    });
  }

  /* ---------- Completar cadastro (logo depois de criar a conta) ---------- */
  function paginaCadastro() {
    if (!exigirLogin()) return;
    app.innerHTML = '<div class="container pagina-conta"><div class="cartao-conta cartao-conta-largo">' +
      cabecalhoConta("Complete seu cadastro", "Só mais alguns dados. Eles serão usados pela secretaria do CFM e, no futuro, na emissão dos seus certificados.") +
      formPerfil(Conta.estado.perfil, "Salvar e continuar") +
    "</div></div>";
    ligarFormPerfil(function () {
      aviso("Cadastro concluído. Bem-vindo(a)!", "sucesso");
      irPara(Conta.pegarDestino() || "#/minha-conta");
    });
    window.scrollTo(0, 0);
  }

  /* ---------- Minha conta ---------- */
  function paginaMinhaConta() {
    if (!exigirLogin()) return;
    var u = Conta.estado.usuario;
    var p = Conta.estado.perfil || {};
    var primeiro = (p.nome_completo || "").split(" ")[0];
    var comGoogle = (u.app_metadata && u.app_metadata.provider) === "google";

    var emAndamento = CURSOS.filter(function (c) { return temAulas(c) && visivelNoSite(c) && percentual(c) > 0; });
    var meusCursos = emAndamento.length
      ? emAndamento.map(function (c) {
          var pc = percentual(c);
          var prox = proximaAula(c);
          return '<div class="meu-curso"><div class="meu-curso-info"><h3>' + esc(c.titulo) + "</h3>" + barraProgresso(pc) + "</div>" +
            '<a class="botao botao-secundario botao-pequeno" href="#/curso/' + esc(c.id) + (pc < 100 && prox ? "/aula/" + esc(prox.id) : "") + '">' +
            (pc === 100 ? "Ver curso" : "Continuar") + "</a></div>";
        }).join("")
      : '<p class="bloco-texto">Você ainda não começou nenhum curso. <a href="#/cursos">Ver cursos disponíveis</a></p>';

    app.innerHTML =
      '<section class="curso-topo">' + chamaHero() +
        '<div class="curso-topo-inner">' +
          '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <span>Minha conta</span></nav>' +
          "<h1>Olá" + (primeiro ? ", " + esc(primeiro) : "") + "!</h1>" +
          '<p class="lead">Aqui ficam seus cursos e seus dados.</p>' +
        "</div>" +
      "</section>" +
      '<div class="container curso-corpo">' +
        "<div>" +
          "<h2>Meus cursos</h2>" + '<div class="meus-cursos">' + meusCursos + "</div>" +
          '<h2 style="margin-top:44px">Meus dados</h2>' +
          '<div class="cartao">' + formPerfil(p, "Salvar alterações") + "</div>" +
        "</div>" +
        "<aside>" +
          '<div class="cartao">' +
            "<h3>Sua conta</h3>" +
            '<p class="bloco-texto" style="font-size:15px">' + esc(u.email) + "<br><small>" +
              (comGoogle ? "Você entra com sua conta Google." : "Você entra com e-mail e senha.") + "</small></p>" +
            '<button class="botao botao-secundario botao-largo" type="button" id="botao-sair">Sair da conta</button>' +
          "</div>" +
          (Conta.temPainel()
            ? '<div class="cartao" style="margin-top:16px"><h3>Equipe do CFM</h3>' +
                '<p class="bloco-texto" style="font-size:15px">' + esc(descreverAcesso()) + "</p>" +
                '<a class="botao botao-principal botao-largo" href="#/painel">Abrir o painel</a></div>'
            : "") +
          '<div class="cartao" style="margin-top:16px">' +
            "<h3>Seus dados e privacidade</h3>" +
            '<p class="bloco-texto" style="font-size:14px">Veja como usamos seus dados na <a href="#/privacidade">Política de Privacidade</a>.</p>' +
            '<button class="botao botao-perigo botao-largo" type="button" id="botao-excluir">Excluir minha conta</button>' +
          "</div>" +
        "</aside>" +
      "</div>";

    ligarFormPerfil(function () { aviso("Dados salvos.", "sucesso"); });
    document.getElementById("botao-sair").addEventListener("click", function () {
      Conta.sair().catch(function (e) { aviso(traduzirErro(e), "erro"); });
    });
    document.getElementById("botao-excluir").addEventListener("click", function () {
      var ok = window.confirm("Tem certeza? Sua conta, seus dados e seu progresso serão apagados para sempre. Isso não pode ser desfeito.");
      if (!ok) return;
      Conta.excluirConta()
        .then(function () { aviso("Sua conta foi excluída.", "sucesso"); })
        .catch(function (e) { aviso(traduzirErro(e), "erro"); });
    });
    window.scrollTo(0, 0);
  }

  function descreverAcesso() {
    var partes = [];
    if (Conta.ehAdmin()) partes.push("Administrador(a)");
    else if (Conta.ehConselho()) partes.push("Conselho geral");
    (Conta.estado.equipe || []).forEach(function (e) {
      var c = CURSOS.filter(function (x) { return x.id === e.curso_id; })[0];
      partes.push((e.funcao === "professor" ? "Professor(a)" : "Tutor(a)") + " em " + (c ? c.titulo : e.curso_id));
    });
    return "Seu acesso: " + partes.join(" · ") + ".";
  }

  /* ---------- Nova senha (depois do link "esqueci minha senha") ---------- */
  function paginaNovaSenha() {
    if (!exigirLogin()) return;
    app.innerHTML = '<div class="container pagina-conta"><div class="cartao-conta">' +
      cabecalhoConta("Criar nova senha", "Escolha uma nova senha para a sua conta.") +
      '<form class="formulario" novalidate>' +
        campo("Nova senha", '<input name="senha" type="password" autocomplete="new-password" required minlength="8">', "Pelo menos 8 caracteres.") +
        campo("Repita a nova senha", '<input name="senha2" type="password" autocomplete="new-password" required>') +
        '<button class="botao botao-principal botao-largo" type="submit">Salvar nova senha</button>' +
        '<div class="mensagem" role="alert"></div>' +
      "</form></div></div>";
    ligarFormulario(app.querySelector("form"), function (d) {
      if (String(d.get("senha")).length < 8) throw erroValidacao("A senha precisa ter pelo menos 8 caracteres.");
      if (d.get("senha") !== d.get("senha2")) throw erroValidacao("As duas senhas não são iguais.");
      return Conta.definirNovaSenha(String(d.get("senha"))).then(function () {
        aviso("Senha alterada com sucesso.", "sucesso");
        irPara("#/minha-conta");
      });
    });
    window.scrollTo(0, 0);
  }

  /* ---------- Política de privacidade ---------- */
  function paginaPrivacidade() {
    app.innerHTML =
      '<div class="container texto-legal">' +
        '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <span>Privacidade</span></nav>' +
        "<h1>Política de Privacidade</h1>" +
        '<div class="bloco-texto">' + formatarTexto(
          "O Centro de Formação Ministerial Maranatha (CFM), ministério da Comunidade de Cristo Maranatha, respeita a sua privacidade e segue a Lei Geral de Proteção de Dados (LGPD).\n\n" +
          "## Quais dados coletamos\n" +
          "- Nome completo, e-mail, WhatsApp, cidade, estado e igreja que você frequenta\n" +
          "- As aulas que você marcou como concluídas\n\n" +
          "## Para que usamos\n" +
          "- Salvar seu progresso nos cursos\n" +
          "- Emitir certificados com o seu nome\n" +
          "- Entrar em contato sobre os cursos do CFM\n\n" +
          "Não vendemos nem compartilhamos seus dados com empresas ou outras organizações.\n\n" +
          "## Quem tem acesso\n" +
          "Apenas a equipe do CFM: a administração e o conselho geral, além dos professores e tutores dos cursos que você faz (eles veem só os alunos desses cursos). Os dados ficam guardados com segurança no Supabase, o serviço que usamos para as contas da plataforma.\n\n" +
          "## Seus direitos\n" +
          "Você pode ver e corrigir seus dados a qualquer momento em **Minha conta**. Também pode **excluir sua conta** por lá, e todos os seus dados são apagados. Para qualquer dúvida, fale com a secretaria do CFM pelos canais oficiais da igreja."
        ) + "</div>" +
      "</div>";
    window.scrollTo(0, 0);
  }

  /* ---------- Rotas (endereços do site) ---------- */
  function rota() {
    var partes = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    var menu = "";
    atualizarPagina = null;

    // Quem entrou mas ainda não completou o cadastro vai primeiro para o cadastro
    var livres = ["cadastro", "privacidade", "nova-senha"];
    if (Conta.ativo && Conta.estado.pronto && Conta.estado.usuario && Conta.estado.perfil &&
        !Conta.perfilCompleto() && livres.indexOf(partes[0]) < 0) {
      Conta.lembrarDestino(location.hash || "#/");
      irPara("#/cadastro");
      return;
    }

    if (partes[0] === "curso" && partes[1]) {
      menu = "cursos";
      var curso = CURSOS.filter(function (c) { return c.id === partes[1]; })[0];
      if (!curso) naoEncontrado();
      else if (partes[2] === "aula" && partes[3]) paginaAula(curso, partes[3]);
      else paginaCurso(curso);
    } else if (!partes[0] || partes[0] === "cursos" || partes[0] === "sobre") {
      menu = partes[0] || "inicio";
      paginaInicio(partes[0]);
    } else if (partes[0] === "entrar") paginaEntrar("entrar");
    else if (partes[0] === "criar-conta") paginaEntrar("criar");
    else if (partes[0] === "recuperar-senha") paginaEntrar("recuperar");
    else if (partes[0] === "cadastro") paginaCadastro();
    else if (partes[0] === "minha-conta") paginaMinhaConta();
    else if (partes[0] === "nova-senha") paginaNovaSenha();
    else if (partes[0] === "privacidade") paginaPrivacidade();
    else if (partes[0] === "painel" && window.Painel) { menu = "painel"; window.Painel.pagina(partes.slice(1)); }
    else naoEncontrado();

    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("ativo", a.getAttribute("data-nav") === menu);
    });
    renderContaTopo();
  }

  window.addEventListener("hashchange", function (ev) {
    // Ao ir para "Entrar", lembra de onde a pessoa veio para voltar depois
    if (/^#\/(entrar|criar-conta)/.test(location.hash)) {
      var antes = (ev.oldURL || "").split("#")[1] || "";
      if (antes && antes !== "/" && !/^\/(entrar|criar-conta|recuperar-senha|cadastro|nova-senha)/.test(antes)) {
        Conta.lembrarDestino("#" + antes);
      }
    }
    rota();
  });

  Conta.aoMudar(function (evento, detalhe) {
    if (evento === "pronto") {
      if (Conta.estado.acaoUrl === "nova-senha" && Conta.estado.usuario) return irPara("#/nova-senha");
      if (Conta.estado.acabouDeEntrar) return aoEntrar();
      if (Conta.estado.erroUrl && !/^#\/(entrar|criar-conta|recuperar-senha)/.test(location.hash)) return irPara("#/entrar");
      if (atualizarPagina) { atualizarPagina(); renderContaTopo(); return; }
      return rota();
    }
    if (evento === "entrou") return aoEntrar();
    if (evento === "saiu") return irPara("#/");
    if (evento === "perfil") return renderContaTopo();
    if (evento === "progresso") return atualizarPagina ? atualizarPagina() : rota();
    if (evento === "erro") return aviso(detalhe, "erro");
  });

  function aoEntrar() {
    var destino = Conta.pegarDestino() || "#/minha-conta";
    if (Conta.estado.perfil && !Conta.perfilCompleto()) {
      Conta.lembrarDestino(destino);
      return irPara("#/cadastro");
    }
    aviso("Você entrou na sua conta.", "sucesso");
    irPara(destino);
  }

  // Ferramentas compartilhadas com o painel (assets/painel.js)
  window.CFM = {
    app: app, cursos: CURSOS, icone: icone,
    esc: esc, plural: plural, todasAulas: todasAulas, disponivel: disponivel, barraProgresso: barraProgresso,
    chamaHero: chamaHero, aviso: aviso, traduzirErro: traduzirErro, irPara: irPara,
    exigirLogin: exigirLogin, naoEncontrado: naoEncontrado, carregando: carregando,
    definirAtualizacao: function (fn) { atualizarPagina = fn; },
    temAulas: temAulas, situacao: situacao, dataCurta: dataCurta,
    configDoCurso: function (id) { return configCursos[id] || null; },
    recarregarConfigCursos: carregarConfigCursos
  };

  // Espera todos os arquivos (inclusive o painel) carregarem antes de abrir a página
  document.addEventListener("DOMContentLoaded", function () {
    rota();
    Conta.iniciar();
    // Busca quais cursos estão visíveis; se algo mudou desde a última visita, redesenha
    carregarConfigCursos().then(function (mudou) { if (mudou) rota(); });
  });
})();
