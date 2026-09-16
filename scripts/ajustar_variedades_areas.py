from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove apenas os campos visiveis de Area/Lavoura e Ano Safra do cadastro de variedade.
s,n=re.subn(r'<label>Lavoura</label><select id="varLav" required></select><label>Ano Safra</label><input id="varAno" readonly>', '', s, count=1)
if n != 1:
    raise SystemExit('Campos antigos de variedade nao encontrados')

# Mantem IDs/funcoes internos intactos e cria cadastro de cultivar independente.
pat=r"\$\('fVar'\)\.onsubmit=e=>\{.*?\};"
novo="""$('fVar').onsubmit=e=>{e.preventDefault();let id=$('varEditId').value,nome=$('varNome').value.trim(),ciclo=$('varCiclo').value.trim(),obs=$('varObs').value.trim();if(!nome)return alert('Informe a variedade / cultivar.');if(id){let v=db.safras.find(x=>String(x.id)===String(id));if(v){v.variedade=nome;v.ciclo=ciclo;v.obs=obs;}}else db.safras.push({id:uid(),variedade:nome,ciclo,obs});save();cancelarVariedade();};"""
s,n=re.subn(pat,novo,s,count=1,flags=re.S)
if n != 1:
    raise SystemExit('Submit de variedade nao encontrado')

# Neutraliza somente referencias aos dois controles removidos nas rotinas da tela.
s=re.sub(r"\$\('varLav'\)\.value=.*?;",'',s)
s=re.sub(r"\$\('varAno'\)\.value=.*?;",'',s)

# Altera SOMENTE textos HTML visiveis especificos; nunca substitui palavras dentro do JavaScript.
s=s.replace('<th>Lavoura</th>','<th>Área</th>')
s=s.replace('<label>Lavoura</label>','<label>Área</label>')
s=s.replace('RELATÓRIO POR LAVOURA','RELATÓRIO POR ÁREA')
s=s.replace('Selecione as lavouras','Selecione as áreas')

p.write_text(s,encoding='utf-8')
check=p.read_text(encoding='utf-8')
assert '<select id="varLav" required>' not in check
assert '<input id="varAno" readonly>' not in check
assert "$('fVar').onsubmit" in check
print('VARIEDADE_INDEPENDENTE_OK')
