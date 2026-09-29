-- ================================================================
-- CFM Maranatha — Etapa 2: níveis de acesso e painel administrativo
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- (Precisa ter rodado o 01-contas-e-progresso.sql antes.)
--
-- Níveis:
--   Papel geral (tabela perfis):  aluno | conselho | admin
--   Função em curso (equipe_curso): professor | tutor  — só nos cursos indicados
-- ================================================================


-- ---------- EQUIPE DOS CURSOS: professores e tutores ----------
create table if not exists public.equipe_curso (
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  curso_id    text not null check (char_length(curso_id) <= 100),
  funcao      text not null check (funcao in ('professor', 'tutor')),
  criado_em   timestamptz not null default now(),
  criado_por  uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (usuario_id, curso_id, funcao)
);


-- ---------- FUNÇÕES DE APOIO (quem é quem) ----------
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'admin'
  );
$$;

-- Cursos em que a pessoa logada é professora ou tutora
create or replace function public.cursos_que_atendo()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct curso_id from public.equipe_curso
  where usuario_id = (select auth.uid());
$$;

-- Pode ver os dados deste aluno? (conselho/admin: todos;
-- professor/tutor: quem estuda nos cursos que atende)
create or replace function public.pode_ver_aluno(aluno uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.eh_conselho() or exists (
    select 1
    from public.progresso p
    join public.equipe_curso e on e.curso_id = p.curso_id
    where p.usuario_id = aluno
      and e.usuario_id = (select auth.uid())
  );
$$;


-- ---------- REGRAS DE ACESSO (atualizadas) ----------

-- Perfis: cada um vê o seu; conselho/admin veem todos; professor/tutor veem seus alunos
drop policy if exists "perfis_ver" on public.perfis;
create policy "perfis_ver" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or public.pode_ver_aluno(id));

-- Progresso: cada um vê o seu; conselho/admin veem todos; professor/tutor veem o dos seus cursos
drop policy if exists "progresso_ver" on public.progresso;
create policy "progresso_ver" on public.progresso
  for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or public.eh_conselho()
    or curso_id in (select public.cursos_que_atendo())
  );

-- Equipe: cada um vê as próprias funções; conselho/admin veem todas; só admin muda
alter table public.equipe_curso enable row level security;

drop policy if exists "equipe_ver" on public.equipe_curso;
create policy "equipe_ver" on public.equipe_curso
  for select to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_conselho());

drop policy if exists "equipe_adicionar" on public.equipe_curso;
create policy "equipe_adicionar" on public.equipe_curso
  for insert to authenticated
  with check (public.eh_admin());

drop policy if exists "equipe_remover" on public.equipe_curso;
create policy "equipe_remover" on public.equipe_curso
  for delete to authenticated
  using (public.eh_admin());

revoke all on public.equipe_curso from anon, authenticated;
grant select, insert, delete on public.equipe_curso to authenticated;


-- ---------- MUDAR O PAPEL DE ALGUÉM (só admin) ----------
create or replace function public.definir_papel(pessoa uuid, novo_papel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'Somente administradores podem mudar o acesso de alguém.';
  end if;
  if pessoa = (select auth.uid()) then
    raise exception 'Você não pode mudar o seu próprio acesso. Peça a outro administrador.';
  end if;
  if novo_papel not in ('aluno', 'conselho', 'admin') then
    raise exception 'Papel inválido: %', novo_papel;
  end if;

  update public.perfis set papel = novo_papel where id = pessoa;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;
end;
$$;

revoke execute on function public.definir_papel(uuid, text) from public, anon;
grant execute on function public.definir_papel(uuid, text) to authenticated;


-- ---------- RESUMO DE PROGRESSO (para o painel) ----------
-- Respeita as regras acima: cada pessoa só recebe o que pode ver.
create or replace function public.resumo_progresso()
returns table (usuario_id uuid, curso_id text, aulas_concluidas int, ultima_atividade timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.usuario_id, p.curso_id, count(*)::int, max(p.concluida_em)
  from public.progresso p
  group by p.usuario_id, p.curso_id;
$$;

revoke execute on function public.resumo_progresso() from public, anon;
grant execute on function public.resumo_progresso() to authenticated;
