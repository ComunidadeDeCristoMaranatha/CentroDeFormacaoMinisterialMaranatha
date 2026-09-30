/* ============================================================
   Interação nas aulas: anotações pessoais e dúvidas (fórum)
   - Anotações: particulares, salvam sozinhas enquanto o aluno escreve.
   - Dúvidas: qualquer aluno com conta pergunta; só professor/tutor
     do curso responde. Tudo visível para quem abre a aula.
   As regras de quem pode o quê ficam no banco (supabase/07-...sql).
   ============================================================ */
(function () {
  "use strict";

  var C = window.CFM;
  var Conta = window.Conta;
  var esc = C.esc;

  var ultimaMontagem = null;   // para remontar quando a conta terminar de carregar
  var salvarAgora = null;      // salva a anotação pendente (ao trocar de página)

  function texto(t) { return esc(t).replace(/\n/g, "<br>"); }
  function dataHora(d) {
    return new Date(d).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function hora(d) {
    return new Date(d).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" });
  }
  function logado() { return Conta.ativo && !!Conta.estado.usuario; }
  function podeResponder(curso) {
    return logado() && (Conta.estado.equipe || []).some(function (e) { return e.curso_id === curso.id; });
  }
  function podeModerar() { return logado() && Conta.ehConselho(); }
  function convite(acao) {
    return '<p class="suave">Para ' + acao + ', <a href="#/entrar">entre na sua conta</a> ou <a href="#/criar-conta">crie uma conta gratuita</a>.</p>';
  }

  /* ============================================================
     ANOTAÇÕES
     ============================================================ */
  function montarAnotacoes(el, curso, aula) {
    el.innerHTML =
      '<details class="cartao bloco-recolhivel anotacoes">' +
        "<summary>" + C.icone.livro + "<strong>Minhas anotações</strong>" +
          '<small class="suave resumo-recolhivel" data-resumo>Só você vê</small>' + C.icone.seta + "</summary>" +
        '<div class="recolhivel-corpo"></div>' +
      "</details>";
    var corpo = el.querySelector(".recolhivel-corpo");
    var resumo = el.querySelector("[data-resumo]");

    if (!logado()) { corpo.innerHTML = convite("fazer anotações nas aulas"); return; }

    corpo.innerHTML =
      '<textarea class="anotacao-texto" maxlength="5000" rows="6" placeholder="Escreva aqui o que você aprendeu nesta aula: versículos, reflexões, perguntas para pensar…" disabled>Carregando…</textarea>' +
      '<small class="anotacao-status suave">Salvo automaticamente. Só você vê suas anotações.</small>';
    var campo = corpo.querySelector("textarea");
    var status = corpo.querySelector(".anotacao-status");
    var cl = Conta.cliente;
    var chave = { usuario_id: Conta.estado.usuario.id, curso_id: curso.id, aula_id: aula.id };
    var salvo = "";
    var espera = null;

    cl.from("anotacoes").select("texto, atualizado_em").match(chave).maybeSingle().then(function (r) {
      if (r.error) { corpo.innerHTML = '<p class="suave">As anotações ainda não estão disponíveis.</p>'; console.error(r.error); return; }
      salvo = r.data ? r.data.texto : "";
      campo.value = salvo;
      campo.disabled = false;
      if (r.data) {
        resumo.textContent = "Anotação salva · " + C.dataCurta(r.data.atualizado_em);
        status.textContent = "Última alteração em " + dataHora(r.data.atualizado_em) + ". Só você vê suas anotações.";
      }
    });

    function salvar() {
      clearTimeout(espera);
      espera = null;
      var atual = campo.value;
      if (atual === salvo) return;
      status.textContent = "Salvando…";
      var pedido = atual.trim()
        ? cl.from("anotacoes").upsert(Object.assign({ texto: atual, atualizado_em: new Date().toISOString() }, chave), { onConflict: "usuario_id,curso_id,aula_id" })
        : cl.from("anotacoes").delete().match(chave);
      pedido.then(function (r) {
        if (r.error) { status.textContent = "Não foi possível salvar. Verifique sua internet."; console.error(r.error); return; }
        salvo = atual;
        var agora = new Date().toISOString();
        status.textContent = atual.trim() ? "Salvo às " + hora(agora) + ". Só você vê suas anotações." : "Anotação apagada.";
        resumo.textContent = atual.trim() ? "Anotação salva · " + C.dataCurta(agora) : "Só você vê";
      });
    }
    campo.addEventListener("input", function () {
      status.textContent = "Escrevendo…";
      clearTimeout(espera);
      espera = setTimeout(salvar, 1200);
    });
    campo.addEventListener("blur", salvar);
    salvarAgora = function () { if (espera) salvar(); };
  }

  // Lista de todas as anotações do aluno (em "Minha conta")
  function listarAnotacoes(el) {
    if (!logado()) { el.innerHTML = ""; return; }
    el.innerHTML = '<p class="suave">Carregando…</p>';
    Conta.cliente.from("anotacoes").select("curso_id, aula_id, texto, atualizado_em").order("atualizado_em", { ascending: false }).then(function (r) {
      if (r.error) { el.innerHTML = '<p class="suave">As anotações ainda não estão disponíveis.</p>'; console.error(r.error); return; }
      if (!r.data.length) {
        el.innerHTML = '<p class="bloco-texto">Você ainda não fez anotações. Elas aparecem aqui quando você escrever em "Minhas anotações", dentro de uma aula.</p>';
        return;
      }
      var porCurso = {};
      r.data.forEach(function (n) { (porCurso[n.curso_id] = porCurso[n.curso_id] || []).push(n); });
      el.innerHTML = C.cursos.filter(function (c) { return porCurso[c.id]; }).map(function (c) {
        var aulas = C.todasAulas(c);
        return '<details class="cartao bloco-recolhivel grupo-anotacoes" open>' +
          "<summary><strong>" + esc(c.titulo) + "</strong>" +
            '<small class="suave resumo-recolhivel">' + C.plural(porCurso[c.id].length, "anotação", "anotações") + "</small>" + C.icone.seta + "</summary>" +
          '<div class="recolhivel-corpo">' + porCurso[c.id].map(function (n) {
            var a = aulas.filter(function (x) { return x.aula.id === n.aula_id; })[0];
            var titulo = a ? a.aula.titulo : n.aula_id;
            var trecho = n.texto.length > 280 ? n.texto.slice(0, 280) + "…" : n.texto;
            return '<div class="anotacao-item">' +
              '<div class="anotacao-item-topo"><a href="#/curso/' + esc(c.id) + "/aula/" + esc(n.aula_id) + '">' + esc(titulo) + "</a>" +
                '<small class="suave">' + C.dataCurta(n.atualizado_em) + "</small></div>" +
              "<p>" + texto(trecho) + "</p>" +
            "</div>";
          }).join("") + "</div>" +
        "</details>";
      }).join("");
    });
  }

  /* ============================================================
     DÚVIDAS (fórum da aula)
     ============================================================ */
  var FUNCAO = { professor: "Professor(a)", tutor: "Tutor(a)" };

  function montarDuvidas(el, curso, aula, abrir) {
    el.innerHTML =
      '<details class="cartao bloco-recolhivel forum" id="forum"' + (abrir ? " open" : "") + ">" +
        "<summary>" + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          "<strong>Dúvidas desta aula</strong>" +
          '<small class="suave resumo-recolhivel" data-resumo>Carregando…</small>' + C.icone.seta + "</summary>" +
        '<div class="recolhivel-corpo">' +
          '<p class="suave forum-explica">As perguntas e respostas ficam visíveis para todos que assistem a esta aula. Quem responde são o professor e os tutores do curso.</p>' +
          '<div class="forum-perguntar"></div>' +
          '<div class="forum-lista"></div>' +
        "</div>" +
      "</details>";
    var resumo = el.querySelector("[data-resumo]");
    var perguntar = el.querySelector(".forum-perguntar");
    var lista = el.querySelector(".forum-lista");

    // Formulário para perguntar
    if (!logado()) {
      perguntar.innerHTML = convite("enviar uma dúvida");
    } else {
      perguntar.innerHTML =
        '<form class="formulario forum-form">' +
          '<textarea name="texto" rows="3" maxlength="2000" required placeholder="Escreva sua dúvida sobre esta aula…"></textarea>' +
          '<div class="forum-form-acoes"><button class="botao botao-principal botao-pequeno" type="submit">Enviar pergunta</button></div>' +
          '<div class="mensagem" role="alert"></div>' +
        "</form>";
      var form = perguntar.querySelector("form");
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var campo = form.querySelector("textarea");
        var msg = form.querySelector(".mensagem");
        var valor = campo.value.trim();
        msg.className = "mensagem"; msg.textContent = "";
        if (valor.length < 3) { msg.className = "mensagem erro"; msg.textContent = "Escreva sua dúvida (pelo menos algumas palavras)."; return; }
        var botao = form.querySelector("button");
        botao.disabled = true;
        Conta.cliente.from("duvidas").insert({ curso_id: curso.id, aula_id: aula.id, texto: valor }).then(function (r) {
          botao.disabled = false;
          if (r.error) { msg.className = "mensagem erro"; msg.textContent = C.traduzirErro(r.error); return; }
          campo.value = "";
          C.aviso("Pergunta enviada. O professor ou um tutor vai responder aqui.", "sucesso");
          carregar();
        });
      });
    }

    function carregar() {
      Conta.cliente.from("duvidas")
        .select("id, autor_id, autor_nome, texto, criado_em, respostas(id, autor_id, autor_nome, autor_funcao, texto, criado_em)")
        .match({ curso_id: curso.id, aula_id: aula.id })
        .order("criado_em", { ascending: false })
        .then(function (r) {
          if (r.error) { console.error(r.error); el.innerHTML = ""; return; } // tabelas ainda não criadas: esconde o fórum
          var duvidas = r.data;
          var semResposta = duvidas.filter(function (d) { return !d.respostas.length; }).length;
          resumo.textContent = duvidas.length
            ? C.plural(duvidas.length, "pergunta", "perguntas") + (semResposta ? " · " + semResposta + " sem resposta" : " · todas respondidas")
            : "Nenhuma pergunta ainda";
          lista.innerHTML = duvidas.length
            ? duvidas.map(function (d) { return htmlDuvida(d, curso); }).join("")
            : '<p class="suave forum-vazio">Ninguém perguntou nada ainda. Ficou com alguma dúvida? Pergunte acima.</p>';
          ligarAcoes();
        });
    }

    function htmlDuvida(d, curso) {
      var eu = logado() ? Conta.estado.usuario.id : null;
      var respostas = d.respostas.slice().sort(function (a, b) { return Date.parse(a.criado_em) - Date.parse(b.criado_em); });
      return '<article class="duvida">' +
        '<header class="duvida-topo"><span class="avatar">' + esc((d.autor_nome || "?").charAt(0)) + "</span>" +
          "<div><strong>" + esc(d.autor_nome || "Aluno") + "</strong><small class=\"suave\">" + dataHora(d.criado_em) + "</small></div>" +
          (d.autor_id === eu || podeModerar() ? '<button type="button" class="botao-remover" data-apagar-duvida="' + d.id + '">Apagar</button>' : "") +
        "</header>" +
        '<p class="duvida-texto">' + texto(d.texto) + "</p>" +
        (respostas.length
          ? '<div class="respostas">' + respostas.map(function (resp) {
              return '<div class="resposta">' +
                '<header class="duvida-topo"><span class="avatar avatar-equipe-resposta">' + esc((resp.autor_nome || "?").charAt(0)) + "</span>" +
                  "<div><strong>" + esc(resp.autor_nome || "Equipe") + "</strong>" +
                    (resp.autor_funcao ? ' <span class="selo-papel papel-' + esc(resp.autor_funcao) + '">' + esc(FUNCAO[resp.autor_funcao] || resp.autor_funcao) + "</span>" : "") +
                    '<small class="suave">' + dataHora(resp.criado_em) + "</small></div>" +
                  (resp.autor_id === eu || podeModerar() ? '<button type="button" class="botao-remover" data-apagar-resposta="' + resp.id + '">Apagar</button>' : "") +
                "</header>" +
                '<p class="duvida-texto">' + texto(resp.texto) + "</p>" +
              "</div>";
            }).join("") + "</div>"
          : '<p class="aguardando">Aguardando resposta do professor ou de um tutor.</p>') +
        (podeResponder(curso)
          ? '<form class="formulario responder" data-duvida="' + d.id + '">' +
              '<textarea name="texto" rows="2" maxlength="3000" placeholder="Escreva sua resposta…"></textarea>' +
              '<div class="forum-form-acoes"><button class="botao botao-secundario botao-pequeno" type="submit">Responder</button></div>' +
            "</form>"
          : "") +
      "</article>";
    }

    function ligarAcoes() {
      lista.querySelectorAll("form.responder").forEach(function (f) {
        f.addEventListener("submit", function (ev) {
          ev.preventDefault();
          var campo = f.querySelector("textarea");
          if (!campo.value.trim()) return;
          var botao = f.querySelector("button");
          botao.disabled = true;
          Conta.cliente.from("respostas").insert({ duvida_id: f.getAttribute("data-duvida"), texto: campo.value.trim() }).then(function (r) {
            botao.disabled = false;
            if (r.error) { C.aviso(C.traduzirErro(r.error), "erro"); return; }
            C.aviso("Resposta publicada.", "sucesso");
            carregar();
          });
        });
      });
      lista.querySelectorAll("[data-apagar-duvida]").forEach(function (b) {
        b.addEventListener("click", function () {
          C.confirmar({ titulo: "Apagar esta pergunta?", texto: "A pergunta e as respostas dela serão apagadas para todos.", sim: "Apagar", nao: "Cancelar" }).then(function (sim) {
            if (!sim) return;
            Conta.cliente.from("duvidas").delete().eq("id", b.getAttribute("data-apagar-duvida")).then(function (r) {
              if (r.error) return C.aviso(C.traduzirErro(r.error), "erro");
              carregar();
            });
          });
        });
      });
      lista.querySelectorAll("[data-apagar-resposta]").forEach(function (b) {
        b.addEventListener("click", function () {
          C.confirmar({ titulo: "Apagar esta resposta?", texto: "A resposta será apagada para todos.", sim: "Apagar", nao: "Cancelar" }).then(function (sim) {
            if (!sim) return;
            Conta.cliente.from("respostas").delete().eq("id", b.getAttribute("data-apagar-resposta")).then(function (r) {
              if (r.error) return C.aviso(C.traduzirErro(r.error), "erro");
              carregar();
            });
          });
        });
      });
    }

    carregar();
    if (abrir) setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 100);
  }

  /* ============================================================
     Montagem na página da aula
     ============================================================ */
  function montarNaAula(el, curso, aula, abrirDuvidas) {
    if (!Conta.ativo || !el) return;
    ultimaMontagem = { el: el, curso: curso, aula: aula, abrir: abrirDuvidas };
    salvarAgora = null;
    el.innerHTML = '<div id="bloco-anotacoes"></div><div id="bloco-duvidas"></div>';
    montarAnotacoes(el.querySelector("#bloco-anotacoes"), curso, aula);
    montarDuvidas(el.querySelector("#bloco-duvidas"), curso, aula, abrirDuvidas);
  }

  window.Interacao = {
    montarNaAula: montarNaAula,
    // A conta terminou de carregar: redesenha (ex.: mostrar o campo de anotação para quem está logado)
    remontar: function () {
      var m = ultimaMontagem;
      if (m && document.body.contains(m.el)) montarNaAula(m.el, m.curso, m.aula, m.abrir);
    },
    salvarPendente: function () { if (salvarAgora) salvarAgora(); },
    listarAnotacoes: listarAnotacoes
  };
})();
