/* ============================================================
   Painel da equipe do CFM — pessoas, progresso e níveis de acesso
   Quem vê o quê é decidido no banco (Supabase), não aqui:
   esta tela só mostra o que o banco libera para cada pessoa.
   ============================================================ */
(function () {
  "use strict";

  var C = window.CFM;
  var Conta = window.Conta;
  var esc = C.esc;

  var PAPEIS = { aluno: "Aluno", conselho: "Conselho", admin: "Administrador(a)" };
  var FUNCOES = { professor: "Professor(a)", tutor: "Tutor(a)" };

  var dados = null; // guardado enquanto a pessoa navega pelo painel

  /* ---------- Ajudantes ---------- */
  function curso(id) { return C.cursos.filter(function (c) { return c.id === id; })[0]; }
  function tituloCurso(id) { var c = curso(id); return c ? c.titulo : id; }
  function totalAulas(id) { var c = curso(id); return c ? C.todasAulas(c).length : 0; }
  function data(d) { return d ? new Date(d).toLocaleDateString("pt-BR") : "—"; }
  function normalizar(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function linkWhats(tel) {
    var d = String(tel || "").replace(/\D/g, "");
    if (d.length < 10) return null;
    if (d.length <= 11) d = "55" + d;
    return "https://wa.me/" + d;
  }
  function erroMsg(e) {
    if (e && e.code === "P0001") return e.message; // mensagens escritas por nós no banco
    if (e && e.code === "23505") return "Essa pessoa já tem essa função nesse curso.";
    if (e && (e.code === "42501" || /row-level security/i.test(e.message || ""))) return "Você não tem permissão para fazer isso.";
    return C.traduzirErro(e);
  }

  // Cursos que a pessoa logada acompanha no painel
  function cursosVisiveis() {
    if (Conta.ehConselho()) return C.cursos.filter(C.temAulas);
    var meus = (Conta.estado.equipe || []).map(function (e) { return e.curso_id; });
    return C.cursos.filter(function (c) { return meus.indexOf(c.id) >= 0; });
  }

  function acessosDe(pessoa, d) {
    var itens = [];
    if (pessoa.papel && pessoa.papel !== "aluno") itens.push({ classe: "papel-" + pessoa.papel, texto: PAPEIS[pessoa.papel] });
    d.equipe.filter(function (e) { return e.usuario_id === pessoa.id; }).forEach(function (e) {
      itens.push({ classe: "papel-" + e.funcao, texto: FUNCOES[e.funcao] + " · " + tituloCurso(e.curso_id) });
    });
    return itens;
  }
  function selos(itens) {
    return itens.map(function (i) { return '<span class="selo-papel ' + i.classe + '">' + esc(i.texto) + "</span>"; }).join("");
  }

  /* ---------- Carregar dados do Supabase ---------- */
  async function carregar() {
    if (dados) return dados;
    var cl = Conta.cliente;
    var r = await Promise.all([
      cl.from("perfis").select("*").order("nome_completo", { ascending: true }),
      cl.rpc("resumo_progresso"),
      cl.from("equipe_curso").select("usuario_id, curso_id, funcao"),
      cl.from("prerequisito_dispensas").select("*")
    ]);
    r.slice(0, 3).forEach(function (x) { if (x.error) throw x.error; });

    var progresso = {};
    r[1].data.forEach(function (l) {
      progresso[l.usuario_id] = progresso[l.usuario_id] || {};
      progresso[l.usuario_id][l.curso_id] = { aulas: l.aulas_concluidas, ultima: l.ultima_atividade };
    });
    // Liberações de pré-requisito (se o script 04 ainda não foi rodado, segue sem elas)
    dados = { pessoas: r[0].data, progresso: progresso, equipe: r[2].data, dispensas: r[3].error ? [] : r[3].data };
    return dados;
  }

  /* ---------- Página ---------- */
  function pagina(partes) {
    if (!C.exigirLogin()) return;
    if (!Conta.estado.perfil) return C.carregando();
    if (!Conta.temPainel()) return semAcesso();

    var aba = partes[0] || "pessoas";
    var app = C.app;
    app.innerHTML =
      '<section class="curso-topo painel-topo">' + C.chamaHero() +
        '<div class="curso-topo-inner">' +
          '<nav class="trilha" aria-label="Você está em"><a href="#/">Início</a> › <span>Painel</span></nav>' +
          "<h1>Painel</h1>" +
          '<p class="lead">' + (Conta.ehConselho()
            ? "Acompanhe as pessoas cadastradas, o progresso nos cursos e a equipe do CFM."
            : "Acompanhe os alunos dos cursos em que você atua.") + "</p>" +
        "</div>" +
      "</section>" +
      '<div class="container painel">' +
        '<div class="painel-barra">' +
          '<nav class="abas-painel">' +
            '<a href="#/painel" class="' + (aba === "pessoas" || aba === "pessoa" ? "ativa" : "") + '">Pessoas</a>' +
            (Conta.ehConselho() ? '<a href="#/painel/equipe" class="' + (aba === "equipe" ? "ativa" : "") + '">Equipe</a>' : "") +
            (Conta.ehAdmin() ? '<a href="#/painel/cursos" class="' + (aba === "cursos" ? "ativa" : "") + '">Cursos</a>' : "") +
          "</nav>" +
          '<button class="botao botao-secundario botao-pequeno" type="button" id="painel-atualizar">Atualizar dados</button>' +
        "</div>" +
        '<div id="painel-conteudo"><p class="painel-carregando">Carregando…</p></div>' +
      "</div>";

    document.getElementById("painel-atualizar").addEventListener("click", function () {
      dados = null;
      pagina(partes);
    });

    var hash = location.hash;
    var el = document.getElementById("painel-conteudo");

    // A aba Cursos não precisa da lista de pessoas
    if (aba === "cursos") {
      if (!Conta.ehAdmin()) { el.innerHTML = '<p class="painel-vazio">Só administradores podem gerenciar os cursos.</p>'; return; }
      C.recarregarConfigCursos().then(function () {
        if (location.hash === hash && document.body.contains(el)) renderCursos(el);
      }).catch(function (e) {
        el.innerHTML = '<div class="mensagem erro">' + esc(erroMsg(e)) + "</div>";
      });
      window.scrollTo(0, 0);
      return;
    }

    carregar().then(function (d) {
      if (location.hash !== hash || !document.body.contains(el)) return; // a pessoa já mudou de página
      if (aba === "equipe" && Conta.ehConselho()) renderEquipe(el, d);
      else if (aba === "pessoa" && partes[1]) renderPessoa(el, d, partes[1]);
      else renderPessoas(el, d);
    }).catch(function (e) {
      console.error(e);
      el.innerHTML = '<div class="mensagem erro">' + esc(erroMsg(e)) + "</div>";
    });
    window.scrollTo(0, 0);
  }

  function semAcesso() {
    C.app.innerHTML = '<div class="vazio"><img src="assets/logo.png" alt=""><h1>Área da equipe</h1>' +
      "<p>Esta página é só para a equipe do CFM. Se você faz parte da equipe, peça a um administrador para liberar seu acesso.</p>" +
      '<a class="botao botao-principal" href="#/">Voltar ao início</a></div>';
  }

  /* ---------- Aba: Pessoas ---------- */
  function renderPessoas(el, d) {
    var eu = Conta.estado.usuario.id;
    var conselho = Conta.ehConselho();
    var cursos = cursosVisiveis();
    var idsCursos = cursos.map(function (c) { return c.id; });
    var pessoas = d.pessoas.filter(function (p) { return conselho || p.id !== eu; });

    var seteDias = Date.now() - 7 * 864e5;
    var novos = pessoas.filter(function (p) { return new Date(p.criado_em).getTime() > seteDias; }).length;
    var estudando = pessoas.filter(function (p) {
      return Object.keys(d.progresso[p.id] || {}).some(function (c) { return idsCursos.indexOf(c) >= 0; });
    }).length;

    el.innerHTML =
      '<div class="estatisticas">' +
        '<div class="estatistica"><strong>' + pessoas.length + "</strong><span>" + (conselho ? "pessoas cadastradas" : "alunos nos seus cursos") + "</span></div>" +
        '<div class="estatistica"><strong>' + novos + "</strong><span>novos nos últimos 7 dias</span></div>" +
        '<div class="estatistica"><strong>' + estudando + "</strong><span>já começaram algum curso</span></div>" +
      "</div>" +
      '<div class="filtros">' +
        '<input type="search" id="filtro-busca" placeholder="Buscar por nome, e-mail, cidade ou igreja" aria-label="Buscar">' +
        '<select id="filtro-curso" aria-label="Curso"><option value="">' + (conselho ? "Todos (com ou sem curso)" : "Todos os meus cursos") + "</option>" +
          cursos.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.titulo) + "</option>"; }).join("") +
        "</select>" +
        (conselho
          ? '<select id="filtro-papel" aria-label="Tipo"><option value="">Alunos e equipe</option><option value="aluno">Só alunos</option><option value="equipe">Só equipe</option></select>'
          : "") +
      "</div>" +
      '<div class="lista-topo"><span id="contagem"></span>' +
        (conselho ? '<button class="botao botao-secundario botao-pequeno" type="button" id="exportar">Baixar planilha (CSV)</button>' : "") +
      "</div>" +
      '<div id="lista-pessoas" class="tabela-pessoas"></div>';

    var busca = document.getElementById("filtro-busca");
    var filtroCurso = document.getElementById("filtro-curso");
    var filtroPapel = document.getElementById("filtro-papel");
    var filtradas = [];

    function filtrar() {
      var termo = normalizar(busca.value.trim());
      var cid = filtroCurso.value;
      var tipo = filtroPapel ? filtroPapel.value : "";
      filtradas = pessoas.filter(function (p) {
        if (termo && normalizar([p.nome_completo, p.email, p.cidade, p.estado, p.igreja, p.telefone].join(" ")).indexOf(termo) < 0) return false;
        if (cid && !(d.progresso[p.id] || {})[cid]) return false;
        if (tipo) {
          var ehEquipe = p.papel !== "aluno" || d.equipe.some(function (e) { return e.usuario_id === p.id; });
          if ((tipo === "equipe") !== ehEquipe) return false;
        }
        return true;
      });
      document.getElementById("contagem").textContent = C.plural(filtradas.length, "pessoa", "pessoas");
      document.getElementById("lista-pessoas").innerHTML = filtradas.length
        ? '<div class="linha-pessoa cabecalho" aria-hidden="true"><span>Nome</span><span>Cidade</span><span>Igreja</span><span>Progresso</span><span>Cadastro</span></div>' +
          filtradas.map(function (p) { return linhaPessoa(p, d, cid, idsCursos); }).join("")
        : '<p class="painel-vazio">Nenhuma pessoa encontrada com esses filtros.</p>';
    }

    busca.addEventListener("input", filtrar);
    filtroCurso.addEventListener("change", filtrar);
    if (filtroPapel) filtroPapel.addEventListener("change", filtrar);
    var botaoExportar = document.getElementById("exportar");
    if (botaoExportar) botaoExportar.addEventListener("click", function () { exportarCsv(filtradas, d); });
    filtrar();
  }

  function linhaPessoa(p, d, cursoFiltro, idsCursos) {
    var prog = d.progresso[p.id] || {};
    var resumo;
    if (cursoFiltro) {
      var feitas = prog[cursoFiltro] ? prog[cursoFiltro].aulas : 0;
      var total = totalAulas(cursoFiltro) || 1;
      resumo = C.barraProgresso(Math.min(100, Math.round((feitas / total) * 100)));
    } else {
      var meus = Object.keys(prog).filter(function (c) { return idsCursos.indexOf(c) >= 0; });
      resumo = meus.length
        ? meus.slice(0, 2).map(function (c) {
            return "<small>" + esc(tituloCurso(c)) + ": " + prog[c].aulas + "/" + totalAulas(c) + "</small>";
          }).join("") + (meus.length > 2 ? "<small>+ " + (meus.length - 2) + " curso(s)</small>" : "")
        : '<small class="suave">Ainda não começou</small>';
    }
    return '<a class="linha-pessoa" href="#/painel/pessoa/' + esc(p.id) + '">' +
      '<span class="col-nome"><strong>' + esc(p.nome_completo || "(sem nome)") + "</strong><small>" + esc(p.email) + "</small>" +
        selos(acessosDe(p, d)) + "</span>" +
      '<span data-rotulo="Cidade">' + esc([p.cidade, p.estado].filter(Boolean).join("/") || "—") + "</span>" +
      '<span data-rotulo="Igreja">' + esc(p.igreja || "—") + "</span>" +
      '<span data-rotulo="Progresso" class="col-progresso">' + resumo + "</span>" +
      '<span data-rotulo="Cadastro">' + data(p.criado_em) + "</span>" +
    "</a>";
  }

  function exportarCsv(pessoas, d) {
    var cursos = C.cursos.filter(C.disponivel);
    var cab = ["Nome", "E-mail", "WhatsApp", "Cidade", "UF", "Igreja", "Acesso", "Cadastro"]
      .concat(cursos.map(function (c) { return c.titulo + " (aulas concluídas)"; }));
    var linhas = pessoas.map(function (p) {
      var prog = d.progresso[p.id] || {};
      return [p.nome_completo, p.email, p.telefone, p.cidade, p.estado, p.igreja,
        acessosDe(p, d).map(function (a) { return a.texto; }).join(" | ") || "Aluno", data(p.criado_em)]
        .concat(cursos.map(function (c) { return prog[c.id] ? prog[c.id].aulas : 0; }));
    });
    var csv = [cab].concat(linhas).map(function (l) {
      return l.map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cfm-pessoas-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- Página de uma pessoa ---------- */
  function renderPessoa(el, d, id) {
    var p = d.pessoas.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      el.innerHTML = '<p class="painel-vazio">Pessoa não encontrada, ou você não tem acesso aos dados dela.</p><a href="#/painel">← Voltar para a lista</a>';
      return;
    }
    var admin = Conta.ehAdmin();
    var conselho = Conta.ehConselho();
    var souEu = p.id === Conta.estado.usuario.id;
    var prog = d.progresso[p.id] || {};
    var whats = linkWhats(p.telefone);
    var funcoes = d.equipe.filter(function (e) { return e.usuario_id === p.id; });
    var dispensas = d.dispensas.filter(function (x) { return x.usuario_id === p.id; });

    var cursosProgresso = cursosVisiveis().map(function (c) {
      var feitas = prog[c.id] ? prog[c.id].aulas : 0;
      var total = C.todasAulas(c).length || 1;
      return '<div class="meu-curso"><div class="meu-curso-info"><h3>' + esc(c.titulo) + "</h3>" +
        C.barraProgresso(Math.min(100, Math.round((feitas / total) * 100))) +
        '<small class="suave">' + feitas + " de " + C.todasAulas(c).length + " aulas" +
        (prog[c.id] ? " · última atividade em " + data(prog[c.id].ultima) : "") + "</small></div></div>";
    }).join("");

    var acesso = "";
    if (conselho) {
      acesso =
        '<div class="cartao"><h3>Acesso na plataforma</h3>' +
          (admin && !souEu
            ? '<div class="formulario"><label class="campo"><span class="campo-rotulo">Papel geral</span>' +
                '<select id="campo-papel">' + Object.keys(PAPEIS).map(function (k) {
                  return '<option value="' + k + '"' + (p.papel === k ? " selected" : "") + ">" + PAPEIS[k] + "</option>";
                }).join("") + "</select></label>" +
                '<button class="botao botao-principal" type="button" id="salvar-papel">Salvar papel</button></div>'
            : "<p>Papel geral: <strong>" + esc(PAPEIS[p.papel] || p.papel) + "</strong>" +
              (admin && souEu ? '<br><small class="suave">Você não pode mudar o seu próprio papel. Peça a outro administrador.</small>' : "") + "</p>") +

          '<h3 style="margin-top:24px">Funções em cursos</h3>' +
          (funcoes.length
            ? '<ul class="lista-funcoes">' + funcoes.map(function (f) {
                return "<li><span>" + esc(FUNCOES[f.funcao]) + " · " + esc(tituloCurso(f.curso_id)) + "</span>" +
                  (admin ? '<button class="botao-remover" type="button" data-curso="' + esc(f.curso_id) + '" data-funcao="' + esc(f.funcao) + '">Remover</button>' : "") +
                "</li>";
              }).join("") + "</ul>"
            : '<p class="suave">Nenhuma função em cursos.</p>') +

          (admin
            ? '<div class="adicionar-funcao">' +
                '<select id="nova-funcao"><option value="professor">Professor(a)</option><option value="tutor">Tutor(a)</option></select>' +
                '<select id="novo-curso">' + C.cursos.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.titulo) + "</option>"; }).join("") + "</select>" +
                '<button class="botao botao-secundario" type="button" id="adicionar-funcao">Adicionar</button>' +
              "</div>"
            : "") +

          '<h3 style="margin-top:24px">Liberação de pré-requisito</h3>' +
          '<p class="suave" style="font-size:13px;margin:0 0 10px">Permite que esta pessoa faça o curso mesmo sem ter concluído o pré-requisito.</p>' +
          (dispensas.length
            ? '<ul class="lista-funcoes">' + dispensas.map(function (x) {
                return "<li><span>" + esc(tituloCurso(x.curso_id)) + (x.motivo ? '<small class="suave" style="display:block">' + esc(x.motivo) + "</small>" : "") + "</span>" +
                  (admin ? '<button class="botao-remover" type="button" data-dispensa="' + esc(x.curso_id) + '">Retirar</button>' : "") + "</li>";
              }).join("") + "</ul>"
            : '<p class="suave">Nenhuma liberação.</p>') +
          (admin
            ? '<div class="adicionar-funcao">' +
                '<select id="dispensa-curso">' + C.cursos.map(function (c) {
                  return '<option value="' + esc(c.id) + '">' + esc(c.titulo) + (C.textoPrerequisitos(c) ? "" : " (sem pré-requisito)") + "</option>";
                }).join("") + "</select>" +
                '<input id="dispensa-motivo" maxlength="300" placeholder="Motivo (opcional). Ex.: fez o curso presencialmente">' +
                '<button class="botao botao-secundario" type="button" id="adicionar-dispensa">Liberar</button>' +
              "</div>"
            : "") +
          '<div class="mensagem" id="msg-acesso" role="alert"></div>' +
        "</div>";
    }

    el.innerHTML =
      '<a class="voltar" href="#/painel">← Voltar para a lista</a>' +
      '<div class="curso-corpo pessoa-corpo">' +
        "<div>" +
          '<div class="cartao pessoa-cabecalho">' +
            '<span class="avatar avatar-grande">' + esc((p.nome_completo || p.email || "?").charAt(0).toUpperCase()) + "</span>" +
            "<div><h2>" + esc(p.nome_completo || "(sem nome)") + "</h2>" + selos(acessosDe(p, d)) + "</div>" +
          "</div>" +
          '<dl class="dados-pessoa">' +
            "<dt>E-mail</dt><dd><a href=\"mailto:" + esc(p.email) + '">' + esc(p.email) + "</a></dd>" +
            "<dt>WhatsApp</dt><dd>" + (whats ? '<a href="' + whats + '" target="_blank" rel="noopener">' + esc(p.telefone) + "</a>" : esc(p.telefone || "—")) + "</dd>" +
            "<dt>Cidade</dt><dd>" + esc([p.cidade, p.estado].filter(Boolean).join("/") || "—") + "</dd>" +
            "<dt>Igreja</dt><dd>" + esc(p.igreja || "—") + "</dd>" +
            "<dt>Cadastro</dt><dd>" + data(p.criado_em) + "</dd>" +
            "<dt>Aceitou a privacidade</dt><dd>" + data(p.aceitou_termos_em) + "</dd>" +
          "</dl>" +
          '<h2 style="margin-top:36px">Progresso nos cursos</h2>' +
          '<div class="meus-cursos">' + (cursosProgresso || '<p class="suave">Nenhum curso disponível.</p>') + "</div>" +
        "</div>" +
        "<aside>" + acesso + "</aside>" +
      "</div>";

    if (!admin) return;
    var msg = document.getElementById("msg-acesso");
    function mostrarErro(e) { msg.className = "mensagem erro"; msg.textContent = erroMsg(e); }
    function recarregar(texto) { C.aviso(texto, "sucesso"); dados = null; pagina(["pessoa", id]); }

    var salvarPapel = document.getElementById("salvar-papel");
    if (salvarPapel) salvarPapel.addEventListener("click", function () {
      var novo = document.getElementById("campo-papel").value;
      if (novo === p.papel) return;
      var nome = p.nome_completo || p.email;
      var aviso = novo === "admin"
        ? "Tornar " + nome + " administrador(a)? Essa pessoa poderá mudar o acesso de qualquer um na plataforma."
        : "Mudar o papel de " + nome + " para " + PAPEIS[novo] + "?";
      if (!window.confirm(aviso)) return;
      salvarPapel.disabled = true;
      Conta.cliente.rpc("definir_papel", { pessoa: p.id, novo_papel: novo }).then(function (r) {
        salvarPapel.disabled = false;
        if (r.error) return mostrarErro(r.error);
        recarregar("Papel atualizado.");
      });
    });

    document.getElementById("adicionar-funcao").addEventListener("click", function (ev) {
      var botao = ev.currentTarget;
      botao.disabled = true;
      Conta.cliente.from("equipe_curso").insert({
        usuario_id: p.id,
        curso_id: document.getElementById("novo-curso").value,
        funcao: document.getElementById("nova-funcao").value
      }).then(function (r) {
        botao.disabled = false;
        if (r.error) return mostrarErro(r.error);
        recarregar("Função adicionada.");
      });
    });

    document.getElementById("adicionar-dispensa").addEventListener("click", function (ev) {
      var botao = ev.currentTarget;
      var cursoId = document.getElementById("dispensa-curso").value;
      var motivo = document.getElementById("dispensa-motivo").value.trim();
      if (!window.confirm("Liberar " + (p.nome_completo || p.email) + " para fazer " + tituloCurso(cursoId) + " sem o pré-requisito?")) return;
      botao.disabled = true;
      Conta.cliente.from("prerequisito_dispensas").insert({ usuario_id: p.id, curso_id: cursoId, motivo: motivo || null }).then(function (r) {
        botao.disabled = false;
        if (r.error) {
          if (r.error.code === "23505") return mostrarErro({ message: "Essa pessoa já tem liberação para esse curso.", code: "P0001" });
          return mostrarErro(r.error);
        }
        recarregar("Liberação concedida.");
      });
    });

    el.querySelectorAll("[data-dispensa]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!window.confirm("Retirar a liberação de pré-requisito para " + tituloCurso(b.dataset.dispensa) + "?")) return;
        b.disabled = true;
        Conta.cliente.from("prerequisito_dispensas").delete().match({ usuario_id: p.id, curso_id: b.dataset.dispensa }).then(function (r) {
          if (r.error) { b.disabled = false; return mostrarErro(r.error); }
          recarregar("Liberação retirada.");
        });
      });
    });

    el.querySelectorAll(".botao-remover[data-funcao]").forEach(function (b) {
      b.addEventListener("click", function () {
        var texto = FUNCOES[b.dataset.funcao] + " em " + tituloCurso(b.dataset.curso);
        if (!window.confirm("Remover a função " + texto + "?")) return;
        b.disabled = true;
        Conta.cliente.from("equipe_curso").delete()
          .match({ usuario_id: p.id, curso_id: b.dataset.curso, funcao: b.dataset.funcao })
          .then(function (r) {
            if (r.error) { b.disabled = false; return mostrarErro(r.error); }
            recarregar("Função removida.");
          });
      });
    });
  }

  /* ---------- Aba: Cursos (só admin) — mostrar/esconder e datas ---------- */
  // Datas no horário de Fortaleza (UTC−3, sem horário de verão)
  function paraCampoData(ts) {
    return ts ? new Date(Date.parse(ts) - 3 * 3600e3).toISOString().slice(0, 10) : "";
  }
  function doCampoData(valor, fimDoDia) {
    return valor ? valor + (fimDoDia ? "T23:59:59-03:00" : "T00:00:00-03:00") : null;
  }

  function descreverSituacao(curso) {
    var cfg = C.configDoCurso(curso.id) || {};
    var s = C.situacao(curso);
    if (s === "oculto") return { texto: "Escondido do site", classe: "estado-oculto" };
    if (s === "encerrado") return { texto: "Escondido · encerrou em " + C.dataCurta(cfg.fecha_em), classe: "estado-oculto" };
    if (s === "agendado") return { texto: "Visível · aulas abrem em " + C.dataCurta(cfg.abre_em), classe: "estado-agendado" };
    return { texto: "Visível para todos" + (cfg.fecha_em ? " até " + C.dataCurta(cfg.fecha_em) : ""), classe: "estado-aberto" };
  }

  // Se "cursoId" passar a exigir "novos", algum deles acaba exigindo o próprio cursoId?
  // Devolve o caminho do ciclo (ex.: "A → B → A") ou null.
  function criaCiclo(cursoId, novos) {
    function prereqsDe(id) {
      if (id === cursoId) return novos;
      var cfg = C.configDoCurso(id);
      return (cfg && cfg.prerequisitos) || [];
    }
    var caminho = null;
    function visitar(id, trilha) { // "trilha" termina em "id"
      if (caminho) return;
      if (trilha.length > 1 && id === cursoId) { caminho = trilha; return; }
      if (trilha.slice(0, -1).indexOf(id) >= 0) return; // outro ciclo antigo: não seguir
      prereqsDe(id).forEach(function (p) { visitar(p, trilha.concat(p)); });
    }
    visitar(cursoId, [cursoId]);
    return caminho ? caminho.map(tituloCurso).join(" → ") : null;
  }

  function renderCursos(el) {
    el.innerHTML =
      '<div class="aviso-em-breve">' + C.icone.info +
        "<div><strong>Como funciona</strong><p>Escolha se cada curso aparece no site e, se quiser, programe as datas. " +
        "Antes da data de abertura, o curso aparece como <strong>“Abre em …”</strong> e as aulas ficam bloqueadas. " +
        "Depois da data final, ele <strong>some do site sozinho</strong>. Deixe as datas em branco para não usar. " +
        "Como administrador, você continua vendo todos os cursos, com um aviso.</p></div>" +
      "</div>" +
      '<div class="lista-cursos-config">' + C.cursos.map(function (curso) {
        var cfg = C.configDoCurso(curso.id) || { visivel: true };
        var estado = descreverSituacao(curso);
        var qtd = C.todasAulas(curso).length;
        return '<div class="cartao curso-config" data-curso="' + esc(curso.id) + '">' +
          '<div class="curso-config-topo">' +
            "<div><h3>" + esc(curso.titulo) + "</h3><small class=\"suave\">" +
              (C.temAulas(curso) ? C.plural(qtd, "aula", "aulas") : "Sem aulas ainda — aparece como “Em breve”") +
              (C.textoPrerequisitos(curso) ? " · Pré-requisito: " + esc(C.textoPrerequisitos(curso)) : "") + "</small></div>" +
            '<span class="estado ' + estado.classe + '">' + esc(estado.texto) + "</span>" +
          "</div>" +
          '<div class="formulario">' +
            '<label class="opcao"><input type="checkbox" data-campo="visivel"' + (cfg.visivel ? " checked" : "") + "><span>Mostrar este curso no site</span></label>" +
            '<div class="campo-linha-2">' +
              '<label class="campo"><span class="campo-rotulo">Abrir as aulas a partir de</span><input type="date" data-campo="abre" value="' + paraCampoData(cfg.abre_em) + '"></label>' +
              '<label class="campo"><span class="campo-rotulo">Esconder do site depois de</span><input type="date" data-campo="fecha" value="' + paraCampoData(cfg.fecha_em) + '"></label>' +
            "</div>" +
            '<fieldset class="campo"><legend class="campo-rotulo">Pré-requisitos</legend>' +
              '<div class="prereq-opcoes">' + C.cursos.filter(function (o) { return o.id !== curso.id; }).map(function (o) {
                var marcado = (cfg.prerequisitos || []).indexOf(o.id) >= 0;
                return '<label class="opcao"><input type="checkbox" data-prereq="' + esc(o.id) + '"' + (marcado ? " checked" : "") + "><span>" + esc(o.titulo) + "</span></label>";
              }).join("") + "</div>" +
              '<div class="prereq-modo">' +
                '<label class="opcao"><input type="radio" name="modo-' + esc(curso.id) + '" value="qualquer"' + (cfg.prerequisito_modo !== "todos" ? " checked" : "") + "><span>Basta concluir <strong>um</strong> dos marcados</span></label>" +
                '<label class="opcao"><input type="radio" name="modo-' + esc(curso.id) + '" value="todos"' + (cfg.prerequisito_modo === "todos" ? " checked" : "") + "><span>Precisa concluir <strong>todos</strong> os marcados</span></label>" +
              "</div>" +
            "</fieldset>" +
            '<div class="curso-config-acoes"><button class="botao botao-principal botao-pequeno" type="button" data-salvar>Salvar</button>' +
              '<a class="botao botao-secundario botao-pequeno" href="#/curso/' + esc(curso.id) + '">Ver página do curso</a></div>' +
            '<div class="mensagem" role="alert"></div>' +
          "</div>" +
        "</div>";
      }).join("") + "</div>";

    el.querySelectorAll(".curso-config").forEach(function (cartao) {
      var botao = cartao.querySelector("[data-salvar]");
      var msg = cartao.querySelector(".mensagem");
      botao.addEventListener("click", function () {
        var abre = cartao.querySelector('[data-campo="abre"]').value;
        var fecha = cartao.querySelector('[data-campo="fecha"]').value;
        msg.className = "mensagem";
        msg.textContent = "";
        if (abre && fecha && fecha < abre) {
          msg.className = "mensagem erro";
          msg.textContent = "A data para esconder precisa ser depois da data de abertura.";
          return;
        }
        var cursoId = cartao.dataset.curso;
        var prereqs = Array.prototype.map.call(cartao.querySelectorAll("[data-prereq]:checked"), function (i) { return i.dataset.prereq; });
        var ciclo = criaCiclo(cursoId, prereqs);
        if (ciclo) {
          msg.className = "mensagem erro";
          msg.textContent = "Isso criaria um ciclo: " + ciclo + ". Assim ninguém conseguiria fazer esses cursos.";
          return;
        }
        botao.disabled = true;
        Conta.cliente.from("cursos_config").upsert({
          curso_id: cursoId,
          visivel: cartao.querySelector('[data-campo="visivel"]').checked,
          abre_em: doCampoData(abre, false),
          fecha_em: doCampoData(fecha, true),
          prerequisitos: prereqs,
          prerequisito_modo: cartao.querySelector('input[type="radio"]:checked').value
        }, { onConflict: "curso_id" }).then(function (r) {
          botao.disabled = false;
          if (r.error) { msg.className = "mensagem erro"; msg.textContent = erroMsg(r.error); return; }
          return C.recarregarConfigCursos().then(function () {
            C.aviso("Configuração do curso salva.", "sucesso");
            renderCursos(el);
          });
        });
      });
    });
  }

  /* ---------- Aba: Equipe ---------- */
  function renderEquipe(el, d) {
    function pessoa(id) { return d.pessoas.filter(function (p) { return p.id === id; })[0]; }
    function listaNomes(pessoas) {
      if (!pessoas.length) return '<p class="suave">Ninguém ainda.</p>';
      return '<ul class="lista-equipe">' + pessoas.map(function (p) {
        return '<li><a href="#/painel/pessoa/' + esc(p.id) + '">' + esc(p.nome_completo || p.email) + "</a></li>";
      }).join("") + "</ul>";
    }
    function porPapel(papel) { return d.pessoas.filter(function (p) { return p.papel === papel; }); }
    function doCurso(cid, funcao) {
      return d.equipe.filter(function (e) { return e.curso_id === cid && e.funcao === funcao; })
        .map(function (e) { return pessoa(e.usuario_id) || { id: e.usuario_id, nome_completo: "(pessoa sem perfil)" }; });
    }

    el.innerHTML =
      '<div class="aviso-em-breve">' + C.icone.info +
        "<div><strong>Como colocar alguém na equipe</strong><p>A pessoa cria a conta dela normalmente no site. Depois, " +
        "um administrador procura o nome dela na aba <strong>Pessoas</strong>, abre o perfil e define o papel ou a função no curso.</p></div>" +
      "</div>" +
      '<div class="painel-grid">' +
        '<div class="cartao"><h3>Administração</h3>' + listaNomes(porPapel("admin")) + "</div>" +
        '<div class="cartao"><h3>Conselho geral</h3>' + listaNomes(porPapel("conselho")) + "</div>" +
      "</div>" +
      '<h2 style="margin-top:36px">Professores e tutores por curso</h2>' +
      '<div class="painel-grid">' + C.cursos.map(function (c) {
        return '<div class="cartao"><h3>' + esc(c.titulo) + "</h3>" +
          '<p class="rotulo-lista">Professores</p>' + listaNomes(doCurso(c.id, "professor")) +
          '<p class="rotulo-lista">Tutores</p>' + listaNomes(doCurso(c.id, "tutor")) +
        "</div>";
      }).join("") + "</div>";
  }

  window.Painel = { pagina: pagina };
})();
