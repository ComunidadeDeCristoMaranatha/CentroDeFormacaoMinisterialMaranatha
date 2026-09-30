# Guia: cópia de segurança semanal

Todo domingo, o próprio GitHub faz uma **cópia de todos os dados da plataforma**: cadastros, contas, progresso, matrículas, anotações, dúvidas e configurações dos cursos. Cada cópia fica guardada por **90 dias**. É **gratuito**.

> 🔒 O repositório do GitHub é **público**. Por isso, cada cópia sai **criptografada** (trancada) com uma senha que **só a igreja** tem. Sem essa senha, o arquivo é ilegível, mesmo que alguém o baixe.

Tempo estimado: **10 minutos**, uma vez só.

---

## Parte 1 — Pegar o "endereço do banco" no Supabase

1. No Supabase, clique no botão verde **Connect**, no topo.
2. Procure a opção **Session pooler** (em "Connection string" / "Connection method"). **Tem que ser a "Session pooler"**: as outras não funcionam no GitHub.
3. Copie o endereço. Ele é parecido com:
   `postgresql://postgres.oowpqzvqjhznvkfitmci:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
4. Troque `[YOUR-PASSWORD]` (com os colchetes) pela **senha do banco de dados**, aquela que você guardou quando criou o projeto.
   - **Esqueceu a senha?** Vá em **Project Settings → Database → Reset database password** e crie uma nova. Isso **não afeta o site**.
   - Use uma senha **só com letras e números**. Símbolos como `@`, `#` e `/` atrapalham o endereço.

Guarde esse endereço completo por um instante. Ele vai para o GitHub na Parte 3.

## Parte 2 — Criar a senha das cópias

Invente uma **frase longa**, por exemplo: `OSenhorVemMaranatha2026CFM`. Ela é a chave que abre as cópias.

> ⚠️ **Guarde essa senha num lugar seguro e com mais de uma pessoa** (ex.: pastor e secretaria). Se ela for perdida, **nenhuma cópia poderá ser aberta**. Não precisa me enviar.

## Parte 3 — Guardar as duas senhas no GitHub

1. Abra o repositório: https://github.com/ComunidadeDeCristoMaranatha/CentroDeFormacaoMinisterialMaranatha
2. Vá em **Settings → Secrets and variables → Actions**.
3. Clique em **New repository secret** e crie os dois:

| Name (exatamente assim) | Secret |
|---|---|
| `SUPABASE_DB_URL` | o endereço completo da Parte 1 (já com a senha do banco) |
| `BACKUP_SENHA` | a senha das cópias da Parte 2 |

Os "secrets" do GitHub ficam escondidos: ninguém consegue ver o conteúdo depois de salvo, nem mesmo você.

## Parte 4 — Testar agora

1. No repositório, clique na aba **Actions**.
2. À esquerda, clique em **Cópia de segurança semanal**.
3. Clique em **Run workflow** → **Run workflow** (botão verde).
4. Espere uns 2 minutos e atualize a página. Deve aparecer um **✓ verde**.
5. Clique na execução: embaixo, em **Artifacts**, aparece o arquivo `cfm-copia-AAAA-MM-DD.tar.gz.enc`.

Se aparecer um **✗ vermelho**, clique nele e me mande um print do erro.

---

## Como abrir uma cópia (só em caso de necessidade)

1. Baixe o arquivo em **Actions → execução → Artifacts**. Ele vem dentro de um `.zip`: extraia.
2. No computador que tem o Git instalado, clique com o botão direito na pasta do arquivo → **Open Git Bash here** e rode (trocando a senha e o nome do arquivo):
   ```
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in cfm-copia-AAAA-MM-DD.tar.gz.enc -out copia.tar.gz -pass pass:SUA-SENHA-DAS-COPIAS
   tar -xzf copia.tar.gz
   ```
3. Aparece a pasta `copia` com dois arquivos `.sql`: os dados da plataforma e as contas.

**Para restaurar os dados no Supabase**, peça ajuda: a ordem certa importa (primeiro as contas, depois a plataforma).

## Bom saber

- As cópias antigas somem sozinhas depois de 90 dias. Sempre haverá cerca de 12 cópias semanais guardadas.
- Se o repositório ficar **60 dias sem nenhuma alteração**, o GitHub pausa as rotinas automáticas e manda um e-mail avisando. Basta clicar em **Enable workflow** na aba Actions.
