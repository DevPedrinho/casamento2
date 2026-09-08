# Casamento Deysiane & Pedro — 22.05.2027

**No ar:** https://casamento-deysiane-pedro.vercel.app

Site do casamento, construído a partir da identidade visual oficial
(*Amor que acolhe*). Tem cadastro e login de convidados, confirmação de
presença, a nossa história e um marketplace de presentes em que cada item
leva para o seu próprio link de pagamento.

---

## O que o site tem

| Página | Endereço | O que faz |
| --- | --- | --- |
| Início | `/` | Monograma, contagem regressiva, resumo da história e detalhes do dia |
| Nossa História | `/nossa-historia` | Linha do tempo do casal, capítulo por capítulo |
| Presentes | `/presentes` | Marketplace com o botão **Presentear** por item |
| Confirmar Presença | `/confirmar` | RSVP com acompanhantes, restrições e recado |
| Entrar / Cadastrar | `/entrar`, `/cadastrar` | Login e cadastro do convidado |
| Minha área | `/area-do-convidado` | O convidado revê e altera a própria resposta |
| Painel dos noivos | `/admin` | Visão geral: contagem, andamento e o que pede atenção |
| Checklist | `/admin/checklist` | 59 tarefas por fase, do "12 meses antes" ao "depois" |
| Fornecedores | `/admin/fornecedores` | CRM em funil, do primeiro contato ao contrato |
| Financeiro | `/admin/financeiro` | Orçamento por categoria, contratos e parcelas pagas |
| Presentes (admin) | `/admin/presentes` | Cadastro dos itens e dos links de pagamento |
| Convidados (admin) | `/admin/convidados` | Lista de confirmações, com busca e exportação em CSV |

> As seções sob `/admin` são visíveis **só para quem tem `is_admin`**. Convidado
> comum e visitante anônimo não leem nem escrevem nada de checklist,
> fornecedores ou financeiro — isso é garantido por RLS no banco, não só pela
> interface.

---

## O painel de planejamento

### Checklist

Vem preenchido com um levantamento de **59 tarefas** organizadas por fase:
*12+ meses antes*, *9 a 12*, *6 a 9*, *3 a 6*, *1 a 3*, *último mês*, *última
semana*, *no dia* e *depois do casamento*. Cada tarefa tem categoria,
responsável, prazo e observação.

Clicar no selo de status avança a tarefa: a fazer → em andamento → concluído.
Tarefas com prazo vencido aparecem em vermelho.

### Fornecedores (CRM)

Funil com seis etapas: *a pesquisar*, *contatado*, *orçamento recebido*,
*negociando*, *contratado* e *descartado*. Cada fornecedor guarda contato,
Instagram, site, o valor do orçamento recebido, o valor fechado e qual é o
próximo passo com data — o painel destaca quem precisa de retorno em até
7 dias.

O telefone vira link de WhatsApp e o Instagram vira link do perfil.

### Financeiro

Três valores acompanham cada item: **previsto** (a estimativa), **contratado**
(o que foi fechado) e **pago** (a soma das parcelas lançadas). O painel mostra
quanto do orçamento total já está comprometido e avisa quando passa do limite.

Cada item aceita vários pagamentos, porque casamento quase sempre é parcelado.
A estrutura já vem com 19 categorias típicas e as notas de quanto se costuma
reservar para cada frente.

---

## Como o botão "Presentear" funciona

Cada presente tem um campo **`gift_url`** — é o link que vocês colam no
painel. Ao clicar em *Presentear*, o convidado vai direto para esse
endereço (link de pagamento, PIX, página da loja, o que vocês preferirem).

Dá para usar um link diferente por item, ou repetir o mesmo em todos.

Antes de abrir o link, se o convidado estiver logado, o site registra em
`gift_claims` quem clicou — assim vocês sabem de quem veio cada presente na
hora de agradecer. Se esse registro falhar, o link abre do mesmo jeito: o
presente é mais importante que a estatística.

> **Segurança:** só entram links `http://` ou `https://`. Um endereço
> inválido nunca vira botão clicável.

---

## Rodando na sua máquina

```bash
npm install
cp .env.example .env.local   # já vem com as chaves do projeto
npm run dev                  # http://localhost:3000
```

Outros comandos:

```bash
npm run build      # build de produção
npm run typecheck  # confere os tipos
```

### Variáveis de ambiente

| Variável | Para que serve |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Endereço do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `NEXT_PUBLIC_SITE_URL` | Opcional. URL final do site, usada na imagem de compartilhamento |

As duas primeiras chaves são públicas por natureza — elas ficam no
navegador de quem acessa. Quem protege os dados de verdade são as políticas
de RLS no banco (veja abaixo).

---

## Primeiros passos depois de publicar

### 1. Virar admin

