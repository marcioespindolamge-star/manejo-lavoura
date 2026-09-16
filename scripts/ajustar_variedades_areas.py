from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# Cadastro de variedade deixa de escolher area e safra; a associacao sera feita no Plantio.
s=re.sub(r'<label>Lavoura</label><select id="varLav" required></select><label>Ano Safra</label><input id="varAno" readonly>', '', s, count=1)
# Substitui o manipulador do formulario de variedades por cadastro independente.
pat=r"\$\('fVar'\)\.onsubmit=e=>\{.*?\};"
novo="""$('fVar').onsubmit=e=>{e.preventDefault();let id=$('varEditId').value,nome=$('varNome').value.trim(),ciclo=$('varCiclo').value.trim(),obs=$('varObs').value.trim();if(!nome)return alert('Informe a variedade / cultivar.');if(id){let v=db.safras.find(x=>String(x.id)===String(id));if(v){v.variedade=nome;v.ciclo=ciclo;v.obs=obs;delete v.lavouraId;delete v.anoSafra;}}else db.safras.push({id:uid(),variedade:nome,ciclo,obs});save();cancelarVariedade();};"""
s,n=re.subn(pat,novo,s,count=1,flags=re.S)
if n!=1: print('AVISO: submit variedade nao localizado')
# Remove referencias obrigatorias aos campos antigos dentro das funcoes de editar/cancelar, se existirem.
s=re.sub(r"\$\('varLav'\)\.value=.*?;",'',s)
s=re.sub(r"\$\('varAno'\)\.value=.*?;",'',s)
# Troca textos visiveis de Lavoura para Area em todo o sistema, mantendo IDs internos.
for a,b in [('Lavouras','Áreas'),('LAVOURAS','ÁREAS'),('Lavoura','Área'),('LAVOURA','ÁREA'),('lavoura','área')]: s=s.replace(a,b)
p.write_text(s,encoding='utf-8')
print('VARIEDADES_AREAS_OK')
