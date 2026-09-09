# MANEJO LAVOURA

Primeira versão funcional do sistema local para controle de lavouras.

## Já implementado

- Cadastro de lavouras com código único, nome, hectares, latitude, longitude e status.
- Safra/variedade com regra de apenas uma variedade de soja por lavoura em cada safra.
- Cadastro de produtos em litros ou quilos.
- Compras repetidas do mesmo produto com cálculo de valor unitário.
- Estoque automático: comprado, usado, saldo e custo médio.
- Aplicações por lavoura com dose por hectare e área total ou parcial.
- Cálculo automático de quantidade usada, custo da aplicação e custo por hectare.
- Bloqueio de aplicação quando o estoque é insuficiente.
- Edição e exclusão com proteções para preservar histórico.
- Dados persistidos no navegador através de localStorage.

## Uso

Abra o arquivo `index.html` em um navegador moderno. O sistema foi pensado para uso simples no computador, sem necessidade de servidor nesta primeira versão.
