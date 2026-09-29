/* ============================================================
   Configuração da conexão com o Supabase (login e dados dos alunos)

   Enquanto supabaseUrl e supabaseChave estiverem vazios, o site
   funciona sem login (o progresso fica só no navegador).

   supabaseChave = a chave PÚBLICA do projeto ("anon" ou "publishable").
   Ela pode ficar aqui sem problema: foi feita para ficar no site.
   NUNCA coloque aqui a chave "service_role" ou "secret".
   ============================================================ */
window.CFM_CONFIG = {
  supabaseUrl: "https://oowpqzvqjhznvkfitmci.supabase.co",
  supabaseChave: "sb_publishable_ktrD5J3-r6B66hFYSQeRhg_AtA0a3Zr",
  googleAtivo: false // mude para true depois de configurar o login com Google no Supabase
};