O painel `/admin` só abre para quem tem `is_admin = true`. Depois que
**Deysiane e Pedro criarem os cadastros pelo site**, rode isto no *SQL
Editor* do Supabase:

```sql
update public.guests
set is_admin = true
where id in (
  select id from auth.users
  where email in ('email-da-deysiane@exemplo.com', 'email-do-pedro@exemplo.com')
);
```

### 2. Trocar os links dos presentes

A lista já vem com 10 itens de exemplo, todos apontando para
`https://exemplo.com/troque-este-link`. Entre em `/admin` → aba
**Presentes** e troque cada link pelo endereço real. Ali também dá para
adicionar, editar, ocultar e remover itens.

### 3. Preencher os dados da festa

Local, endereço e horários ficam em [`src/lib/config.ts`](src/lib/config.ts):

```ts
local: {
  nome: "A definir",           // ← nome do espaço
  endereco: "Endereço a confirmar",
  cidade: "Brasil",
  mapsUrl: "",                 // ← link do Google Maps (o botão "Ver no mapa"
},                             //    só aparece quando este campo é preenchido
```

Os textos da linha do tempo ficam em
[`src/app/nossa-historia/page.tsx`](src/app/nossa-historia/page.tsx), na
constante `CAPITULOS`.

### 4. Apontar o Supabase para o endereço do site

Os e-mails de confirmação de cadastro levam o convidado de volta para o
site. Por padrão esse endereço é `localhost:3000`, que não funciona para
quem está de fora. No painel do Supabase, em *Authentication → URL
Configuration*, preencha:

- **Site URL:** `https://casamento-deysiane-pedro.vercel.app`
- **Redirect URLs:** adicione o mesmo endereço

Sem isso, o link do e-mail de confirmação não abre o site.

### 5. Confirmação de e-mail (opcional)

Por padrão o Supabase pede confirmação de e-mail no cadastro. Se vocês
preferirem que o convidado entre na hora, desliguem em
*Authentication → Providers → Email → Confirm email*. O site já trata os
dois casos.

---

## Identidade visual

Tudo foi tirado do PDF oficial da IDV:

| Cor | Código | Onde aparece |
| --- | --- | --- |
| Creme | `#F0E7DA` | Fundo do site |
| Oliva | `#666A46` | Monograma, títulos, botão principal |
| Lavanda | `#9581A6` | Corações, botão *Presentear* |
| Terra | `#876F58` | Textos de apoio e linhas finas |

- **Títulos:** Cormorant Garamond (serifada, no espírito do monograma)
- **Textos:** Jost (sem serifa, discreta)

Os assets em `public/img/` foram extraídos do próprio PDF: o monograma
`DP`, o ramo floral em aquarela (com fundo transparente) e a versão
espelhada dele.

---

## Estrutura

```
src/
├── app/
│   ├── admin/               Painel dos noivos (presentes + convidados)
│   ├── area-do-convidado/   Área logada do convidado
│   ├── cadastrar/           Criação de conta
│   ├── confirmar/           RSVP
│   ├── entrar/              Login
│   ├── nossa-historia/      Linha do tempo
│   ├── presentes/           Marketplace
│   ├── globals.css          Design system da IDV
│   └── layout.tsx           Fontes, metadados, cabeçalho e rodapé
├── components/              Botões, seções, ornamentos, cabeçalho, rodapé
├── lib/
│   ├── config.ts            Data, local, textos do casamento
│   ├── formato.ts           Preço em R$ e validação de link
│   ├── supabase/            Clientes de navegador e servidor
│   └── tipos.ts             Tipos das tabelas
└── middleware.ts            Renova a sessão e protege as rotas privadas

supabase/
├── migrations/              Schema e políticas de RLS versionados
└── seed.sql                 Lista de presentes inicial
```

---

## Segurança dos dados

Cada tabela tem Row Level Security ligada. Na prática:

- Um convidado lê e edita **só o próprio** perfil e a própria confirmação.
- Um convidado **não consegue** se promover a admin (a política compara o
  campo `is_admin` com o valor real de quem está pedindo).
- A lista de presentes é pública — o visitante vê antes de se cadastrar.
- Só quem é admin lê a lista completa de convidados e gerencia presentes.

Essas regras foram testadas simulando um convidado comum, um admin e um
visitante anônimo direto no banco.

---

## Publicação

O site já está publicado na [Vercel](https://vercel.com), ligado a este
repositório:

- **Endereço:** https://casamento-deysiane-pedro.vercel.app
- **Branch de produção:** `claude/wedding-site-login-marketplace-bhncuw`

Todo push nesse branch publica sozinho — não precisa fazer mais nada.

As chaves públicas do Supabase ficam em `.env.production`, versionado
junto do código. Se preferirem gerenciá-las pelo painel da Vercel,
cadastrem as mesmas variáveis lá e apaguem o arquivo.
