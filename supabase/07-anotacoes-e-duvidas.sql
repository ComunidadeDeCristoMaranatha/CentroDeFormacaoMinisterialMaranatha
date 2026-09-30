-- ================================================================
-- CFM Maranatha — Etapa 7: anotações pessoais e dúvidas por aula
--
-- ANOTAÇÕES: particulares. Só o próprio aluno lê e escreve.
-- DÚVIDAS:   visíveis para todos na aula. Qualquer aluno com conta
--            pergunta; só o PROFESSOR ou TUTOR daquele curso responde.
--            Para quem vê, aparece só "Primeiro nome + inicial" (ex.: Maria S.).
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- ================================================================


-- ---------- ANOTAÇÕES ----------
create table if not exists public.anotacoes (
  usuario_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  curso_id      text not null check (char_length(curso_id) <= 100),
  aula_id       text not null check (char_length(aula_id) <= 100),
  texto         text not null check (char_length(texto) <= 5000),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, curso_id, aula_id)
);

alter table public.anotacoes enable row level security;

drop policy if exists "anotacoes_dono" on public.anotacoes;
create policy "anotacoes_dono" on public.anotacoes
  for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke all on public.anotacoes from anon, authenticated;
grant select, insert, update, delete on public.anotacoes to authenticated;


-- ---------- Nome público: "Maria da Silva Souza" → "Maria S." ----------
create or replace function public.nome_publico(pessoa uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when array_length(partes, 1) > 1 then partes[1] || ' ' || left(partes[array_length(partes, 1)], 1) || '.'
    else coalesce(partes[1], 'Aluno')
  end
  from (
    select regexp_split_to_array(btrim(coalesce(nome_completo, '')), '\s+') as partes
    from public.perfis where id = pessoa
  ) n;
$$;


-- ---------- DÚVIDAS (perguntas) ----------
create table if not exists public.duvidas (
  id         uuid primary key default gen_random_uuid(),
  curso_id   text not null check (char_length(curso_id) <= 100),
  aula_id    text not null check (char_length(aula_id) <= 100),
  autor_id   uuid default auth.uid() references auth.users (id) on delete cascade,
  autor_nome text,
  texto      text not null check (char_length(btrim(texto)) between 3 and 2000),
  criado_em  timestamptz not null default now()
);
create index if not exists duvidas_aula on public.duvidas (curso_id, aula_id);

-- ---------- RESPOSTAS (só professor/tutor do curso) ----------
create table if not exists public.respostas (
  id           uuid primary key default gen_random_uuid(),
  duvida_id    uuid not null references public.duvidas (id) on delete cascade,
  autor_id     uuid default auth.uid() references auth.users (id) on delete set null,
  autor_nome   text,
  autor_funcao text,
  texto        text not null check (char_length(btrim(texto)) between 1 and 3000),
  criado_em    timestamptz not null default now()
);
create index if not exists respostas_duvida on public.respostas (duvida_id);

-- Quem pode responder esta dúvida? Professor ou tutor do curso dela.
create or replace function public.pode_responder(duvida uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.duvidas d
    join public.equipe_curso e on e.curso_id = d.curso_id
    where d.id = duvida and e.usuario_id = (select auth.uid())
  );
$$;

-- Preenche autor, nome público e data automaticamente (ninguém consegue se passar por outro)
create or replace function public.preencher_autor_duvida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.autor_id := (select auth.uid());
  new.autor_nome := public.nome_publico(new.autor_id);
  new.criado_em := now();
  return new;
end;
$$;

drop trigger if exists duvidas_autor on public.duvidas;
create trigger duvidas_autor
  before insert on public.duvidas
  for each row execute function public.preencher_autor_duvida();

create or replace function public.preencher_autor_resposta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.autor_id := (select auth.uid());
  new.autor_nome := public.nome_publico(new.autor_id);
  new.autor_funcao := (
    select e.funcao
    from public.equipe_curso e
    join public.duvidas d on d.curso_id = e.curso_id
    where d.id = new.duvida_id and e.usuario_id = new.autor_id
    order by (e.funcao = 'professor') desc
    limit 1
  );
  new.criado_em := now();
  return new;
end;
$$;

drop trigger if exists respostas_autor on public.respostas;
create trigger respostas_autor
  before insert on public.respostas
  for each row execute function public.preencher_autor_resposta();


-- ---------- REGRAS DE ACESSO ----------
alter table public.duvidas enable row level security;
alter table public.respostas enable row level security;

-- Todos veem (inclusive quem não tem conta, na 1ª aula aberta)
drop policy if exists "duvidas_ver" on public.duvidas;
create policy "duvidas_ver" on public.duvidas for select to anon, authenticated using (true);

drop policy if exists "respostas_ver" on public.respostas;
create policy "respostas_ver" on public.respostas for select to anon, authenticated using (true);

-- Perguntar: qualquer pessoa com conta
drop policy if exists "duvidas_perguntar" on public.duvidas;
create policy "duvidas_perguntar" on public.duvidas
  for insert to authenticated
  with check ((select auth.uid()) is not null);

-- Apagar pergunta: o próprio autor, ou conselho/admin (moderação)
drop policy if exists "duvidas_apagar" on public.duvidas;
create policy "duvidas_apagar" on public.duvidas
  for delete to authenticated
  using (autor_id = (select auth.uid()) or public.eh_conselho());

-- Responder: só professor/tutor do curso daquela dúvida
drop policy if exists "respostas_responder" on public.respostas;
create policy "respostas_responder" on public.respostas
  for insert to authenticated
  with check (public.pode_responder(duvida_id));

-- Apagar resposta: quem respondeu, ou conselho/admin
drop policy if exists "respostas_apagar" on public.respostas;
create policy "respostas_apagar" on public.respostas
  for delete to authenticated
  using (autor_id = (select auth.uid()) or public.eh_conselho());

revoke all on public.duvidas from anon, authenticated;
revoke all on public.respostas from anon, authenticated;
grant select on public.duvidas, public.respostas to anon, authenticated;
grant insert, delete on public.duvidas, public.respostas to authenticated;
