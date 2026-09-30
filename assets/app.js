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
    return Conta.cliente.from("cursos_config").select("*").then(function (r) {
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
  /* ---------- Perfil ativo: "aluno" ou "equipe" (só para quem é da equipe) ----------
     No perfil de aluno, o site fica igual ao de qualquer aluno: sem painel,
     sem cursos ocultos e sem avisos de administração. */
  var CHAVE_MODO = "cfm-perfil-ativo";
  var modo = "aluno";
  try { if (localStorage.getItem(CHAVE_MODO) === "equipe") modo = "equipe"; } catch (e) { /* ok */ }
  function definirModo(novo) {
    modo = novo;
    try { localStorage.setItem(CHAVE_MODO, novo); } catch (e) { /* ok */ }
  }
  function ehEquipe() { return Conta.ativo && !!Conta.estado.usuario && Conta.temPainel(); }
  function modoEquipe() { return ehEquipe() && modo === "equipe"; }
  function nomeAreaEquipe() {
    return Conta.ehAdmin() ? "Administração" : Conta.ehConselho() ? "Conselho" : "Equipe";
  }
  // Poderes de admin no site (ver cursos ocultos, abrir tudo) só valem no perfil da equipe
  function ehAdmin() { return modoEquipe() && Conta.ehAdmin(); }
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

  /* ---------- Pré-requisitos e acesso às aulas ----------
     Regra do colegiado: a 1ª aula de cada curso é aberta a todos;
     as demais exigem conta e, se houver, o pré-requisito concluído. */
  function cursoPorId(id) { return CURSOS.filter(function (c) { return c.id === id; })[0]; }

  function prerequisitosDe(curso) {
    var cfg = configCursos[curso.id] || {};
    var ids = (cfg.prerequisitos || []).filter(function (id) { return id !== curso.id && cursoPorId(id); });
    return { cursos: ids.map(cursoPorId), modo: cfg.prerequisito_modo === "todos" ? "todos" : "qualquer" };
  }
  // Por enquanto "concluir" = marcar todas as aulas. Com a prova, passará a ser "ser aprovado".
  function concluiuCurso(curso) { return temAulas(curso) && percentual(curso) === 100; }

  // Equipe e quem recebeu liberação do admin não precisam do pré-requisito
  function semPrerequisito(curso) {
    if (!Conta.ativo || !Conta.estado.usuario) return false;
    if (Conta.ehConselho()) return true;
    if ((Conta.estado.equipe || []).some(function (e) { return e.curso_id === curso.id; })) return true;
    return (Conta.estado.dispensas || []).indexOf(curso.id) >= 0;
  }
  function prerequisitosPendentes(curso) {
    var p = prerequisitosDe(curso);
    if (!p.cursos.length || semPrerequisito(curso)) return [];
    if (p.modo === "qualquer") return p.cursos.some(concluiuCurso) ? [] : p.cursos;
    return p.cursos.filter(function (c) { return !concluiuCurso(c); });
  }
  function textoPrerequisitos(curso) {
    var p = prerequisitosDe(curso);
    var nomes = p.cursos.map(function (c) { return c.titulo; });
    if (nomes.length < 2) return nomes[0] || "";
    return nomes.slice(0, -1).join(", ") + (p.modo === "todos" ? " e " : " ou ") + nomes[nomes.length - 1];
  }

  // Pode abrir a aula de posição "indice" (0 = primeira)?
  function acessoAula(curso, indice) {
    if (!disponivel(curso)) return { ok: false, motivo: "indisponivel" };
    if (indice === 0 || !Conta.ativo || ehAdmin()) return { ok: true };
    if (!Conta.estado.pronto) return { ok: false, motivo: "carregando" };
    if (!Conta.estado.usuario) return { ok: false, motivo: "login" };
    var faltam = prerequisitosPendentes(curso);
    if (faltam.length) return { ok: false, motivo: "prerequisito", faltam: faltam };
    return { ok: true };
  }
  function proximaAula(curso) {
    var aulas = todasAulas(curso);
    for (var i = 0; i < aulas.length; i++) if (!concluida(curso.id, aulas[i].aula.id)) return aulas[i].aula;
    return aulas[0] && aulas[0].aula;
  }
  // O aluno já iniciou o curso? (abriu alguma aula ou concluiu alguma)
  function iniciou(curso) { return !!Conta.matricula(curso.id) || percentual(curso) > 0; }
  // Para onde o "Continuar" leva: a última aula visitada (se ainda não concluída) ou a próxima não concluída
  function aulaParaContinuar(curso) {
    var m = Conta.matricula(curso.id);
    if (m && m.ultima_aula_id && !concluida(curso.id, m.ultima_aula_id)) {
      var ultima = todasAulas(curso).filter(function (x) { return x.aula.id === m.ultima_aula_id; })[0];
      if (ultima) return ultima.aula;
    }
    return proximaAula(curso);
  }
  // Ao abrir uma aula, atualiza a "última aula visitada" — só para quem JÁ iniciou o curso.
  // Iniciar o curso exige confirmação do aluno (ver iniciarCurso).
  // Se a conta ainda está carregando, decide quando terminar.
  var visitaPendente = null;
  function registrarVisita(curso, aulaId) {
    if (Conta.ativo && !Conta.estado.pronto) { visitaPendente = [curso, aulaId]; return; }
    if (iniciou(curso)) Conta.registrarVisita(curso.id, aulaId);
  }

  /* ---------- Janela de confirmação (Sim / Não) ---------- */
  function confirmar(opcoes) {
    return new Promise(function (resolver) {
      var fundo = document.createElement("div");
      fundo.className = "modal-fundo";
      fundo.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">' +
          (opcoes.icone ? '<span class="modal-icone">' + opcoes.icone + "</span>" : "") +
          '<h2 id="modal-titulo">' + esc(opcoes.titulo) + "</h2>" +
          "<p>" + opcoes.texto + "</p>" +
          '<div class="modal-acoes">' +
            '<button type="button" class="botao botao-secundario" data-resposta="nao">' + esc(opcoes.nao || "Cancelar") + "</button>" +
            '<button type="button" class="botao botao-principal" data-resposta="sim">' + esc(opcoes.sim || "Sim") + "</button>" +
          "</div>" +
        "</div>";
      function fechar(resposta) {
        document.removeEventListener("keydown", tecla);
        fundo.remove();
        resolver(resposta);
      }
      function tecla(ev) { if (ev.key === "Escape") fechar(false); }
      fundo.addEventListener("click", function (ev) {
        if (ev.target === fundo) return fechar(false);
        var botao = ev.target.closest("[data-resposta]");
        if (botao) fechar(botao.getAttribute("data-resposta") === "sim");
      });
      document.addEventListener("keydown", tecla);
      document.body.appendChild(fundo);
      fundo.querySelector('[data-resposta="sim"]').focus();
    });
  }

  // Pergunta se o aluno quer iniciar o curso; só registra a matrícula se ele disser SIM
  function iniciarCurso(curso, aula) {
    var semConta = Conta.ativo && !Conta.estado.usuario;
    return confirmar({
      icone: icone.play,
      titulo: "Iniciar este curso?",
      texto: "Você está iniciando o curso <strong>" + esc(curso.titulo) + "</strong>. Ele vai aparecer em “Meus cursos” e o seu progresso passará a ser acompanhado." +
        (semConta ? "<br><br><small>Sem conta, o progresso fica salvo só neste aparelho. Crie sua conta gratuita para liberar todas as aulas.</small>" : ""),
      sim: "Sim, iniciar",
      nao: "Agora não"
    }).then(function (sim) {
      if (sim) {
        Conta.registrarVisita(curso.id, aula.id);
        aviso("Curso iniciado. Bons estudos!", "sucesso");
      }
      return sim;
    });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }

  // "BIANCA ROSSANE DE SOUZA" → "Bianca Rossane de Souza" (mesma regra do banco: supabase/05-padronizar-nomes.sql)
  var PARTICULAS = ["da", "das", "de", "di", "do", "dos", "du", "e"];
  function normalizarNome(nome) {
    var palavras = String(nome || "").trim().split(/\s+/).filter(Boolean);
    return palavras.map(function (p, i) {
      var baixa = p.toLocaleLowerCase("pt-BR");
      if (i > 0 && PARTICULAS.indexOf(baixa) >= 0) return baixa;
      if (p !== p.toLocaleUpperCase("pt-BR") && p !== baixa) return p; // misturada de propósito: mantém
      return baixa.replace(/(^|[-'’])(\S)/g, function (m, sep, letra) { return sep + letra.toLocaleUpperCase("pt-BR"); });
    }).join(" ");
  }
  // Ao sair do campo de nome, já mostra como vai ficar salvo
  function ligarCampoNome(form) {
    form.querySelectorAll('input[name="nome"], input[name="nome_completo"]').forEach(function (campo) {
      campo.addEventListener("blur", function () { campo.value = normalizarNome(campo.value); });
    });
  }

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
    capelo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/></svg>',
    escudo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    cadeado: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
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
        (textoPrerequisitos(curso) ? '<span class="card-prereq">' + icone.cadeado + "Pré-requisito: " + esc(textoPrerequisitos(curso)) + "</span>" : "") +
        '<div class="card-meta">' +
          (qtd ? "<span>" + icone.play + plural(qtd, "aula", "aulas") + "</span>" : "") +
          (curso.cargaHoraria ? "<span>" + icone.relogio + esc(curso.cargaHoraria) + "</span>" : "") +
          (curso.professor ? "<span>" + icone.pessoa + esc(curso.professor) + "</span>" : "") +
        "</div>" +
        (ok && p > 0 ? barraProgresso(p) : "") +
      "</div>" +
    "</" + tag + ">";
  }

  /* ---------- "Continue de onde parou": cursos iniciados e ainda não concluídos ---------- */
  function ultimaVisita(curso) {
    var m = Conta.matricula(curso.id);
    return m ? Date.parse(m.ultima_visita_em) : 0;
  }
  function cursosEmAndamento() {
    return CURSOS.filter(function (c) { return temAulas(c) && visivelNoSite(c) && iniciou(c) && percentual(c) < 100; })
      .sort(function (a, b) { return ultimaVisita(b) - ultimaVisita(a); });
  }
  function blocoEmAndamento() {
    var cursos = cursosEmAndamento();
    if (!cursos.length) return "";
    return '<div class="bloco-andamento">' +
      '<div class="secao-cabecalho"><span class="sobretitulo">Seus estudos</span><h2>Continue de onde parou</h2></div>' +
      '<div class="grade-andamento">' + cursos.map(function (c) {
        var aula = aulaParaContinuar(c);
        return '<a class="card-andamento" href="#/curso/' + esc(c.id) + "/aula/" + esc(aula.id) + '">' +
          '<span class="card-andamento-icone">' + icone.play + "</span>" +
          '<span class="card-andamento-info">' +
            "<strong>" + esc(c.titulo) + "</strong>" +
            "<small>Continuar em: " + esc(aula.titulo) + "</small>" +
            barraProgresso(percentual(c)) +
          "</span>" +
          '<span class="botao botao-principal botao-pequeno">Continuar</span>' +
        "</a>";
      }).join("") + "</div>" +
    "</div>";
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
        blocoEmAndamento() +
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
          '<div class="passo"><div class="passo-numero">1</div><h3>Escolha um curso</h3><p>Veja os cursos e assista à primeira aula de qualquer um deles, sem cadastro. Tudo é gratuito.</p></div>' +
          '<div class="passo"><div class="passo-numero">2</div><h3>Crie sua conta</h3><p>Com uma conta gratuita, todas as aulas são liberadas. Cada aula tem vídeo e texto de apoio.</p></div>' +
          '<div class="passo"><div class="passo-numero">3</div><h3>Acompanhe seu avanço</h3><p>Marque as aulas concluídas e continue de onde parou na próxima visita.</p></div>' +
        "</div>" +
      "</div></section>" +

      '<section class="secao" id="sobre"><div class="container sobre">' +
        '<div class="sobre-visual"><img src="assets/logo-circular.png" alt="Logo da Comunidade de Cristo Maranatha"></div>' +
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
    var indice = 0; // posição da aula no curso inteiro (a 1ª é aberta a todos)
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
          var acesso = acessoAula(curso, indice++);
          var trancada = !acesso.ok && acesso.motivo !== "carregando";
          var conteudo = (trancada
              ? '<span class="marcador trancado" title="' + (acesso.motivo === "login" ? "Crie sua conta para liberar" : "Conclua o pré-requisito para liberar") + '">' + icone.cadeado + "</span>"
              : '<span class="marcador' + (feito ? " feito" : "") + '">' + icone.check + "</span>") +
            '<span class="titulo-aula">' + esc(a.titulo) + "</span>" +
            (indice === 1 && Conta.ativo && Conta.estado.pronto && !Conta.estado.usuario ? '<span class="aula-livre">Aberta a todos</span>' : "") +
            (a.duracao ? '<span class="duracao">' + esc(a.duracao) + "</span>" : "");
          if (!ok) return '<li><div class="aula-item bloqueada">' + conteudo + "</div></li>";
          return '<li><a class="aula-item' + (a.id === aulaAtualId ? " atual" : "") + (trancada ? " trancada" : "") + '" href="#/curso/' +
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
    var comecou = iniciou(curso);
    if (comecou && p < 100) prox = aulaParaContinuar(curso);
    var textoBotao = p === 100 ? "Rever o curso" : comecou ? "Continuar de onde parei" : "Começar o curso";

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
    } else if (Conta.ativo && Conta.estado.pronto && !Conta.estado.usuario && aulas.length > 1) {
      aviso = '<div class="aviso-em-breve">' + icone.info + "<div><strong>A primeira aula é aberta a todos.</strong>" +
        '<p>Para liberar as demais, <a href="#/criar-conta">crie sua conta gratuita</a> ou <a href="#/entrar">entre</a>. Leva menos de um minuto.</p></div></div>';
    } else if (Conta.estado.usuario && prerequisitosPendentes(curso).length && !ehAdmin()) {
      aviso = '<div class="aviso-em-breve">' + icone.info + "<div><strong>Este curso tem pré-requisito.</strong>" +
        "<p>Você já pode assistir à primeira aula. As demais serão liberadas quando você concluir " +
        (prerequisitosDe(curso).cursos.length > 1 ? (prerequisitosDe(curso).modo === "todos" ? "todos estes cursos" : "um destes cursos") : "o curso") +
        ": <strong>" + esc(textoPrerequisitos(curso)) + "</strong>.</p></div></div>";
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
            ? '<div class="curso-acoes"><a class="botao botao-claro" id="botao-comecar" href="#/curso/' + esc(curso.id) + "/aula/" + esc(prox.id) + '">' + icone.play + textoBotao + "</a>" + barraProgresso(p) + "</div>"
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
          cartaoPrerequisitos(curso) +
          (curso.paraQuem || curso.voceVaiAprender
            ? '<div class="cartao">' +
                (curso.voceVaiAprender ? "<h3>O que você vai aprender</h3>" + listaItens(curso.voceVaiAprender) : "") +
                (curso.paraQuem ? '<h3 style="margin-top:22px">Para quem é</h3><p class="bloco-texto" style="font-size:15px;margin:0">' + esc(curso.paraQuem) + "</p>" : "") +
              "</div>"
            : "") +
        "</aside>" +
      "</div>";

    // Quem ainda não iniciou precisa confirmar antes de começar
    var botaoComecar = document.getElementById("botao-comecar");
    if (botaoComecar && !comecou) {
      botaoComecar.addEventListener("click", function (ev) {
        ev.preventDefault();
        iniciarCurso(curso, prox).then(function (sim) { if (sim) irPara(botaoComecar.getAttribute("href")); });
      });
    }
    window.scrollTo(0, 0);
  }

  function cartaoPrerequisitos(curso) {
    var p = prerequisitosDe(curso);
    if (!p.cursos.length) return "";
    var logado = Conta.estado.usuario;
    var liberado = (Conta.estado.dispensas || []).indexOf(curso.id) >= 0;
    return '<div class="cartao cartao-prereq"><h3>Pré-requisito</h3>' +
      '<p class="suave" style="font-size:14px;margin:0 0 10px">' +
        (p.cursos.length > 1 ? (p.modo === "todos" ? "Conclua todos estes cursos:" : "Conclua pelo menos um destes cursos:") : "Conclua antes o curso:") +
      "</p>" +
      '<ul class="lista-prereq">' + p.cursos.map(function (c) {
        var feito = logado && concluiuCurso(c);
        return "<li>" + '<span class="marcador' + (feito ? " feito" : "") + '">' + icone.check + "</span>" +
          (temAulas(c) && visivelNoSite(c) ? '<a href="#/curso/' + esc(c.id) + '">' + esc(c.titulo) + "</a>" : "<span>" + esc(c.titulo) + "</span>") +
          (feito ? '<small class="ok">concluído</small>' : "") + "</li>";
      }).join("") + "</ul>" +
      (logado && liberado
        ? '<p class="dica-login" style="margin:12px 0 0">Você recebeu liberação para fazer este curso.</p>'
        : "") +
      '<p class="suave" style="font-size:13px;margin:12px 0 0">A primeira aula é aberta a todos. Já fez algum desses cursos presencialmente? Fale com a secretaria do CFM.</p>' +
    "</div>";
  }

  // Tela de aula trancada: pede cadastro ou mostra o pré-requisito que falta
  function aulaTrancada(curso, aulas, i, acesso) {
    var aula = aulas[i].aula;
    var corpo;
    if (acesso.motivo === "login") {
      corpo = "<h2>Esta aula é para alunos cadastrados</h2>" +
        "<p>A primeira aula de cada curso é aberta a todos. Para continuar estudando, crie sua conta gratuita. Leva menos de um minuto, e seu progresso fica salvo em qualquer aparelho.</p>" +
        '<div class="hero-acoes"><a class="botao botao-principal" href="#/criar-conta">Criar minha conta</a>' +
        '<a class="botao botao-secundario" href="#/entrar">Já tenho conta</a></div>';
    } else {
      var p = prerequisitosDe(curso);
      corpo = "<h2>Antes, conclua o pré-requisito</h2>" +
        "<p>Para liberar as aulas de <strong>" + esc(curso.titulo) + "</strong>, conclua " +
        (p.cursos.length > 1 ? (p.modo === "todos" ? "todos estes cursos" : "um destes cursos") : "o curso") + ":</p>" +
        '<ul class="lista-prereq">' + acesso.faltam.map(function (c) {
          return "<li>" + '<span class="marcador trancado">' + icone.cadeado + "</span>" +
            (temAulas(c) && visivelNoSite(c) ? '<a href="#/curso/' + esc(c.id) + '">' + esc(c.titulo) + "</a>" : "<span>" + esc(c.titulo) + " (em breve)</span>") + "</li>";
        }).join("") + "</ul>" +
        '<p class="suave">Concluir um curso = marcar todas as aulas dele como concluídas. Já fez presencialmente? Fale com a secretaria do CFM para liberar seu acesso.</p>';
    }
    app.innerHTML =
      '<div class="container aula-layout">' +
        "<div>" +
          '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <a href="#/curso/' + esc(curso.id) + '">' + esc(curso.titulo) + "</a> › <span>Aula " + (i + 1) + "</span></nav>" +
          '<div class="video"><div class="video-vazio video-trancado">' + icone.chama +
            '<span class="cadeado-grande">' + icone.cadeado + "</span><strong>" + esc(aula.titulo) + "</strong><span>Aula " + (i + 1) + " de " + aulas.length + "</span></div></div>" +
          '<div class="cartao aula-trancada">' + corpo + "</div>" +
        "</div>" +
        '<aside class="aula-lateral"><div class="cartao">' +
          "<h3>" + esc(curso.titulo) + "</h3>" + barraProgresso(percentual(curso)) + listaModulos(curso, aula.id, true) +
        "</div></aside>" +
      "</div>";
    window.scrollTo(0, 0);
  }

  function cursoIndisponivel() {
    app.innerHTML = '<div class="vazio"><img src="assets/simbolo.png" alt=""><h1>Curso indisponível</h1>' +
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

    var acesso = acessoAula(curso, i);
    if (!acesso.ok) return acesso.motivo === "carregando" ? carregando() : aulaTrancada(curso, aulas, i, acesso);

    registrarVisita(curso, aulas[i].aula.id);

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
          '<div id="faixa-iniciar"></div>' +
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

      // Ainda não iniciou: pode ver a aula, mas nada é registrado até confirmar
      var faixa = document.getElementById("faixa-iniciar");
      var mostrarFaixa = !iniciou(curso) && (!Conta.ativo || Conta.estado.pronto);
      faixa.innerHTML = mostrarFaixa
        ? '<div class="faixa-iniciar">' + icone.info +
            "<span>Você está conhecendo este curso. Para acompanhar o seu progresso, inicie o curso.</span>" +
            '<button type="button" class="botao botao-principal botao-pequeno" id="botao-iniciar-curso">Iniciar curso</button>' +
          "</div>"
        : "";
      if (mostrarFaixa) {
        document.getElementById("botao-iniciar-curso").addEventListener("click", function () {
          iniciarCurso(curso, aula).then(function (sim) { if (sim) atualizar(); });
        });
      }

      document.getElementById("lateral").innerHTML =
        "<h3>" + esc(curso.titulo) + "</h3>" + barraProgresso(percentual(curso)) +
        (Conta.ativo && Conta.estado.pronto && !Conta.estado.usuario
          ? '<p class="dica-login"><a href="#/criar-conta">Crie sua conta gratuita</a> para liberar todas as aulas e salvar seu progresso.</p>'
          : "") +
        listaModulos(curso, aula.id, true);
    }
    atualizar();
    atualizarPagina = atualizar;
    document.getElementById("botao-concluir").addEventListener("click", function () {
      if (iniciou(curso)) {
        alternarConcluida(curso.id, aula.id);
        return atualizar();
      }
      // Concluir uma aula sem ter iniciado: pergunta antes
      iniciarCurso(curso, aula).then(function (sim) {
        if (!sim) return;
        alternarConcluida(curso.id, aula.id);
        atualizar();
      });
    });
    window.scrollTo(0, 0);
  }

  function naoEncontrado() {
    app.innerHTML = '<div class="vazio"><img src="assets/simbolo.png" alt=""><h1>Página não encontrada</h1>' +
      '<p>O endereço pode estar errado ou o conteúdo mudou de lugar.</p><a class="botao botao-principal" href="#/">Voltar ao início</a></div>';
    window.scrollTo(0, 0);
  }

  function carregando() {
    app.innerHTML = '<div class="vazio"><img src="assets/simbolo.png" alt=""><p>Carregando…</p></div>';
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
      (ehEquipe()
        ? '<nav class="troca-perfil" aria-label="Perfil ativo">' +
            '<a href="#/minha-conta" class="' + (modo === "aluno" ? "ativo" : "") + '" title="Perfil de aluno">' + icone.capelo + "<span>Aluno</span></a>" +
            '<a href="#/painel" class="' + (modo === "equipe" ? "ativo" : "") + '" title="Perfil ' + esc(nomeAreaEquipe()) + '">' + icone.escudo + "<span>" + esc(nomeAreaEquipe()) + "</span></a>" +
          "</nav>"
        : "") +
      '<a class="avatar-topo' + (modoEquipe() ? " avatar-equipe" : "") + '" href="' + (modoEquipe() ? "#/minha-conta/equipe" : "#/minha-conta") + '" title="Minha conta">' +
      '<span class="avatar">' + esc(primeiro.charAt(0).toUpperCase()) + "</span>" +
      '<span class="avatar-nome">' + esc(primeiro) + "</span></a>";
  }

  /* ---------- Entrar / Criar conta / Recuperar senha ---------- */
  function cabecalhoConta(titulo, subtitulo) {
    return '<img class="cartao-conta-logo" src="assets/simbolo.png" alt="">' +
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
    ligarCampoNome(form);
    ligarFormulario(form, function (d) {
      var email = String(d.get("email") || "").trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw erroValidacao("Digite um e-mail válido.");

      if (modo === "criar") {
        var nome = normalizarNome(d.get("nome"));
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
    ligarCampoNome(form);
    var outra = form.querySelector('[name="outra_igreja"]');
    form.querySelectorAll('[name="tipo_igreja"]').forEach(function (r) {
      r.addEventListener("change", function () {
        outra.hidden = r.value !== "outra" || !r.checked;
        if (!outra.hidden) outra.focus();
      });
    });
    ligarFormulario(form, function (d) {
      var dados = {
        nome_completo: normalizarNome(d.get("nome_completo")),
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
  function abasPerfil(aba) {
    if (!ehEquipe()) return "";
    return '<nav class="abas-perfil container" aria-label="Seus perfis">' +
      '<a href="#/minha-conta" class="' + (aba === "aluno" ? "ativa" : "") + '">' + icone.capelo +
        "<span><strong>Perfil de aluno</strong><small>Seus cursos e seus dados</small></span></a>" +
      '<a href="#/minha-conta/equipe" class="' + (aba === "equipe" ? "ativa" : "") + '">' + icone.escudo +
        "<span><strong>Perfil " + esc(nomeAreaEquipe()) + "</strong><small>Painel e ferramentas da equipe</small></span></a>" +
    "</nav>";
  }

  function cartaoConta(u) {
    var comGoogle = (u.app_metadata && u.app_metadata.provider) === "google";
    return '<div class="cartao">' +
      "<h3>Sua conta</h3>" +
      '<p class="bloco-texto" style="font-size:15px">' + esc(u.email) + "<br><small>" +
        (comGoogle ? "Você entra com sua conta Google." : "Você entra com e-mail e senha.") + "</small></p>" +
      '<button class="botao botao-secundario botao-largo" type="button" id="botao-sair">Sair da conta</button>' +
    "</div>";
  }
  function ligarSair() {
    document.getElementById("botao-sair").addEventListener("click", function () {
      Conta.sair().catch(function (e) { aviso(traduzirErro(e), "erro"); });
    });
  }

  function paginaMinhaConta(aba) {
    if (!exigirLogin()) return;
    if (aba === "equipe") {
      if (!Conta.estado.perfil) return carregando();
      if (!ehEquipe()) return irPara("#/minha-conta");
      return paginaPerfilEquipe();
    }
    var u = Conta.estado.usuario;
    var p = Conta.estado.perfil || {};
    var primeiro = (p.nome_completo || "").split(" ")[0];

    // Cursos iniciados, do visitado mais recentemente para o mais antigo
    var emAndamento = CURSOS.filter(function (c) { return temAulas(c) && visivelNoSite(c) && iniciou(c); })
      .sort(function (a, b) { return ultimaVisita(b) - ultimaVisita(a); });
    var meusCursos = emAndamento.length
      ? emAndamento.map(function (c) {
          var pc = percentual(c);
          var prox = aulaParaContinuar(c);
          var m = Conta.matricula(c.id);
          return '<div class="meu-curso"><div class="meu-curso-info"><h3>' + esc(c.titulo) + "</h3>" + barraProgresso(pc) +
            (m ? '<small class="suave">Iniciado em ' + dataCurta(m.iniciado_em) + "</small>" : "") + "</div>" +
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
      abasPerfil("aluno") +
      '<div class="container curso-corpo">' +
        "<div>" +
          "<h2>Meus cursos</h2>" + '<div class="meus-cursos">' + meusCursos + "</div>" +
          '<h2 style="margin-top:44px">Meus dados</h2>' +
          '<div class="cartao">' + formPerfil(p, "Salvar alterações") + "</div>" +
        "</div>" +
        "<aside>" +
          cartaoConta(u) +
          '<div class="cartao" style="margin-top:16px">' +
            "<h3>Seus dados e privacidade</h3>" +
            '<p class="bloco-texto" style="font-size:14px">Veja como usamos seus dados na <a href="#/privacidade">Política de Privacidade</a>.</p>' +
            '<button class="botao botao-perigo botao-largo" type="button" id="botao-excluir">Excluir minha conta</button>' +
          "</div>" +
        "</aside>" +
      "</div>";

    ligarFormPerfil(function () { aviso("Dados salvos.", "sucesso"); });
    ligarSair();
    document.getElementById("botao-excluir").addEventListener("click", function () {
      var ok = window.confirm("Tem certeza? Sua conta, seus dados e seu progresso serão apagados para sempre. Isso não pode ser desfeito.");
      if (!ok) return;
      Conta.excluirConta()
        .then(function () { aviso("Sua conta foi excluída.", "sucesso"); })
        .catch(function (e) { aviso(traduzirErro(e), "erro"); });
    });
    window.scrollTo(0, 0);
  }

  function listaAcessos() {
    var partes = [];
    if (Conta.ehAdmin()) partes.push("Administrador(a) da plataforma");
    else if (Conta.ehConselho()) partes.push("Membro do conselho geral");
    (Conta.estado.equipe || []).forEach(function (e) {
      var c = cursoPorId(e.curso_id);
      partes.push((e.funcao === "professor" ? "Professor(a)" : "Tutor(a)") + " em " + (c ? c.titulo : e.curso_id));
    });
    return partes;
  }

  /* ---------- Perfil da equipe (conselho / administração / professores e tutores) ---------- */
  function paginaPerfilEquipe() {
    var u = Conta.estado.usuario;
    var p = Conta.estado.perfil || {};
    var primeiro = (p.nome_completo || "").split(" ")[0];
    var atalhos = [
      { href: "#/painel", icone: icone.pessoa, titulo: Conta.ehConselho() ? "Pessoas" : "Meus alunos",
        texto: Conta.ehConselho() ? "Todos os cadastrados, com contato, progresso e planilha." : "Alunos dos cursos em que você atua e o progresso de cada um." }
    ];
    if (Conta.ehConselho()) atalhos.push({ href: "#/painel/equipe", icone: icone.escudo, titulo: "Equipe", texto: "Quem é da administração, do conselho e os professores e tutores de cada curso." });
    if (Conta.ehAdmin()) atalhos.push({ href: "#/painel/cursos", icone: icone.livro, titulo: "Cursos", texto: "Mostrar ou esconder cursos, datas de abertura e pré-requisitos." });

    app.innerHTML =
      '<section class="curso-topo topo-equipe">' + chamaHero() +
        '<div class="curso-topo-inner">' +
          '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <span>Perfil ' + esc(nomeAreaEquipe()) + "</span></nav>" +
          "<h1>Olá" + (primeiro ? ", " + esc(primeiro) : "") + "!</h1>" +
          '<p class="lead">Esta é a sua área de ' + esc(nomeAreaEquipe().toLowerCase()) + ". Para estudar, use o perfil de aluno.</p>" +
        "</div>" +
      "</section>" +
      abasPerfil("equipe") +
      '<div class="container curso-corpo">' +
        "<div>" +
          "<h2>Ferramentas</h2>" +
          '<div class="atalhos-equipe">' + atalhos.map(function (a) {
            return '<a class="atalho" href="' + a.href + '"><span class="atalho-icone">' + a.icone + "</span>" +
              "<span><strong>" + esc(a.titulo) + "</strong><small>" + esc(a.texto) + "</small></span>" + icone.direita + "</a>";
          }).join("") + "</div>" +
          '<div class="aviso-em-breve" style="margin-top:28px">' + icone.info +
            "<div><strong>Dois perfis, uma conta</strong><p>No <strong>perfil de aluno</strong>, o site aparece exatamente como os alunos veem: sem painel, sem cursos ocultos e sem avisos da administração. " +
            "Use-o para fazer os cursos e também para conferir como está a experiência dos alunos. Você troca de perfil a qualquer momento pelo botão no topo da página.</p></div>" +
          "</div>" +
        "</div>" +
        "<aside>" +
          '<div class="cartao cartao-acessos"><h3>Seu acesso</h3><ul class="lista-simples">' +
            listaAcessos().map(function (t) { return "<li>" + icone.escudo + "<span>" + esc(t) + "</span></li>"; }).join("") +
          "</ul></div>" +
          '<div style="margin-top:16px">' + cartaoConta(u) + "</div>" +
        "</aside>" +
      "</div>";
    ligarSair();
    window.scrollTo(0, 0);
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

    // Trocar de perfil (aluno / equipe) acontece pelo endereço aberto
    if (partes[0] === "painel" || (partes[0] === "minha-conta" && partes[1] === "equipe")) definirModo("equipe");
    else if (partes[0] === "minha-conta") definirModo("aluno");

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
    else if (partes[0] === "minha-conta") paginaMinhaConta(partes[1]);
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
      if (visitaPendente) {
        var v = visitaPendente;
        visitaPendente = null;
        if (iniciou(v[0])) Conta.registrarVisita(v[0].id, v[1]);
      }
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
    temAulas: temAulas, situacao: situacao, dataCurta: dataCurta, textoPrerequisitos: textoPrerequisitos,
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
