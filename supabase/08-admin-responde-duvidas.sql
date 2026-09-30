-- ================================================================
-- CFM Maranatha — Etapa 8: administradores também respondem dúvidas
--
-- Quem pode responder: professor ou tutor do curso, OU administrador.
-- Etiqueta na resposta (definida aqui no banco, ninguém escolhe a sua):
--   professor do curso  → "professor"  (vale mesmo se também for admin)
--   tutor do curso      → "tutor"      (vale mesmo se também for admin)
--   admin sem função no curso → "admin"
--
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Precisa ter rodado o 07 antes.
-- ================================================================

create or replace function public.pode_responder(duvida uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.eh_admin() or exists (
    select 1
    from public.duvidas d
    join public.equipe_curso e on e.curso_id = d.curso_id
    where d.id = duvida and e.usuario_id = (select auth.uid())
  );
$$;

create or replace function public.preencher_autor_resposta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.autor_id := (select auth.uid());
  new.autor_nome := public.nome_publico(new.autor_id);
  -- Professor tem prioridade sobre tutor; e os dois têm prioridade sobre admin
  new.autor_funcao := coalesce(
    (
      select e.funcao
      from public.equipe_curso e
      join public.duvidas d on d.curso_id = e.curso_id
      where d.id = new.duvida_id and e.usuario_id = new.autor_id
      order by (e.funcao = 'professor') desc
      limit 1
    ),
    case when public.eh_admin() then 'admin' end
  );
  new.criado_em := now();
  return new;
end;
$$;
