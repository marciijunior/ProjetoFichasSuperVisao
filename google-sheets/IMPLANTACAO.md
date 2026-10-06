# Implantação do conector

1. Crie um projeto Google Apps Script e copie Code.gs.
2. Ative o serviço avançado Google Sheets v4.
3. Em Propriedades do script, configure SPREADSHEET_ID com o ID da planilha e ACCESS_TOKEN com uma chave forte privada.
4. Prepare a aba Fichas com as colunas indicadas em HEADERS no código, sem alterar sua ordem.
5. Implante como aplicativo da Web, executado pela conta proprietária. O conector exige a chave para acessar as fichas.
6. Na Vercel, configure GOOGLE_APPS_SCRIPT_URL, GOOGLE_SPREADSHEET_ID e SESSION_SECRET como variáveis privadas de ambiente.

Não publique IDs de implantação, links administrativos, chaves de acesso ou exportações de clientes neste repositório. Os testes automatizados usam identificadores fictícios.
