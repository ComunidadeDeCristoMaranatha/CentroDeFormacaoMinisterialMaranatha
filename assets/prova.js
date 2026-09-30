/* ============================================================
   Prova final e certificado
   - A correção e as regras ficam no banco (supabase/09-...sql):
     o navegador nunca recebe o gabarito.
   - Endereços: #/curso/<id>/prova · #/certificado/<código> · #/validar
   ============================================================ */
(function () {
  "use strict";

  var C = window.CFM;
  var Conta = window.Conta;
  var esc = C.esc;
  var app = C.app;

  function msgErro(e) {
    if (e && e.code === "P0001") return e.message; // mensagens escritas no banco, já em português
    return C.traduzirErro(e);
  }
  function cabecalho(curso, subtitulo) {
    return '<section class="curso-topo">' + C.chamaHero() +
      '<div class="curso-topo-inner">' +
        '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <a href="#/curso/' + esc(curso.id) + '">' + esc(curso.titulo) + "</a> › <span>Prova final</span></nav>" +
        "<h1>Prova final</h1><p class=\"lead\">" + subtitulo + "</p>" +
      "</div></section>";
  }
  function moldura(curso, subtitulo, corpo) {
    app.innerHTML = cabecalho(curso, subtitulo) + '<div class="container prova-corpo"><div class="cartao prova-cartao">' + corpo + "</div></div>";
    window.scrollTo(0, 0);
  }

  /* ---------- Página da prova ---------- */
  function pagina(curso) {
    if (!C.exigirLogin()) return;
    if (!Conta.estado.perfil) return C.carregando();
    var p = C.percentual(curso);
    var ehEquipe = Conta.ehConselho() || (Conta.estado.equipe || []).some(function (e) { return e.curso_id === curso.id; });

    if (p < 100 && !ehEquipe) {
      return moldura(curso, esc(curso.titulo),
        "<h2>Conclua o curso para liberar a prova</h2>" +
        "<p>A prova final fica disponível depois que você marcar <strong>todas as aulas</strong> como concluídas.</p>" +
        C.barraProgresso(p) +
        '<div class="prova-acoes"><a class="botao botao-principal" href="#/curso/' + esc(curso.id) + '">Voltar ao curso</a></div>');
    }

    moldura(curso, esc(curso.titulo), '<p class="suave">Carregando…</p>');
    Conta.cliente.rpc("prova_situacao", { p_curso: curso.id }).then(function (r) {
      if (r.error) return moldura(curso, esc(curso.titulo), '<div class="mensagem erro">' + esc(msgErro(r.error)) + "</div>");
      mostrarSituacao(curso, r.data);
    });
  }

  function mostrarSituacao(curso, s) {
    if (!s.existe) {
      return moldura(curso, esc(curso.titulo), "<h2>Este curso ainda não tem prova</h2><p>A prova final está sendo preparada. Volte em breve.</p>");
    }
    if (s.aprovado) {
      return moldura(curso, esc(curso.titulo),
        '<div class="prova-resultado aprovado"><span class="prova-selo">✓</span><h2>Você foi aprovado(a)!</h2>' +
        "<p>Parabéns por concluir o curso <strong>" + esc(curso.titulo) + "</strong>.</p></div>" +
        (s.certificado ? '<div class="prova-acoes"><a class="botao botao-principal" href="#/certificado/' + esc(s.certificado) + '">Ver meu certificado</a></div>' : ""));
    }
    if (!s.email_verificado) return validarEmail(curso);
    if (s.em_aberto) {
      moldura(curso, esc(curso.titulo),
        "<h2>Você tem uma prova em andamento</h2><p>Continue de onde parou. As respostas que você já marcou neste aparelho continuam salvas.</p>" +
        '<div class="prova-acoes"><button type="button" class="botao botao-principal" id="continuar-prova">Continuar a prova</button></div>');
      document.getElementById("continuar-prova").addEventListener("click", function () { iniciar(curso); });
      return;
    }
    if (s.enviadas > 0 && !s.liberacao) {
      return moldura(curso, esc(curso.titulo),
        '<div class="prova-resultado reprovado"><span class="prova-selo">!</span><h2>Você não atingiu a nota mínima</h2>' +
        "<p>Sua nota foi <strong>" + s.ultima_nota + "%</strong>. A nota mínima é " + s.nota_minima + "%.</p></div>" +
        "<p>Revise as aulas do curso. Uma nova tentativa pode ser liberada pelo <strong>conselho</strong>: fale com a secretaria do CFM.</p>" +
        '<div class="prova-acoes"><a class="botao botao-secundario" href="#/curso/' + esc(curso.id) + '">Revisar o curso</a></div>');
    }
    // Pode começar (primeira vez ou nova tentativa liberada)
    moldura(curso, esc(curso.titulo),
      "<h2>" + (s.liberacao ? "Nova tentativa liberada" : "Antes de começar") + "</h2>" +
      '<ul class="lista-simples prova-regras">' +
        "<li>" + C.icone.check + "<span><strong>" + C.plural(s.questoes, "pergunta", "perguntas") + "</strong> de múltipla escolha.</span></li>" +
        "<li>" + C.icone.check + "<span>Para ser aprovado(a), acerte pelo menos <strong>" + s.nota_minima + "%</strong>.</span></li>" +
        "<li>" + C.icone.check + "<span>Você tem <strong>uma tentativa</strong>. Se precisar de outra, só o conselho pode liberar.</span></li>" +
        "<li>" + C.icone.check + "<span>Se a página fechar no meio, ao voltar você continua a mesma prova.</span></li>" +
        "<li>" + C.icone.check + "<span>Aprovado(a), você recebe na hora o <strong>certificado</strong> com código de validação.</span></li>" +
      "</ul>" +
      '<div class="prova-acoes"><button type="button" class="botao botao-principal" id="comecar-prova">Começar a prova</button></div>');
    document.getElementById("comecar-prova").addEventListener("click", function () {
      C.confirmar({
        icone: C.icone.info, titulo: "Começar a prova agora?",
        texto: "Esta é a sua tentativa. Separe um tempo tranquilo para responder com calma.",
        sim: "Começar", nao: "Agora não"
      }).then(function (sim) { if (sim) iniciar(curso); });
    });
  }

  /* ---------- Validar e-mail com código ---------- */
  function validarEmail(curso) {
    var email = Conta.estado.usuario.email;
    moldura(curso, esc(curso.titulo),
      "<h2>Valide o seu e-mail</h2>" +
      "<p>Antes da primeira prova, precisamos confirmar que o e-mail <strong>" + esc(email) + "</strong> é seu. É rápido e só acontece uma vez.</p>" +
      '<div class="prova-acoes"><button type="button" class="botao botao-principal" id="enviar-codigo">Enviar código para o meu e-mail</button></div>' +
      '<form class="formulario codigo-form" id="form-codigo" hidden>' +
        '<label class="campo"><span class="campo-rotulo">Código de 6 números</span>' +
          '<input name="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000000" required></label>' +
        '<button class="botao botao-principal" type="submit">Validar e-mail</button>' +
        '<small class="suave">Não chegou? Confira o spam. Você pode pedir outro código depois de 1 minuto.</small>' +
      "</form>" +
      '<div class="mensagem" id="msg-codigo" role="alert"></div>');
    var msg = document.getElementById("msg-codigo");
    var form = document.getElementById("form-codigo");
    function erro(t) { msg.className = "mensagem erro"; msg.textContent = t; }
    document.getElementById("enviar-codigo").addEventListener("click", function (ev) {
      var b = ev.currentTarget;
      b.disabled = true;
      Conta.cliente.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } }).then(function (r) {
        b.disabled = false;
        if (r.error) return erro(C.traduzirErro(r.error));
        b.textContent = "Enviar outro código";
        form.hidden = false;
        form.querySelector("input").focus();
        msg.className = "mensagem sucesso";
        msg.textContent = "Enviamos um código para " + email + ".";
      });
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var codigo = String(new FormData(form).get("codigo") || "").replace(/\D/g, "");
      if (codigo.length < 6) return erro("Digite os números do código.");
      var b = form.querySelector('button[type="submit"]');
      b.disabled = true;
      Conta.cliente.auth.verifyOtp({ email: email, token: codigo, type: "email" }).then(function (r) {
        if (r.error) { b.disabled = false; return erro(/expired|invalid/i.test(r.error.message) ? "Código inválido ou vencido. Peça um novo código." : C.traduzirErro(r.error)); }
        return Conta.cliente.rpc("marcar_email_verificado").then(function (r2) {
          b.disabled = false;
          if (r2.error) return erro(msgErro(r2.error));
          if (Conta.estado.perfil) Conta.estado.perfil.email_verificado_em = r2.data;
          C.aviso("E-mail validado!", "sucesso");
          pagina(curso);
        });
      });
    });
  }

  /* ---------- Fazendo a prova ---------- */
  function chaveRascunho(tentativa) { return "cfm-prova-" + tentativa; }

  function iniciar(curso) {
    moldura(curso, esc(curso.titulo), '<p class="suave">Preparando a sua prova…</p>');
    Conta.cliente.rpc("iniciar_prova", { p_curso: curso.id }).then(function (r) {
      if (r.error) return moldura(curso, esc(curso.titulo), '<div class="mensagem erro">' + esc(msgErro(r.error)) + "</div>");
      responder(curso, r.data);
    });
  }

  function responder(curso, prova) {
    var respostas = {};
    try { respostas = JSON.parse(localStorage.getItem(chaveRascunho(prova.tentativa))) || {}; } catch (e) { respostas = {}; }
    var qs = prova.questoes;
    app.innerHTML = cabecalho(curso, esc(curso.titulo) + " · nota mínima " + prova.nota_minima + "%") +
      '<div class="container prova-corpo">' +
        '<div class="prova-progresso cartao"><span id="respondidas"></span>' + '<div class="progresso-barra"><span id="barra-respondidas"></span></div></div>' +
        '<form id="form-prova" class="prova-questoes">' + qs.map(function (q, i) {
          return '<fieldset class="cartao questao">' +
            '<legend><span class="questao-numero">' + (i + 1) + "</span>" + esc(q.enunciado) + "</legend>" +
            q.alternativas.map(function (alt, j) {
              return '<label class="alternativa"><input type="radio" name="' + q.id + '" value="' + j + '"' + (String(respostas[q.id]) === String(j) ? " checked" : "") + ">" +
                '<span class="alternativa-letra">' + String.fromCharCode(65 + j) + "</span><span>" + esc(alt) + "</span></label>";
            }).join("") +
          "</fieldset>";
        }).join("") +
        '<div class="prova-acoes prova-enviar"><button type="submit" class="botao botao-principal">Enviar prova</button></div>' +
        '<div class="mensagem" id="msg-prova" role="alert"></div>' +
        "</form>" +
      "</div>";
    window.scrollTo(0, 0);
    var form = document.getElementById("form-prova");

    function atualizar() {
      var n = qs.filter(function (q) { return respostas[q.id] !== undefined; }).length;
      document.getElementById("respondidas").textContent = n + " de " + qs.length + " respondidas";
      document.getElementById("barra-respondidas").style.width = Math.round(n * 100 / Math.max(qs.length, 1)) + "%";
    }
    form.addEventListener("change", function (ev) {
      if (ev.target.type !== "radio") return;
      respostas[ev.target.name] = Number(ev.target.value);
      try { localStorage.setItem(chaveRascunho(prova.tentativa), JSON.stringify(respostas)); } catch (e) { /* ok */ }
      atualizar();
    });
    atualizar();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var faltam = qs.filter(function (q) { return respostas[q.id] === undefined; }).length;
      C.confirmar({
        icone: C.icone.info, titulo: "Enviar a prova?",
        texto: (faltam ? "<strong>Faltam " + C.plural(faltam, "pergunta", "perguntas") + " sem resposta</strong> (contam como erro). " : "Você respondeu todas as perguntas. ") +
          "Depois de enviar, não dá para mudar as respostas.",
        sim: "Enviar", nao: faltam ? "Voltar e responder" : "Revisar"
      }).then(function (sim) {
        if (!sim) return;
        var b = form.querySelector('button[type="submit"]');
        b.disabled = true;
        Conta.cliente.rpc("enviar_prova", { p_tentativa: prova.tentativa, p_respostas: respostas }).then(function (r) {
          b.disabled = false;
          var msg = document.getElementById("msg-prova");
          if (r.error) { msg.className = "mensagem erro"; msg.textContent = msgErro(r.error); return; }
          try { localStorage.removeItem(chaveRascunho(prova.tentativa)); } catch (e) { /* ok */ }
          resultado(curso, r.data);
        });
      });
    });
  }

  function resultado(curso, res) {
    moldura(curso, esc(curso.titulo),
      res.aprovado
        ? '<div class="prova-resultado aprovado"><span class="prova-selo">✓</span><h2>Parabéns, você foi aprovado(a)!</h2>' +
            "<p>Você acertou <strong>" + res.acertos + " de " + res.total + "</strong> perguntas: nota <strong>" + res.nota + "%</strong>.</p></div>" +
            '<div class="prova-acoes"><a class="botao botao-principal" href="#/certificado/' + esc(res.certificado) + '">Ver meu certificado</a></div>'
        : '<div class="prova-resultado reprovado"><span class="prova-selo">!</span><h2>Não foi desta vez</h2>' +
            "<p>Você acertou <strong>" + res.acertos + " de " + res.total + "</strong> perguntas: nota <strong>" + res.nota + "%</strong>. A nota mínima é " + res.nota_minima + "%.</p></div>" +
            "<p>Revise as aulas com calma. Uma nova tentativa pode ser liberada pelo <strong>conselho</strong>: fale com a secretaria do CFM.</p>" +
            '<div class="prova-acoes"><a class="botao botao-secundario" href="#/curso/' + esc(curso.id) + '">Revisar o curso</a></div>');
  }

  /* ---------- Certificado (público: qualquer pessoa com o código vê) ---------- */
  function dataExtenso(d) {
    return new Date(String(d).length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "numeric", month: "long", year: "numeric" });
  }
  function certificado(codigo) {
    app.innerHTML = '<div class="container prova-corpo"><p class="suave">Carregando certificado…</p></div>';
    Conta.cliente.rpc("validar_certificado", { p_codigo: codigo }).then(function (r) {
      var c = r.data && r.data[0];
      if (r.error || !c) {
        app.innerHTML = '<div class="vazio"><img src="assets/simbolo.png" alt=""><h1>Certificado não encontrado</h1>' +
          "<p>Confira se o código <strong>" + esc(codigo) + "</strong> foi digitado corretamente.</p>" +
          '<a class="botao botao-principal" href="#/validar">Tentar outro código</a></div>';
        return;
      }
      var link = location.origin + location.pathname + "#/certificado/" + c.codigo;
      app.innerHTML =
        '<div class="container certificado-pagina">' +
          '<div class="certificado-barra nao-imprimir">' +
            '<span class="estado estado-aberto">✓ Certificado válido</span>' +
            '<button type="button" class="botao botao-principal botao-pequeno" onclick="window.print()">Baixar / imprimir (PDF)</button>' +
          "</div>" +
          '<article class="certificado">' +
            '<img class="certificado-logo" src="assets/logo-email.png" alt="Comunidade de Cristo Maranatha">' +
            '<p class="certificado-instituicao">Centro de Formação Ministerial</p>' +
            "<h1>Certificado de Conclusão</h1>" +
            "<p>Certificamos que</p>" +
            '<p class="certificado-nome">' + esc(c.nome) + "</p>" +
            "<p>concluiu o curso</p>" +
            '<p class="certificado-curso">' + esc(c.curso_titulo) + "</p>" +
            "<p>" + (c.carga_horaria ? "com carga horária de " + esc(c.carga_horaria) + ", " : "") + "em " + dataExtenso(c.emitido_em) + ".</p>" +
            '<div class="certificado-rodape">' +
              '<div class="certificado-assinatura"><span></span>Coordenação do CFM</div>' +
              '<div class="certificado-codigo">Código de validação<strong>' + esc(c.codigo) + "</strong><small>" + esc(link) + "</small></div>" +
            "</div>" +
          "</article>" +
        "</div>";
      window.scrollTo(0, 0);
    });
  }

  function validar() {
    app.innerHTML =
      '<div class="container pagina-conta"><div class="cartao-conta">' +
        '<img class="cartao-conta-logo" src="assets/simbolo.png" alt="">' +
        '<h1>Validar certificado</h1><p class="cartao-conta-sub">Digite o código que aparece no certificado (ex.: CFM-2026-7F3A9C).</p>' +
        '<form class="formulario" id="form-validar"><label class="campo"><span class="campo-rotulo">Código</span>' +
          '<input name="codigo" required placeholder="CFM-2026-XXXXXX" style="text-transform:uppercase"></label>' +
          '<button class="botao botao-principal botao-largo" type="submit">Validar</button></form>' +
      "</div></div>";
    document.getElementById("form-validar").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var codigo = String(new FormData(ev.target).get("codigo") || "").trim().toUpperCase();
      if (codigo) C.irPara("#/certificado/" + encodeURIComponent(codigo));
    });
    window.scrollTo(0, 0);
  }

  /* ---------- "Meus certificados" (em Minha conta) ---------- */
  function listarCertificados(el) {
    if (!el || !Conta.estado.usuario) return;
    Conta.cliente.from("certificados").select("codigo, curso_titulo, emitido_em").eq("usuario_id", Conta.estado.usuario.id)
      .order("emitido_em", { ascending: false }).then(function (r) {
        if (r.error) { el.innerHTML = ""; return; }
        el.innerHTML = r.data.length
          ? r.data.map(function (c) {
              return '<a class="meu-curso certificado-item" href="#/certificado/' + esc(c.codigo) + '"><div class="meu-curso-info"><h3>' + esc(c.curso_titulo) + "</h3>" +
                '<small class="suave">Emitido em ' + C.dataCurta(c.emitido_em) + " · código " + esc(c.codigo) + "</small></div>" +
                '<span class="botao botao-secundario botao-pequeno">Ver certificado</span></a>';
            }).join("")
          : '<p class="bloco-texto">Você ainda não tem certificados. Eles aparecem aqui quando você for aprovado(a) na prova final de um curso.</p>';
      });
  }

  window.Prova = { pagina: pagina, certificado: certificado, validar: validar, listarCertificados: listarCertificados };
})();
