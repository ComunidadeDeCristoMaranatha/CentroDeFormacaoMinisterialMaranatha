-- ================================================================
-- CFM Maranatha — Etapa 3: mostrar/esconder cursos e datas de abertura
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- (Precisa ter rodado o 01 e o 02 antes.)
--
-- Regras:
--   - Qualquer visitante pode LER (o site precisa saber o que mostrar).
--   - Só ADMINISTRADORES podem mudar.
--   - Curso sem linha nesta tabela = aparece normalmente.
-- ================================================================

create table if not exists public.cursos_config (
  curso_id        text primary key check (char_length(curso_id) <= 100),
  visivel         boolean not null default true,  -- false = escondido do site
  abre_em         timestamptz,                    -- antes disso: aparece como "Abre em ..."
  fecha_em        timestamptz,                    -- depois disso: some do site sozinho
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid default auth.uid() references auth.users (id) on delete set null,
  constraint datas_em_ordem check (abre_em is null or fecha_em is null or fecha_em > abre_em)
);

-- Guarda quem mudou e quando
create or replace function public.marcar_mudanca_curso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  new.atualizado_por = (select auth.uid());
  return new;
end;
$$;

drop trigger if exists cursos_config_mudanca on public.cursos_config;
create trigger cursos_config_mudanca
  before insert or update on public.cursos_config
  for each row execute function public.marcar_mudanca_curso();

alter table public.cursos_config enable row level security;

drop policy if exists "cursos_config_ler" on public.cursos_config;
create policy "cursos_config_ler" on public.cursos_config
  for select to anon, authenticated
  using (true);

drop policy if exists "cursos_config_criar" on public.cursos_config;
create policy "cursos_config_criar" on public.cursos_config
  for insert to authenticated
  with check (public.eh_admin());

drop policy if exists "cursos_config_editar" on public.cursos_config;
create policy "cursos_config_editar" on public.cursos_config
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists "cursos_config_apagar" on public.cursos_config;
create policy "cursos_config_apagar" on public.cursos_config
  for delete to authenticated
  using (public.eh_admin());

revoke all on public.cursos_config from anon, authenticated;
grant select on public.cursos_config to anon, authenticated;
grant insert, update, delete on public.cursos_config to authenticated;

-- O Curso de Integração começa ESCONDIDO. Depois, o admin libera e
-- programa as datas pelo site (Painel → Cursos).
insert into public.cursos_config (curso_id, visivel)
values ('integracao', false)
on conflict (curso_id) do nothing;
