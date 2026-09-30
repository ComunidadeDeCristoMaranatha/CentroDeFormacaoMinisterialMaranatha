-- ================================================================
-- CFM Maranatha — Etapa 10: aulas em ordem
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- (Precisa ter rodado o 03 antes.)
--
-- Regra: com "aulas em ordem" ligado, cada aula só abre depois que o
-- aluno conclui a anterior. Vem LIGADO em todos os cursos; o admin
-- desliga por curso em Painel → Cursos.
-- ================================================================

alter table public.cursos_config
  add column if not exists aulas_em_ordem boolean not null default true;
