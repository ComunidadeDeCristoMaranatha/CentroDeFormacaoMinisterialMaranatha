/* ================================================================
   CURSOS DO CENTRO DE FORMAÇÃO MINISTERIAL MARANATHA
   ================================================================

   Este é o arquivo onde ficam os cursos, módulos e aulas.
   Tudo o que está aqui aparece no site.

   MOSTRAR / ESCONDER UM CURSO, DATAS DE ABERTURA E PRÉ-REQUISITOS:
   isso NÃO é feito aqui. Os administradores controlam pelo site,
   em Painel → aba "Cursos".

   ACESSO ÀS AULAS: a PRIMEIRA aula de cada curso é aberta a todos.
   As demais exigem conta no site (e o pré-requisito, se houver).

   AULA DE APRESENTAÇÃO (automática): todo curso com aulas ganha sozinho,
   no começo, o módulo "Comece aqui" com a aula "Apresentação do curso"
   (é a aula aberta a todos). O texto dela é montado a partir da descrição,
   do "voceVaiAprender", da lista de módulos e do "paraQuem" do curso.
   Para colocar o VÍDEO de apresentação (e, se quiser, um texto próprio):
       apresentacao: {
         video: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
         duracao: "5 min",
         texto: `Texto próprio (opcional; se não tiver, o site monta sozinho).`
       },
   Para um curso NÃO ter essa aula:  apresentacao: false,

   COMO FUNCIONA (em palavras simples):
   - Um CURSO tem vários MÓDULOS (as "partes" do curso).
   - Cada MÓDULO tem várias AULAS.
   - Cada AULA pode ter um vídeo do YouTube, um texto e materiais (PDFs, links).

   REGRAS IMPORTANTES:
   1. Todo texto fica entre aspas "assim" ou, se for longo, entre crases `assim`.
   2. Depois de cada item vem uma vírgula , (exceto às vezes no último — tanto faz).
   3. O "id" é o "apelido" do curso/aula no endereço do site: use só letras
      minúsculas sem acento, números e hífen. Ex.: "vida-de-oracao"
      Nunca repita o mesmo id dentro do mesmo curso, e NÃO mude o id de
      uma aula depois que os alunos começarem (o progresso deles usa o id).
   4. status: "disponivel" (tem conteúdo) ou "em-breve" (ainda sendo preparado).

   VÍDEOS:
   - Suba o vídeo no YouTube (pode ser como "Não listado", assim ele só
     aparece aqui na plataforma e não na busca do YouTube).
   - Copie o link do vídeo e cole no campo video. Ex.:
       video: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
   - Se ainda não tiver vídeo, deixe  video: ""  — o site mostra "Vídeo em breve".

   TEXTO DA AULA (campo texto):
   - Linha em branco separa parágrafos.
   - **palavra** fica em negrito.
   - Linhas começando com "- " viram uma lista.
   - Linha começando com "## " vira um subtítulo.

   ----------------------------------------------------------------
   MODELO PARA COPIAR (um curso completo):

   {
     id: "nome-do-curso",
     titulo: "Nome do Curso",
     resumo: "Uma frase curta que aparece no card do curso.",
     descricao: `Texto maior explicando o curso.

   Pode ter vários parágrafos.`,
     professor: "Pr. Fulano",
     cargaHoraria: "4 horas",
     status: "disponivel",
     capa: "",   // opcional: caminho de uma imagem, ex.: "Cursos/capas/meu-curso.jpg"
     voceVaiAprender: ["Primeiro ponto", "Segundo ponto"],
     paraQuem: "Para quem é este curso.",
     apresentacao: { video: "", duracao: "" },   // vídeo da aula de apresentação (opcional)
     modulos: [
       {
         titulo: "Módulo 1 — Nome do módulo",
         aulas: [
           {
             id: "aula-1",
             titulo: "Título da aula",
             duracao: "15 min",
             video: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
             texto: `Texto da aula aqui.`,
             materiais: [
               { nome: "Apostila (PDF)", link: "https://link-do-arquivo" }
             ]
           }
         ]
       }
     ]
   },
   ================================================================ */

