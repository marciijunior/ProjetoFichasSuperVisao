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
Na Vercel, use a pasta raiz `web` e o diretório de saída `public`. Configure `SESSION_SECRET` no ambiente protegido da Vercel. O código do conector Google fica em `google-sheets/Code.gs`; configure `ACCESS_TOKEN` nas propriedades do Apps Script. Configure GOOGLE_APPS_SCRIPT_URL e GOOGLE_SPREADSHEET_ID como variáveis privadas na Vercel e SPREADSHEET_ID nas propriedades do Apps Script. Nenhuma chave ou endereço de integração é incluído.

A coluna legada CPF guarda CPF ou CNPJ. Os números são preservados como texto. O botão de cópia copia sem pontuação; o texto visual pode ser selecionado normalmente.

## Rascunhos e segurança
Rascunhos permanecem apenas no navegador e são removidos ao sair da conta. Credenciais, configurações locais, imagens de documentos de clientes, exportações, capturas de tela e cache não fazem parte do repositório.

## Estrutura
- `web/`: interface e API da Vercel.
- `google-sheets/`: conector Apps Script.
- `tests/`: verificações com dados fictícios.
- `tools/update-catalogs.cjs`: atualização de catálogos públicos.

## REQ e caixa diário

A opção REQ identifica requisições. A seção Fechamento do caixa lista as fichas do dia de São Paulo, com cliente e valor inicialmente vazios, valores sugeridos de R$ 80 a R$ 600 (a cada R$ 10) e entrada manual. O total e as requisições são agrupados por cliente. Nomes são normalizados em maiúsculas preservando acentos.

O Apps Script acrescenta as colunas U/V (cliente do caixa e valor em centavos) apenas quando vazias, preservando as fichas existentes. Publique a nova versão do script antes do frontend. O caixa usa as mesmas permissões e sessão autenticada das fichas. Alterações pendentes permanecem neste navegador até salvar ou sair.

## Métodos de pagamento

No caixa, selecione REQ ou valor. REQ não compõe os totais monetários. Com um método marcado, todo o valor é atribuído a ele. Com dois ou mais, informe as parcelas; a soma deve ser igual ao valor da vistoria. Métodos: Dinheiro, Pix, Débito, Crédito, Transferência, Boleto, Cheque, Carteira digital e Outros. Valores legados sem método aparecem em Sem método / divisão pendente.

A coluna W, Pagamentos do caixa, armazena os métodos e parcelas em centavos. A migração aceita cabeçalhos anteriores de 20 ou 22 colunas e só acrescenta campos em colunas vazias. Publique o Apps Script antes do frontend.
