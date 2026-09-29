-- ================================================================
-- CFM Maranatha — Etapa 1: contas de alunos e progresso
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar mais de uma vez sem problema.
-- ================================================================


-- ---------- PERFIS: os dados de cada aluno ----------
create table if not exists public.perfis (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome_completo     text check (char_length(nome_completo) <= 150),
  email             text,
  telefone          text check (char_length(telefone) <= 30),
  cidade            text check (char_length(cidade) <= 100),
  estado            text check (char_length(estado) <= 2),
  igreja            text check (char_length(igreja) <= 150),
  aceitou_termos_em timestamptz,
  -- aluno | conselho | admin  (o aluno NÃO consegue mudar isso sozinho)
  papel             text not null default 'aluno' check (papel in ('aluno', 'conselho', 'admin')),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém cria uma conta
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome_completo, email)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'nome_completo',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ), 150),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Mantém o e-mail do perfil igual ao da conta, se a pessoa trocar
create or replace function public.atualizar_email_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfis set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists ao_mudar_email on auth.users;
create trigger ao_mudar_email
  after update of email on auth.users
  for each row execute function public.atualizar_email_perfil();

-- Atualiza a data de "atualizado_em" a cada alteração
create or replace function public.marcar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.marcar_atualizacao();

-- Diz se quem está usando é do conselho (ou admin). Será usado nas próximas etapas.
create or replace function public.eh_conselho()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel in ('conselho', 'admin')
  );
$$;


-- ---------- PROGRESSO: aulas concluídas por cada aluno ----------
create table if not exists public.progresso (
  usuario_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  curso_id     text not null check (char_length(curso_id) <= 100),
  aula_id      text not null check (char_length(aula_id) <= 100),
  concluida_em timestamptz not null default now(),
  primary key (usuario_id, curso_id, aula_id)
);


-- ---------- SEGURANÇA (quem pode ver e mudar o quê) ----------
alter table public.perfis    enable row level security;
alter table public.progresso enable row level security;

-- Perfis: cada um vê o seu; conselho vê todos
drop policy if exists "perfis_ver" on public.perfis;
create policy "perfis_ver" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or public.eh_conselho());

-- Perfis: cada um edita só o seu
drop policy if exists "perfis_editar" on public.perfis;
create policy "perfis_editar" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- O aluno só pode alterar estas colunas (e nunca o "papel" ou o e-mail)
revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (nome_completo, telefone, cidade, estado, igreja, aceitou_termos_em) on public.perfis to authenticated;

-- Progresso: cada um vê, marca e desmarca só o seu; conselho vê todos
drop policy if exists "progresso_ver" on public.progresso;
create policy "progresso_ver" on public.progresso
  for select to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_conselho());

drop policy if exists "progresso_marcar" on public.progresso;
create policy "progresso_marcar" on public.progresso
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

drop policy if exists "progresso_desmarcar" on public.progresso;
create policy "progresso_desmarcar" on public.progresso
  for delete to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on public.progresso from anon, authenticated;
grant select, insert, delete on public.progresso to authenticated;


-- ---------- EXCLUIR MINHA CONTA (direito do aluno pela LGPD) ----------
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'É preciso estar logado.';
  end if;
  delete from auth.users where id = (select auth.uid());  -- apaga perfil e progresso junto
end;
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;


-- ================================================================
-- DEPOIS: para tornar alguém ADMIN ou do CONSELHO, a pessoa cria a
-- conta normalmente no site e depois você roda (trocando o e-mail):
--
--   update public.perfis set papel = 'admin' where email = 'email@exemplo.com';
--   update public.perfis set papel = 'conselho' where email = 'email@exemplo.com';
-- ================================================================
