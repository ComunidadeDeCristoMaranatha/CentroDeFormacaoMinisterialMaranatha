-- ================================================================
-- CFM Maranatha — Etapa 4: pré-requisitos entre cursos
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- (Precisa ter rodado o 01, 02 e 03 antes.)
-- ================================================================


-- ---------- Pré-requisitos de cada curso (definidos pelo admin no Painel → Cursos) ----------
alter table public.cursos_config
  add column if not exists prerequisitos text[] not null default '{}';

-- "qualquer" = basta concluir UM dos cursos da lista · "todos" = precisa concluir TODOS
alter table public.cursos_config
  add column if not exists prerequisito_modo text not null default 'qualquer';

alter table public.cursos_config drop constraint if exists prerequisito_modo_valido;
alter table public.cursos_config
  add constraint prerequisito_modo_valido check (prerequisito_modo in ('qualquer', 'todos'));


-- ---------- Liberações: alunos que podem fazer um curso sem o pré-requisito ----------
create table if not exists public.prerequisito_dispensas (
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  curso_id      text not null check (char_length(curso_id) <= 100),
  motivo        text check (char_length(motivo) <= 300),
  concedido_por uuid default auth.uid() references auth.users (id) on delete set null,
  concedido_em  timestamptz not null default now(),
  primary key (usuario_id, curso_id)
);

alter table public.prerequisito_dispensas enable row level security;

-- O aluno vê as próprias liberações; conselho/admin veem todas
drop policy if exists "dispensas_ver" on public.prerequisito_dispensas;
create policy "dispensas_ver" on public.prerequisito_dispensas
  for select to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_conselho());

-- Só admin libera ou retira
drop policy if exists "dispensas_criar" on public.prerequisito_dispensas;
create policy "dispensas_criar" on public.prerequisito_dispensas
  for insert to authenticated
  with check (public.eh_admin());

drop policy if exists "dispensas_remover" on public.prerequisito_dispensas;
create policy "dispensas_remover" on public.prerequisito_dispensas
  for delete to authenticated
  using (public.eh_admin());

revoke all on public.prerequisito_dispensas from anon, authenticated;
grant select, insert, delete on public.prerequisito_dispensas to authenticated;


-- ---------- Pré-requisitos iniciais (decisão do colegiado) ----------
-- Cosmovisão Bíblica  → precisa de Fundamentos da Fé
-- Fundamentos da Fé   → precisa do Curso de Integração OU do Curso de Batismo
-- (Depois o admin pode mudar tudo pelo site. Isto não mexe em "visível" nem nas datas.)
insert into public.cursos_config (curso_id, prerequisitos, prerequisito_modo)
values
  ('cosmovisao-biblica', array['fundamentos-da-fe'], 'todos'),
  ('fundamentos-da-fe', array['integracao', 'curso-de-batismo'], 'qualquer')
on conflict (curso_id) do update
  set prerequisitos = excluded.prerequisitos,
      prerequisito_modo = excluded.prerequisito_modo;
