# SuperVisão Fichas

Aplicativo interno de vistorias para navegador, publicado em https://supervisao-fichas.vercel.app.

## Recursos
- Início com somente as vistorias do dia, no fuso America/Sao_Paulo.
- CPF/CNPJ selecionável e botão de cópia sem pontuação, no início e nas análises.
- Análises com histórico completo, filtro Hoje, períodos, gráficos e exportação CSV.
- Cadastro manual: nome, CPF/CNPJ, modelo e placa obrigatórios; data automática e editável.
- Número sem função financeira, sugestões 8 a 15.
- Edição, exclusão com confirmação e tela de rascunhos locais.
- Google Sheets como banco, com chave de acesso e sessão protegida.

## Desenvolvimento
Node.js 24. Execute `node web/dev.cjs` na raiz e abra http://127.0.0.1:4176.
Testes: `node --test tests/sheets.test.cjs web/test/*.test.cjs`.
Os testes de interface em `tests/` usam Playwright e Chrome, com dados fictícios. Requerem o servidor local. Instale Playwright no ambiente de desenvolvimento; `CHROME_PATH` pode personalizar o navegador no teste today-copy-ui.

## Publicação
Na Vercel, use a pasta raiz `web` e o diretório de saída `public`. Configure `SESSION_SECRET` no ambiente protegido da Vercel. O código do conector Google fica em `google-sheets/Code.gs`; configure `ACCESS_TOKEN` nas propriedades do Apps Script. Os endereços existentes da planilha e da implantação estão no código, mas nenhuma chave de acesso é incluída.

A coluna legada CPF guarda CPF ou CNPJ. Os números são preservados como texto. O botão de cópia copia sem pontuação; o texto visual pode ser selecionado normalmente.

## Rascunhos e segurança
Rascunhos permanecem apenas no navegador e são removidos ao sair da conta. Credenciais, configurações locais, imagens de documentos de clientes, exportações, capturas de tela e cache não fazem parte do repositório.

## Estrutura
- `web/`: interface e API da Vercel.
- `google-sheets/`: conector Apps Script.
- `tests/`: verificações com dados fictícios.
- `tools/update-catalogs.cjs`: atualização de catálogos públicos.

