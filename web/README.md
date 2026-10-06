# SuperVisão Web

## Análises e sugestões

Na tela inicial, **Análises das vistorias** abre filtros combináveis de datas, busca, marca, modelo, município, estado, combustível, ano, cor e Número. Gráficos de linha/colunas por período e barras/rosca por categoria aceitam clique ou teclado para aplicar filtros. A tabela tem ordenação, paginação e exportação CSV de todas as fichas filtradas (não somente da página). Cada ficha é contada como uma vistoria; não existem indicadores de aprovação/reprovação porque esses dados não são coletados.

Datas dos atalhos usam America/Sao_Paulo. Intervalos são inclusivos. Períodos sem fichas não são exibidos no gráfico; mais de 90 dias distintos são agrupados em meses, com aviso. Datas inválidas ficam fora do gráfico e dos filtros de período. Fichas a complementar são as que não têm marca, combustível, município ou cor. Esses campos continuam opcionais.

`catalog.js` contém uma lista inicial de veículos frequentes, não um catálogo completo nem uma consulta oficial. Sugestões se ampliam com fichas existentes; modelos dependem da marca e municípios existentes dependem do estado. Digitação livre permanece disponível. Marca pode ser preenchida ao escolher um modelo inequívoco do catálogo quando o campo está vazio. Grafias exatas conhecidas são padronizadas ao preencher/salvar: VW → Volkswagen, GM → Chevrolet e Flex → Gasolina / Álcool. Versões livres de modelos são preservadas. Agrupamentos desconsideram caixa, espaços repetidos e acentos e reconhecem os mesmos aliases sem regravar fichas antigas. Número mantém zeros e é tratado como categoria, sem soma ou significado financeiro.

Todos os cálculos e sugestões rodam no navegador com os registros já carregados. Não há envio a serviços de IA ou catálogos externos. `node --test test/analysis.test.cjs` verifica agrupamentos, filtros, datas e sugestões. Da raiz, `node tests/analytics-ui.test.cjs` verifica filtros/gráficos, exportação, paginação, acessibilidade por teclado, sugestões e responsividade com dados fictícios. Capturas `dist/analises-*-demonstracao.png` são demonstrações com dados simulados, não cadastros reais.

Interface manual para navegador em `public/`, função Vercel em `api/fichas.js`. O Google Sheets permanece como banco de dados. O projeto é independente do APK legado e não precisa de compilação nem dependências para funcionar.

## Publicação

Publicar somente esta pasta `web` na Vercel, com framework Other e output directory `public` (definidos em `vercel.json`). Configurar `SESSION_SECRET` como segredo aleatório de pelo menos 32 caracteres em Production e Preview. Nenhuma chave pode estar em `public/` ou em variável de ambiente exposta ao cliente.

Executar `vercel --prod` nesta pasta depois de conectar a conta. A chave do Google Sheets já existente é usada na tela de entrada. A função valida essa chave no Apps Script e armazena uma cópia criptografada em cookie HttpOnly, Secure, SameSite=Strict, com validade de 12 horas. O segredo de criptografia fica somente na Vercel. Trocar SESSION_SECRET encerra as sessões; trocar ACCESS_TOKEN no Apps Script revoga a chave anterior.

## Dados

Nome, CPF, modelo e placa obrigatórios. Número opcional e sem função financeira, com sugestões 8, 9 e 10. A data definitiva é preenchida pelo Apps Script no fuso de São Paulo. O navegador mantém um rascunho e a última cópia das fichas em localStorage; a tela só os exibe depois de validar a sessão. Sair limpa ambos. O armazenamento local não é criptografado: use somente aparelhos confiáveis e saia em aparelhos compartilhados. A chave de acesso nunca é gravada em localStorage nem no JavaScript público.

O endereço do Apps Script e o ID da planilha são configurados em GOOGLE_APPS_SCRIPT_URL e GOOGLE_SPREADSHEET_ID na Vercel.

Dados que existem somente no armazenamento do antigo APK não são transferidos automaticamente. Fichas já salvas no Sheets aparecem ao entrar na versão web.

## Verificação

`node --test test/api.test.cjs` testa sessão, redirecionamento, credenciais, origem, limite do pedido, repetição segura e falhas. `node dev.cjs` inicia o servidor local na porta 4176. Da raiz, `node tests/web-ui.test.cjs` executa o teste de interface com Playwright e Google simulado (Chrome instalado necessário). Não envia dados de teste ao Google.

Não há service worker: uma página aberta mantém o rascunho após falha de conexão, mas abrir o site do zero exige internet. O botão Atualizar fichas consulta a planilha; não há sincronização em segundo plano. O acesso é compartilhado pela equipe através da chave; não há contas individuais de funcionários.

## Atualização do cadastro — 05/10/2026

- Números sugeridos de 8 a 15; continua permitido digitar outro número, sem significado financeiro.
- Data preenchida em America/Sao_Paulo e editável. O Apps Script versão 4 valida e preserva a data informada, inclusive em edições; campo vazio recebe a data existente ou a data atual.
- Textos promocionais removidos. Prata disponível no catálogo de cores.
- `catalog-data.js` é um retrato público de 05/10/2026: 5.571 municípios em 27 UFs (API oficial do IBGE) e 107 marcas de automóveis/7.386 modelos e versões do catálogo Parallelum. Mesclado às sugestões anteriores, oferece 112 marcas e 7.640 opções de modelos/versões. Não contém preços. A consulta não transmite dados dos clientes. Referências: https://servicodados.ibge.gov.br/api/docs/localidades e https://deividfortuna.github.io/fipe/.
- Selecionar UF limita as sugestões de município à lista oficial correspondente. Um município inequívoco pode preencher a UF vazia. Com UF preenchida, município incompatível é recusado; ambos continuam opcionais. A busca desconsidera acentos.
- `tools/update-catalogs.cjs` recompõe o catálogo a partir dos arquivos públicos; o cache em tmp/catalogos evita requisições repetidas.
- Diagnóstico de falha de gravação: a planilha exibiu bloqueio por armazenamento insuficiente na conta proprietária; leitura e login continuavam funcionando. O Apps Script retornava “The caller does not have permission” ao gravar. Agora esse bloqueio mostra uma mensagem sobre armazenamento/permissão e mantém o rascunho. Não há correção de código que substitua a liberação de espaço na conta Google.

As descrições anteriores de data imutável e catálogo somente inicial representam versões anteriores e foram substituídas por este comportamento.
