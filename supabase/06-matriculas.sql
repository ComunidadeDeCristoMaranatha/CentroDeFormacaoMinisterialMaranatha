-- ================================================================
-- CFM Maranatha — Etapa 6: matrícula (registrar quando o aluno inicia um curso)
--
-- O curso passa a contar como "iniciado" assim que o aluno abre uma aula,
-- mesmo sem concluir nenhuma. Também guarda a última aula visitada,
-- para o botão "Continuar" levar direto de volta a ela.
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- ================================================================

create table if not exists public.matriculas (
  usuario_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  curso_id          text not null check (char_length(curso_id) <= 100),
  iniciado_em       timestamptz not null default now(),
  ultima_aula_id    text check (char_length(ultima_aula_id) <= 100),
  ultima_visita_em  timestamptz not null default now(),
  primary key (usuario_id, curso_id)
);

alter table public.matriculas enable row level security;

-- Cada aluno vê as próprias; conselho/admin veem todas; professor/tutor veem as dos seus cursos
drop policy if exists "matriculas_ver" on public.matriculas;
create policy "matriculas_ver" on public.matriculas
  for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or public.eh_conselho()
    or curso_id in (select public.cursos_que_atendo())
  );

-- Cada aluno cria e atualiza só a própria matrícula
drop policy if exists "matriculas_criar" on public.matriculas;
create policy "matriculas_criar" on public.matriculas
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

drop policy if exists "matriculas_atualizar" on public.matriculas;
create policy "matriculas_atualizar" on public.matriculas
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke all on public.matriculas from anon, authenticated;
grant select, insert, update on public.matriculas to authenticated;


-- Professor/tutor passam a ver também quem só iniciou (sem aula concluída) nos cursos deles
create or replace function public.pode_ver_aluno(aluno uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.eh_conselho()
    or exists (
      select 1
      from public.progresso p
      join public.equipe_curso e on e.curso_id = p.curso_id
      where p.usuario_id = aluno and e.usuario_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.matriculas m
      join public.equipe_curso e on e.curso_id = m.curso_id
      where m.usuario_id = aluno and e.usuario_id = (select auth.uid())
    );
$$;


-- Quem já tinha aula concluída ganha a matrícula automaticamente (com a data da 1ª aula concluída)
insert into public.matriculas (usuario_id, curso_id, iniciado_em, ultima_visita_em)
select usuario_id, curso_id, min(concluida_em), max(concluida_em)
from public.progresso
group by usuario_id, curso_id
on conflict (usuario_id, curso_id) do nothing;