window.CURSOS = [

  /* ================================================================
     CURSO DE INTEGRAÇÃO
     Base: "Crescimento Espiritual, Ministerial e Pessoal — Módulo II:
     Conhecendo a igreja. Uma família para pertencer" (Edição 01 | 2023)
     ================================================================ */
  {
    id: "integracao",
    titulo: "Curso de Integração",
    resumo: "Conheça a história, a visão e o jeito de ser da Comunidade de Cristo Maranatha. Uma família para pertencer.",
    descricao: `Ficamos felizes com a sua escolha pela Comunidade de Cristo Maranatha! Este curso é o seu convite para participar ativamente da vida da igreja.

Aqui você vai conhecer a nossa história, os nossos sonhos e aquilo que Deus tem colocado em nossos corações ao longo dos anos. Acreditamos que a CCM tem uma missão a cumprir por meio de **todos** os seus membros: não é um trabalho isolado de pastores e líderes, e o engajamento de toda a família Maranatha é essencial.

O curso faz parte da trilha **Crescimento Espiritual, Ministerial e Pessoal** (Módulo II: Conhecendo a igreja. Uma família para pertencer).`,
    professor: "",
    cargaHoraria: "",
    status: "disponivel",
    capa: "",
    voceVaiAprender: [
      "A história, a visão, a missão e o credo da CCM",
      "Os cinco propósitos de uma igreja saudável",
      "Como funcionam as celebrações, os pequenos grupos e o discipulado",
      "Como descobrir seus dons e servir no ministério",
      "O que a igreja crê sobre evangelismo, política, aborto e generosidade"
    ],
    paraQuem: "Para quem deseja se tornar membro da Comunidade de Cristo Maranatha e para todos que querem conhecer melhor a igreja.",
    apresentacao: { video: "", duracao: "" }, // cole aqui o link do vídeo de apresentação do curso
    modulos: [
      {
        titulo: "Apresentação — Conhecendo a Maranatha",
        aulas: [
          {
            id: "nossa-historia",
            titulo: "Palavra pastoral e nossa história",
            duracao: "",
            video: "",
            texto: `**Maranata** é uma expressão aramaica usada pelo apóstolo Paulo em 1 Coríntios 16:22. É formada por "marana" (Senhor) e "tha" (vem): **"O Senhor vem"**. Essa é a nossa esperança, a nossa força e a nossa mensagem.

## Nossa caminhada
- **15 de maio de 2011:** nasce a Comunidade de Cristo Maranatha, sob a liderança do pastor Edney Melo
- **19 de maio de 2011:** primeiro culto de oração, na casa dos irmãos Manoel Moreira e Vanderli
- **21 de maio de 2011:** primeiro culto de domingo, no Colégio Mesquita Mendes (Montese), com Santa Ceia
- **30 de julho de 2011:** primeiro culto em prédio próprio da CCM, na rua Alfredo de Castro (Montese), e apresentação do Estatuto
- **8 de março de 2013:** o pastor Iran Coutinho assume como pastor presidente

Hoje estamos na **Rua Armando Monteiro, 1.626, Montese**. O nosso sonho é construir a nossa sede e, a partir daí, expandir por meio de novas congregações.`,
            materiais: []
          },
          {
            id: "visao-missao-credo",
            titulo: "Visão, missão, cultura e credo",
            duracao: "",
            video: "",
            texto: `## Nossa visão
Ser uma comunidade fundamentada no ensino de Cristo e em amor, que, respeitando os dons espirituais de cada pessoa, equilibradamente, aja com sensibilidade às necessidades humanas.

## Nossa missão
Evangelizar as nações, segundo Atos 1:8, fazendo discípulos de Jesus Cristo e cuidando do ser humano, no espírito, na alma e no corpo.

## Nossa cultura
Ser uma igreja que manifeste ao mundo o amor de Cristo e onde o serviço cristão seja realizado com excelência.

## Nosso credo
O Artigo 4º do Estatuto Social da CCM adota os seguintes princípios de fé:
- A existência de um só Deus, Pai, Filho e Espírito Santo, uno em essência e trino em pessoa
- A soberania de Deus na criação, revelação, redenção e juízo final
- A inspiração divina, veracidade e integridade da Bíblia e sua suprema autoridade em matéria de fé e conduta
- A pecaminosidade universal e a culpabilidade de todos os homens e mulheres, desde a queda de Adão
- A redenção do pecado somente por meio da morte expiatória do Senhor Jesus Cristo
- A ressurreição corporal do Senhor Jesus Cristo e sua ascensão à direita de Deus Pai
- A missão pessoal do Espírito Santo no arrependimento, na regeneração e na santificação, e a contemporaneidade dos dons espirituais (1 Coríntios 12)
- A justificação do pecador somente pela graça de Deus, por meio da fé em Jesus Cristo
- A intercessão de Jesus Cristo como único mediador entre Deus e a humanidade
- A única igreja, santa e universal, que é o Corpo de Cristo e se manifesta nas congregações locais
- A certeza da segunda vinda do Senhor Jesus Cristo em corpo glorificado
- A ressurreição dos mortos, a vida eterna dos salvos e a condenação eterna dos que permanecem em rebelião contra Deus`,
            materiais: []
          }
        ]
      },
      {
        titulo: "Uma família para pertencer",
        aulas: [
          {
            id: "igreja-com-proposito",
            titulo: "Aula 1 — Uma igreja com propósito",
            duracao: "",
            video: "",
            texto: `"Assim as igrejas eram fortalecidas na fé e cresciam em número cada dia." (Atos 16:5)

## Nesta aula
- Os propósitos de uma igreja saudável: o **Grande Mandamento** (adoração e ministério) e a **Grande Comissão** (missão, comunhão e discipulado)
- Os pressupostos de uma igreja com propósitos
- Por que é importante definir os propósitos da igreja
- As marcas das igrejas que prevalecem

**Máximas:** A igreja não é o ponto de chegada, mas de partida. Pior que a morte é uma vida sem propósitos.

**Tarefa para casa (opcional):** ler o livro "Igrejas que prevalecem" (Carlito Paes).`,
            materiais: []
          },
          {
            id: "celebracoes-e-adoracao",
            titulo: "Aula 2 — Nossas celebrações e o propósito de adoração",
            duracao: "",
            video: "",
            texto: `"Ame o Senhor, o seu Deus, de todo o seu coração, e de toda a sua alma, de todo o seu entendimento e de todas as suas forças." (Marcos 12:30)

## Nesta aula
- O que é adoração: nossa resposta ao amor de Deus, um estilo de vida
- A vida do adorador
- O papel da adoração em uma igreja com propósitos
- A estrutura e o funcionamento da Base de Adoração
- Os princípios e a estrutura das nossas celebrações`,
            materiais: []
          },
          {
            id: "pastoreio",
            titulo: "Aula 3 — Crescendo e multiplicando através do pastoreio",
            duracao: "",
            video: "",
            texto: `"Assim como o corpo é uma unidade, embora tenha muitos membros, e todos os membros, mesmo sendo muitos, formam um só corpo, assim também com respeito a Cristo." (1 Coríntios 12:12)

## Nesta aula
- As redes de Pequenos Grupos: crianças, adolescentes, jovens, adultos e misto
- Os dois ambientes da igreja: as grandes celebrações e os pequenos grupos
- As quatro estações dos Pequenos Grupos: **cultivo, cuidado, crescimento e colheita**

**Máxima:** Juntos somos melhores.`,
            materiais: []
          },
          {
            id: "discipulado",
            titulo: "Aula 4 — Crescendo através do discipulado",
            duracao: "",
            video: "",
            texto: `Discipulado é mais que conhecimento: é um lindo e natural relacionamento de amor com nosso Deus.

## Nesta aula
- Os três eixos do discipulado: **educacional, relacional e pessoal**
- O Grupo de Discipulado Pessoal (GDP)
- O Discípulo Pessoal (DP): o discipulado um a um

**Máximas:** Isso diz muito sobre você. A luz que brilha mais longe brilha mais forte aqui.

**Tarefa para casa (obrigatória):** ler o livro "Uma vida com propósitos".`,
            materiais: []
          },
          {
            id: "dons-para-servir",
            titulo: "Aula 5 — Conhecendo meus dons para melhor servir",
            duracao: "",
            video: "",
            texto: `"Cada um exerça o dom que recebeu para servir aos outros, administrando fielmente a graça de Deus em suas múltiplas formas." (1 Pedro 4:10)

## Nesta aula
- Ministério segundo a Bíblia: servir ao Senhor, aos outros crentes e aos não crentes
- A prioridade do ministério na vida de cada cristão
- Como servimos a Deus
- A sua **FORMA**: Formação espiritual, Opções do coração, Recursos pessoais, Modo de ser e Áreas de experiência
- Servindo através da minha igreja

**Máximas:** A excelência honra a Deus e abençoa as pessoas. Nunca se apegue a uma função, se apegue a Jesus e à visão.`,
            materiais: []
          },
          {
            id: "evangelismo",
            titulo: "Aula 6 — Vivendo o evangelismo em uma igreja contextualizada",
            duracao: "",
            video: "",
            texto: `"Não me envergonho do evangelho, porque é o poder de Deus para salvação de todo aquele que crê." (Romanos 1:16)

## Nesta aula
- A diferença entre missões e evangelismo na Maranatha
- O que significa "evangelho" (euangelion)
- Da teoria para a prática
- O amor como principal ferramenta do evangelismo
- Por que evangelizar

**Máximas:** Missões como estilo de vida. A lasca não voa longe do tronco.

**Tarefa para casa:** participar do Curso de Evangelismo.`,
            materiais: []
          },
          {
            id: "politica-aborto-mordomia",
            titulo: "Aula 7 — Política, aborto e mordomia cristã",
            duracao: "",
            video: "",
            texto: `A igreja precisa se posicionar sobre questões éticas e morais, tendo sempre as Escrituras como base.

## Nesta aula
- **A igreja e a política:** a CCM não se envolve com política partidária e não defende candidatos ou partidos, mas quer membros que saibam discernir o seu tempo à luz do Evangelho
- **A questão do aborto:** a vida humana começa na concepção e deve ser protegida desde o ventre materno
- **Mordomia cristã:** uma vida de generosidade, controlada pelo Espírito Santo, e como entendemos os dízimos e as ofertas

**Máximas:** O Evangelho é superior a todas as ideologias. É na pressão que o parafuso espana.`,
            materiais: []
          }
        ]
      }
    ]
  },

  /* ================================================================
     FUNDAMENTOS DA FÉ
     Base: apostila "Fundamentos da Fé" (2023), a partir do Credo da CCM
     ================================================================ */
  {
    id: "fundamentos-da-fe",
    titulo: "Fundamentos da Fé",
    resumo: "Os alicerces da fé cristã, a partir do Credo da Comunidade de Cristo Maranatha.",
    descricao: `"Até que todos cheguemos à unidade da fé e do pleno conhecimento do Filho de Deus [...] para que não mais sejamos como meninos, agitados de um lado para outro e levados ao redor por todo vento de doutrina." (Efésios 4:13-14)

Este curso foi formatado a partir dos itens do **Credo da Comunidade de Cristo Maranatha**, que fazem parte da nossa profissão de fé, pois são questões inegociáveis da fé cristã.

O objetivo é formar em cada membro os alicerces da fé cristã, para que tenha maturidade e capacidade de discernir a época difícil em que vivemos, cheia de modismos e ensinamentos antibíblicos.

Que o Espírito Santo te ilumine nessa jornada!`,
    professor: "",
    cargaHoraria: "",
    status: "disponivel",
    capa: "",
    voceVaiAprender: [
      "O que a Bíblia ensina sobre Deus, a Trindade e a criação",
      "O pecado e a obra de salvação em Jesus Cristo",
      "A pessoa e a obra do Espírito Santo, seus dons e seu fruto",
      "A igreja, a volta de Jesus, a ressurreição e o juízo final"
    ],
    paraQuem: "Para todos os membros da CCM e para quem deseja firmar a sua fé nas verdades essenciais da Palavra de Deus.",
    apresentacao: { video: "", duracao: "" }, // cole aqui o link do vídeo de apresentação do curso
    modulos: [
      {
        titulo: "Módulo 1 — A Bíblia e o Deus que se revela",
        aulas: [
          {
            id: "conhecendo-a-biblia",
            titulo: "Aula 1 — Conhecendo a Bíblia",
            duracao: "",
            video: "",
            texto: `A Bíblia é a revelação de Deus à humanidade. Nela encontramos o perfeito plano de salvação e o que Deus requer dos salvos para que tenham uma vida que glorifique ao seu Criador.

## Nesta aula
- A estrutura da Bíblia: 66 livros (39 no Antigo e 27 no Novo Testamento)
- As divisões do Antigo e do Novo Testamento
- As línguas originais e os autores
- A autoridade, a clareza, a necessidade e a suficiência das Escrituras

**Credo da CCM:** "A inspiração divina, veracidade e integridade da Bíblia, tal como foi revelada originalmente e sua suprema autoridade em matéria de fé e conduta."`,
            materiais: []
          },
          {
            id: "atributos-de-deus",
            titulo: "Aula 2 — Conhecendo a Deus e seus atributos",
            duracao: "",
            video: "",
            texto: `Alguns atributos Deus não partilha conosco (incomunicáveis); outros ele partilha (comunicáveis).

## Nesta aula
- **Atributos incomunicáveis:** independência, imutabilidade, eternidade e onipresença
- **Atributos mentais:** conhecimento, sabedoria e veracidade
- **Atributos morais:** bondade, amor, misericórdia, graça, paciência, santidade e justiça
- **Atributos de propósito:** vontade e onipotência

**Credo da CCM:** "A soberania de Deus na criação, revelação, redenção e juízo final."`,
            materiais: []
          },
          {
            id: "trindade",
            titulo: "Aula 3 — O que é a Trindade?",
            duracao: "",
            video: "",
            texto: `Embora o Pai, o Filho e o Espírito Santo coexistam eternamente como três pessoas distintas, há apenas um Deus. Essa é a doutrina da Trindade.

## Nesta aula
- Três declarações que resumem o ensino bíblico: Deus é três pessoas, cada pessoa é plenamente Deus, e só há um Deus
- Os papéis da Trindade na criação e na redenção

**Credo da CCM:** "A existência de um só Deus, Pai, Filho e Espírito Santo, uno em essência e trino em pessoa."`,
            materiais: []
          },
          {
            id: "deus-pai",
            titulo: "Aula 4 — O Deus Pai",
            duracao: "",
            video: "",
            texto: `O Deus Pai revela-se em toda a Bíblia como uma pessoa distinta do Filho e do Espírito Santo.

## Nesta aula
- As funções do Pai em relação ao mundo: falou as palavras criadoras, estabeleceu seu propósito eterno e planejou a redenção
- As características do Deus Pai: autoridade, fidelidade, generosidade, afeição, atenção e aceitação paternas`,
            materiais: []
          }
        ]
      },
      {
        titulo: "Módulo 2 — Criação, pecado e salvação",
        aulas: [
          {
            id: "a-criacao",
            titulo: "Aula 5 — A criação",
            duracao: "",
            video: "",
            texto: `"Pela fé, entendemos que foi o universo formado pela Palavra de Deus." (Hebreus 11:3)

## Nesta aula
- Toda a Trindade envolvida na criação
- Uma criação ordenada: os seis dias de Gênesis 1
- O ser humano feito à imagem de Deus e suas implicações
- O mandato cultural
- Yahweh, o Deus que se relaciona com as suas criaturas (Gênesis 2)`,
            materiais: []
          },
          {
            id: "o-pecado",
            titulo: "Aula 6 — O pecado",
            duracao: "",
            video: "",
            texto: `O pecado é qualquer falha em obedecer à lei moral de Deus em atos, atitude ou natureza.

## Nesta aula
- A introdução do pecado no mundo e o seu processo
- As consequências do pecado: morte espiritual, física e eterna, medo, vergonha e uma criação afetada
- A promessa que gera esperança (Gênesis 3:15)

**Credo da CCM:** "A pecaminosidade universal e a culpabilidade de todos os homens e mulheres, desde a queda de Adão, pondo as pessoas sob a ira e condenação de Deus."`,
            materiais: []
          },
          {
            id: "quem-e-jesus",
            titulo: "Aula 7 — Quem é Jesus?",
            duracao: "",
            video: "",
            texto: `"E vós, quem dizeis que eu sou?" (Mateus 16:15). A resposta a essa pergunta determina o tipo de fé que possuímos.

## Nesta aula
- O Verbo que se fez carne e a plena revelação de Deus
- O Filho de Deus e o Criador de todas as coisas
- O sumo sacerdote misericordioso e fiel
- O único mediador entre Deus e os homens
- A missão de Jesus

**Credo da CCM:** "A intercessão de Jesus Cristo, como único mediador entre Deus e a humanidade."`,
            materiais: []
          },
          {
            id: "expiacao",
            titulo: "Aula 8 — O que é a expiação?",
            duracao: "",
            video: "",
            texto: `A morte vicária (substitutiva) de Jesus é chamada de expiação. Ela satisfez a justiça de Deus e revelou o seu amor.

## Nesta aula
- A causa da expiação: o amor e a justiça de Deus
- A necessidade da expiação
- O resultado da expiação

**Credo da CCM:** "A redenção da culpa, pena e domínio e corrupção de pecado somente por meio da morte expiatória do Senhor Jesus Cristo, o filho encarnado de Deus, como representante e substituto da humanidade."`,
            materiais: []
          },
          {
            id: "justificacao-e-adocao",
            titulo: "Aula 9 — O que são justificação e adoção?",
            duracao: "",
            video: "",
            texto: `"Portanto, agora já não há condenação para os que estão em Cristo Jesus." (Romanos 8:1)

## Nesta aula
- A justificação pela fé: Deus nos declara justos
- Justificação pela fé somente
- A adoção: somos feitos filhos de Deus

**Credo da CCM:** "A justificação do pecador somente pela graça de Deus, por meio da fé em Jesus Cristo."`,
            materiais: []
          }
        ]
      },
      {
        titulo: "Módulo 3 — O Espírito Santo e a vida cristã",
        aulas: [
          {
            id: "espirito-santo",
            titulo: "Aula 10 — A pessoa do Espírito Santo",
            duracao: "",
            video: "",
            texto: `O Espírito Santo não é uma força vaga: é a terceira pessoa da Trindade.

## Nesta aula
- A personalidade do Espírito Santo: intelecto, sensibilidade e vontade
- A deidade do Espírito Santo
- A obra do Espírito Santo: ele dá poder, purifica, revela e unifica`,
            materiais: []
          },
          {
            id: "dons-e-fruto",
            titulo: "Aula 11 — Os dons e o fruto do Espírito",
            duracao: "",
            video: "",
            texto: `"Há diferentes tipos de dons, mas o Espírito é o mesmo." (1 Coríntios 12:4)

## Nesta aula
- O propósito e a definição dos dons espirituais
- Os tipos de dons: ministeriais, de revelação, de poder, da palavra, administrativos e de socorro
- Orientações e sabedoria no uso dos dons na igreja
- O fruto do Espírito (Gálatas 5:22-23)

**Credo da CCM:** "A missão pessoal do Espírito Santo no arrependimento, na regeneração e na santificação dos cristãos, e a contemporaneidade dos dons espirituais conforme capítulo 12 da primeira Carta de Paulo aos Coríntios."`,
            materiais: []
          },
          {
            id: "novo-nascimento",
            titulo: "Aula 12 — Novo nascimento, santificação e glorificação",
            duracao: "",
            video: "",
            texto: `"Desenvolvei a vossa salvação com temor e tremor." (Filipenses 2:12)

## Nesta aula
- **Novo nascimento (regeneração):** obra instantânea e soberana do Espírito Santo
- **Santificação:** processo que dura toda a vida, com a ação de Deus e a nossa entrega
- **Glorificação:** o passo final da redenção, na volta de Jesus`,
            materiais: []
          }
        ]
      },
      {
        titulo: "Módulo 4 — A igreja e as últimas coisas",
        aulas: [
          {
            id: "igreja-e-missao",
            titulo: "Aula 13 — A igreja e a sua missão",
            duracao: "",
            video: "",
            texto: `A igreja é a comunidade de todos os verdadeiros cristãos em todos os tempos. É impossível seguir Jesus sozinho.

## Nesta aula
- O que é a igreja
- A igreja local e a igreja global
- A missão da igreja: ministrar a Deus, aos seus membros e ao mundo

**Credo da CCM:** "A única igreja, Santa e Universal, que é o corpo de Cristo, à qual todos os cristãos verdadeiros pertencem e que na terra se manifesta nas congregações locais."`,
            materiais: []
          },
          {
            id: "volta-de-jesus",
            titulo: "Aula 14 — O que acontecerá quando Jesus retornar?",
            duracao: "",
            video: "",
            texto: `"Esse Jesus que dentre vós foi assunto ao céu virá do modo como o vistes subir." (Atos 1:11)

## Nesta aula
- O modo e o tempo da segunda vinda: pessoal e visível
- Os sinais da segunda vinda
- As etapas da segunda vinda

**Credo da CCM:** "A certeza da segunda vinda do Senhor Jesus Cristo em corpo glorificado e a consumação do seu Reino naquela manifestação."`,
            materiais: []
          },
          {
            id: "ressurreicao",
            titulo: "Aula 15 — O que é a ressurreição dos mortos?",
            duracao: "",
            video: "",
            texto: `"E, se Cristo não ressuscitou, é vã a nossa pregação, e vã, a nossa fé." (1 Coríntios 15:14)

## Nesta aula
- A ressurreição de Cristo
- As implicações da ressurreição de Jesus para nós
- Quantas ressurreições a Bíblia menciona

**Credo da CCM:** "A ressurreição corporal do Senhor Jesus Cristo e sua ascensão à direita do Deus Pai."`,
            materiais: []
          },
          {
            id: "juizo-final",
            titulo: "Aula 16 — O que é o juízo final?",
            duracao: "",
            video: "",
            texto: `Todos comparecerão diante de Deus para prestar contas daquilo que fizeram.

## Nesta aula
- O juízo final e o grande trono branco
- O julgamento dos salvos (para recompensa) e dos que não se reconciliaram com Deus
- O que é o inferno
- O que é o céu: novos céus e nova terra

**Credo da CCM:** "A ressurreição dos mortos, a vida eterna dos salvos e a condenação eterna dos que permanecem em sua rebelião contra Deus."`,
            materiais: []
          }
        ]
      }
    ]
  },

  /* ================================================================
     CURSOS AINDA EM PREPARAÇÃO
     (textos provisórios — ajuste o resumo quando tiver o material)
     ================================================================ */
  {
    id: "curso-de-batismo",
    titulo: "Curso de Batismo",
    resumo: "Preparação para quem deseja descer às águas e dar esse passo de fé.",
    descricao: `Curso em preparação. Em breve, mais informações.`,
    professor: "",
    cargaHoraria: "",
    status: "em-breve",
    capa: "",
    modulos: []
  },
  {
    id: "cosmovisao-biblica",
    titulo: "Cosmovisão Bíblica",
    resumo: "Enxergar a vida, a cultura e o mundo a partir das Escrituras.",
    descricao: `Curso em preparação. Em breve, mais informações.`,
    professor: "",
    cargaHoraria: "",
    status: "em-breve",
    capa: "",
    modulos: []
  },
  {
    id: "escola-de-salmistas",
    titulo: "Escola de Salmistas",
    resumo: "Formação para quem serve ou deseja servir no ministério de louvor e adoração.",
    descricao: `Curso em preparação. Em breve, mais informações.`,
    professor: "",
    cargaHoraria: "",
    status: "em-breve",
    capa: "",
    modulos: []
  }

];
