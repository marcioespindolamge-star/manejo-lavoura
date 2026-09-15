from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

s = s.replace('>🌱 Lavouras</button>', '>🌱 Áreas</button>')
s = s.replace('<section id="lavouras" class="page active"><h2>LAVOURAS</h2>', '<section id="lavouras" class="page active"><h2>ÁREAS</h2>')

# A funcionalidade de Editar/Excluir já foi inserida na versão anterior.
# Este patch também garante que a tabela seja renderizada com a coluna Ações.
if '/* AREAS_MENU_EDIT_V1 */' not in s:
    raise SystemExit('Patch de Editar/Excluir não encontrado no index.html')

p.write_text(s, encoding='utf-8')
