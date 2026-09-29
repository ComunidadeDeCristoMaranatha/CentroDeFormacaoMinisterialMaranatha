# Guia: configurando o login de alunos (Supabase)

O **Supabase** é o serviço que guarda as contas dos alunos e os dados deles, com segurança. O plano gratuito atende bem o começo da plataforma.

Tempo estimado: **15 minutos** (partes 1 a 4). O login com Google (parte 5) pode ficar para depois.

> 💡 **Dica importante:** crie a conta do Supabase com um e-mail **da igreja/CFM**, não um e-mail pessoal. Assim, a plataforma continua pertencendo ao ministério mesmo se alguém da equipe mudar.

---

## Parte 1 — Criar o projeto

1. Acesse **https://supabase.com** e clique em **Start your project**.
2. Crie a conta (pode usar **Continue with GitHub**, com a conta do GitHub da igreja).
3. Crie uma **organização**: nome `Comunidade de Cristo Maranatha`, plano **Free**.
4. Clique em **New project** e preencha:
   - **Name:** `cfm-maranatha`
   - **Database Password:** clique em **Generate a password** e **guarde essa senha num lugar seguro**. Não precisa me enviar.
   - **Region:** **South America (São Paulo)**. Fica mais perto dos alunos e o site fica mais rápido.
5. Clique em **Create new project** e aguarde uns 2 minutos.

## Parte 2 — Criar as tabelas (onde ficam os dados)

1. No menu da esquerda, clique em **SQL Editor**.
2. Abra o arquivo `supabase/01-contas-e-progresso.sql` (desta pasta) num editor de texto, copie **tudo** e cole no Supabase.
3. Clique em **Run**. Deve aparecer **"Success. No rows returned"**.

## Parte 3 — Configurar o login

1. Menu **Authentication** → **Sign In / Providers**.
2. Em **Email**: deixe ligado, **desligue a opção "Confirm email"** e clique em **Save**.
   - *Por quê?* O Supabase gratuito só envia poucos e-mails por hora. Sem a confirmação, o aluno cria a conta e já entra direto. Mais para frente, quando configurarmos um serviço de e-mail próprio, podemos ligar de novo.
3. Menu **Authentication** → **URL Configuration**:
   - **Site URL:** `https://comunidadedecristomaranatha.github.io/CentroDeFormacaoMinisterialMaranatha/`
   - Em **Redirect URLs**, clique em **Add URL** e adicione estes dois endereços:
     - `https://comunidadedecristomaranatha.github.io/CentroDeFormacaoMinisterialMaranatha/`
     - `http://localhost:5577/` (usado só para testes no computador)
   - Clique em **Save**.

## Parte 4 — Me enviar 2 informações

Clique no botão **Connect** no topo do projeto (ou vá em **Project Settings → API Keys**) e me envie:

1. **Project URL**: algo como `https://abcdefghij.supabase.co`
2. **Publishable key** (começa com `sb_publishable_...`). Se aparecer a versão antiga, é a chave **anon / public**.

Essas duas informações são **públicas por natureza**: elas ficam no próprio site, e a segurança está nas regras que o arquivo SQL criou.

> ⛔ **NUNCA envie** (nem para mim, nem para ninguém) a **secret key** / **service_role**, nem a **senha do banco de dados**. Essas dão acesso total aos dados.

Com isso, eu ligo o login no site, testo tudo e publico.

---

## Parte 5 — Login com Google (pode ser depois)

1. Acesse **https://console.cloud.google.com** com a conta Google da igreja e crie um projeto chamado `CFM Maranatha`.
2. Vá em **APIs e serviços → Tela de consentimento OAuth** (ou **Google Auth Platform**):
   - **Nome do app:** `Centro de Formação Ministerial Maranatha`
   - **E-mail de suporte:** o e-mail da igreja/CFM
   - **Público-alvo:** **Externo**
   - Depois de salvar, clique em **Publicar app** (status "Em produção").
3. Vá em **Clientes** (ou **Credenciais**) → **Criar cliente** → tipo **Aplicativo da Web**:
   - **Origens JavaScript autorizadas:** `https://comunidadedecristomaranatha.github.io`
   - **URIs de redirecionamento autorizados:** copie o endereço que aparece no Supabase em **Authentication → Sign In / Providers → Google → Callback URL** (algo como `https://abcdefghij.supabase.co/auth/v1/callback`).
   - Clique em **Criar**. O Google mostra um **ID do cliente** e uma **Chave secreta do cliente**.
4. No Supabase, em **Authentication → Sign In / Providers → Google**: ligue o Google, cole o **Client ID** e o **Client Secret** e clique em **Save**.
   - Cole a chave secreta **direto no Supabase**. Não precisa me enviar.
5. Me avise, que eu ligo o botão **"Continuar com Google"** no site.

---

## Bom saber

- **Pausa por falta de uso:** no plano gratuito, o Supabase pausa o projeto se ele ficar **7 dias sem nenhum acesso**. Com alunos usando, isso não acontece. Mesmo assim, vou configurar um "acesso automático" semanal para evitar a pausa.
- **Recuperação de senha:** funciona desde o início, mas com o limite de poucos e-mails por hora do plano gratuito. Quando o número de alunos crescer, configuramos um serviço de e-mail gratuito (ex.: Brevo ou Resend) para tirar esse limite.
- **Etapa 2 (níveis de acesso):** rode também o arquivo `supabase/02-niveis-de-acesso.sql` no **SQL Editor**, do mesmo jeito que o primeiro.
- **Etapa 3 (mostrar/esconder cursos):** rode o arquivo `supabase/03-visibilidade-dos-cursos.sql`. Depois disso, os administradores controlam os cursos em **Painel → Cursos**.
- **Etapa 5 (nomes padronizados):** rode o arquivo `supabase/05-padronizar-nomes.sql`. Ele corrige os nomes já salvos (ex.: "MARIA DA SILVA" vira "Maria da Silva") e passa a padronizar todo nome novo. No final aparece um teste: o resultado deve ser "José da Silva Ávila de Souza e Castro".
- **Etapa 4 (pré-requisitos):** rode o arquivo `supabase/04-pre-requisitos.sql`. Os pré-requisitos ficam em **Painel → Cursos**, e a liberação de um aluno sem pré-requisito fica na página da pessoa (**Painel → Pessoas → nome**).
- **O primeiro administrador:** a pessoa cria a conta normalmente no site. Depois, no **SQL Editor**, rode (trocando o e-mail):
  ```sql
  update public.perfis set papel = 'admin' where email = 'email@exemplo.com';
  ```
  A partir daí, o próprio admin define o acesso das outras pessoas (conselho, professor, tutor) pelo **Painel** do site, sem precisar de SQL.
- **Ver os alunos cadastrados:** menu **Table Editor → perfis**.
