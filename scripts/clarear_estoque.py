from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# Titulo da tabela superior: deixa claro que e o resumo atual.
needle='<div class="card s8"><div id="tblPro"></div><h3 class="subhead">ENTRADAS DE ESTOQUE</h3>'
repl='<div class="card s8"><h3 class="subhead" style="margin-top:0">ESTOQUE ATUAL</h3><div id="tblPro"></div><h3 class="subhead">ENTRADAS DE ESTOQUE</h3>'
if needle in s:
    s=s.replace(needle,repl,1)
# Renomeia somente os botoes, sem alterar as funcoes.
s=s.replace('>Editar produto</button>','>Editar cadastro</button>')
s=s.replace('>Editar entrada</button>','>Editar compra</button>')
p.write_text(s,encoding='utf-8')
check=p.read_text(encoding='utf-8')
assert 'ESTOQUE ATUAL' in check
assert 'Editar cadastro' in check
assert 'Editar compra' in check
print('ESTOQUE_NOMES_OK')
