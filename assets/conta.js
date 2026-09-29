/* ============================================================
   Contas de alunos e progresso — conversa com o Supabase
   Esta parte cuida dos dados; as telas ficam em app.js.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.CFM_CONFIG || {};
  var ativo = !!(cfg.supabaseUrl && cfg.supabaseChave && window.supabase);
  var cliente = ativo
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseChave, {
        auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
      })
    : null;

  var CHAVE_LOCAL = "cfm-progresso-v1";
  var estado = { pronto: !ativo, usuario: null, perfil: null, progresso: {}, acaoUrl: null, erroUrl: null, acabouDeEntrar: false };
  var ouvintes = [];

  function avisar(evento, detalhe) {
    ouvintes.forEach(function (fn) { try { fn(evento, detalhe); } catch (e) { console.error(e); } });
  }
  function urlBase() { return location.origin + location.pathname; }

  /* ---------- Progresso guardado no navegador (quando não há login) ---------- */
  function lerLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || {}; } catch (e) { return {}; }
  }
  function salvarLocal() {
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(estado.progresso)); } catch (e) { /* navegador bloqueou */ }
  }
  function limparLocal() {
    try { localStorage.removeItem(CHAVE_LOCAL); } catch (e) { /* nada a fazer */ }
  }
  estado.progresso = lerLocal();

  /* ---------- Depois de entrar: carrega perfil e junta o progresso ---------- */
  async function carregarPerfil() {
    var r = await cliente.from("perfis").select("*").eq("id", estado.usuario.id).maybeSingle();
    if (r.error) throw r.error;
    estado.perfil = r.data;
  }

  async function sincronizarProgresso() {
    // O que o aluno marcou antes de entrar na conta é enviado para a conta
    var local = lerLocal();
    var linhas = [];
    Object.keys(local).forEach(function (curso) {
      Object.keys(local[curso] || {}).forEach(function (aula) {
        linhas.push({ usuario_id: estado.usuario.id, curso_id: curso, aula_id: aula, concluida_em: new Date(local[curso][aula]).toISOString() });
      });
    });
    if (linhas.length) {
      var envio = await cliente.from("progresso").upsert(linhas, { onConflict: "usuario_id,curso_id,aula_id", ignoreDuplicates: true });
      if (envio.error) throw envio.error;
    }
    limparLocal();

    var r = await cliente.from("progresso").select("curso_id, aula_id, concluida_em");
    if (r.error) throw r.error;
    var p = {};
    r.data.forEach(function (l) {
      p[l.curso_id] = p[l.curso_id] || {};
      p[l.curso_id][l.aula_id] = new Date(l.concluida_em).getTime();
    });
    estado.progresso = p;
  }

  async function aposLogin() {
    try {
      await carregarPerfil();
      await sincronizarProgresso();
    } catch (e) {
      console.error(e);
      avisar("erro", "Não foi possível carregar seus dados agora. Tente atualizar a página.");
    }
  }

  function aoSair() {
    estado.usuario = null;
    estado.perfil = null;
    estado.progresso = {};
    limparLocal();
  }

  /* ---------- Inicialização ---------- */
  async function iniciar() {
    if (!ativo) return;
    var params = new URLSearchParams(location.search);
    estado.acaoUrl = params.get("acao");
    estado.erroUrl = params.get("error_description");

    try {
      var r = await cliente.auth.getSession(); // também conclui o login que voltou do Google / link de e-mail
      if (r.error) estado.erroUrl = estado.erroUrl || r.error.message;
      estado.usuario = r.data.session ? r.data.session.user : null;
    } catch (e) {
      console.error(e);
      estado.erroUrl = estado.erroUrl || e.message;
    }

    // Voltou do Google ou de um link de e-mail já com a conta aberta
    estado.acabouDeEntrar = !!(params.get("code") && estado.usuario);

    // Tira ?code=... e afins do endereço, mantendo a página atual
    if (location.search) history.replaceState(null, "", location.pathname + location.hash);

    if (estado.usuario) await aposLogin();
    estado.pronto = true;
    avisar("pronto");

    cliente.auth.onAuthStateChange(function (evento, sessao) {
      // O Supabase recomenda não chamar o banco direto aqui dentro
      setTimeout(function () { tratarMudanca(evento, sessao); }, 0);
    });
  }

  async function tratarMudanca(evento, sessao) {
    var novo = sessao ? sessao.user : null;
    if (evento === "SIGNED_OUT" || !novo) {
      if (estado.usuario) { aoSair(); avisar("saiu"); }
      return;
    }
    var mesmo = estado.usuario && estado.usuario.id === novo.id;
    estado.usuario = novo;
    if (!mesmo) {
      await aposLogin();
      avisar("entrou");
    }
  }

  /* ---------- Ações de conta ---------- */
  function lembrarDestino(destino) {
    try { if (destino) sessionStorage.setItem("cfm-voltar", destino); } catch (e) { /* ok */ }
  }
  function pegarDestino() {
    var d = null;
    try { d = sessionStorage.getItem("cfm-voltar"); sessionStorage.removeItem("cfm-voltar"); } catch (e) { /* ok */ }
    return d;
  }

  async function entrarComGoogle() {
    var r = await cliente.auth.signInWithOAuth({ provider: "google", options: { redirectTo: urlBase() } });
    if (r.error) throw r.error;
  }
  async function entrarComEmail(email, senha) {
    var r = await cliente.auth.signInWithPassword({ email: email, password: senha });
    if (r.error) throw r.error;
  }
  async function criarConta(nome, email, senha) {
    var r = await cliente.auth.signUp({
      email: email, password: senha,
      options: { data: { nome_completo: nome }, emailRedirectTo: urlBase() }
    });
    if (r.error) throw r.error;
    // Sem sessão = o Supabase está pedindo confirmação por e-mail
    return { precisaConfirmar: !r.data.session };
  }
  async function recuperarSenha(email) {
    var r = await cliente.auth.resetPasswordForEmail(email, { redirectTo: urlBase() + "?acao=nova-senha" });
    if (r.error) throw r.error;
  }
  async function definirNovaSenha(senha) {
    var r = await cliente.auth.updateUser({ password: senha });
    if (r.error) throw r.error;
  }
  async function salvarPerfil(dados) {
    var r = await cliente.from("perfis").update(dados).eq("id", estado.usuario.id).select().single();
    if (r.error) throw r.error;
    estado.perfil = r.data;
    avisar("perfil");
  }
  async function sair() {
    await cliente.auth.signOut();
    aoSair();
    avisar("saiu");
  }
  async function excluirConta() {
    var r = await cliente.rpc("excluir_minha_conta");
    if (r.error) throw r.error;
    await cliente.auth.signOut();
    aoSair();
    avisar("saiu");
  }

  function perfilCompleto() {
    var p = estado.perfil;
    return !!(p && p.nome_completo && p.telefone && p.cidade && p.estado && p.igreja && p.aceitou_termos_em);
  }

  /* ---------- Marcar aulas ---------- */
  function concluida(cursoId, aulaId) {
    return !!(estado.progresso[cursoId] && estado.progresso[cursoId][aulaId]);
  }

  function alternar(cursoId, aulaId) {
    var feito = concluida(cursoId, aulaId);
    estado.progresso[cursoId] = estado.progresso[cursoId] || {};
    if (feito) delete estado.progresso[cursoId][aulaId];
    else estado.progresso[cursoId][aulaId] = Date.now();

    if (!estado.usuario) { salvarLocal(); return; }

    // Com login: mostra na hora e salva no servidor; se falhar, desfaz
    var pedido = feito
      ? cliente.from("progresso").delete().match({ usuario_id: estado.usuario.id, curso_id: cursoId, aula_id: aulaId })
      : cliente.from("progresso").upsert({ usuario_id: estado.usuario.id, curso_id: cursoId, aula_id: aulaId },
          { onConflict: "usuario_id,curso_id,aula_id", ignoreDuplicates: true });
    pedido.then(function (r) {
      if (!r.error) return;
      console.error(r.error);
      if (feito) estado.progresso[cursoId][aulaId] = Date.now();
      else delete estado.progresso[cursoId][aulaId];
      avisar("progresso");
      avisar("erro", "Não foi possível salvar. Verifique sua internet e tente de novo.");
    });
  }

  window.Conta = {
    ativo: ativo,
    googleAtivo: ativo && !!cfg.googleAtivo,
    estado: estado,
    aoMudar: function (fn) { ouvintes.push(fn); },
    iniciar: iniciar,
    perfilCompleto: perfilCompleto,
    lembrarDestino: lembrarDestino,
    pegarDestino: pegarDestino,
    entrarComGoogle: entrarComGoogle,
    entrarComEmail: entrarComEmail,
    criarConta: criarConta,
    recuperarSenha: recuperarSenha,
    definirNovaSenha: definirNovaSenha,
    salvarPerfil: salvarPerfil,
    sair: sair,
    excluirConta: excluirConta,
    concluida: concluida,
    alternar: alternar
  };
})();
