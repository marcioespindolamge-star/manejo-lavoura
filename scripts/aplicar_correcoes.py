from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Remove todas as correcoes antigas empilhadas depois do script principal.
markers=['LAVOURAS_EDITAR_EXCLUIR_V2','AREAS_MENU_EDIT_V1','FORCAR_ACOES_AREAS_V2','AREAS_DEFINITIVO_V3','AREAS_UNICA_V4','AREAS_UNICA_V5','AREAS_LIMPA_V6']
for marker in markers:
    s=re.sub(r'<script>\s*(?:\\n)?\s*/\*\s*'+re.escape(marker)+r'\s*\*/.*?</script>\s*(?:\\n)?', '', s, flags=re.S)

patch=r'''<script>
/* AREAS_LIMPA_V6 */
(function(){
  const form=document.getElementById('fLav');
  const cod=document.getElementById('lavCodigo');
  const nome=document.getElementById('lavNome');
  const area=document.getElementById('lavArea');
  const tabela=document.getElementById('tblLav');
  let editId='';
  const sameId=(a,b)=>String(a)===String(b);
  const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function limpar(){editId='';form.reset();cod.focus();}
  function renderAreas(){
    const lista=db.lavouras||[];
    const total=lista.reduce((s,a)=>s+n(a.area),0);
    document.getElementById('totalLav').innerHTML='<b>ÁREA TOTAL CADASTRADA: '+total.toLocaleString('pt-BR',{maximumFractionDigits:2})+' ha</b>';
    tabela.innerHTML='<table><thead><tr><th>Código</th><th>Área</th><th>Tamanho</th><th>Ações</th></tr></thead><tbody>'+lista.map(a=>'<tr><td>'+html(a.codigo)+'</td><td><b>'+html(a.nome)+'</b></td><td>'+n(a.area).toLocaleString('pt-BR',{maximumFractionDigits:2})+' ha</td><td style="white-space:nowrap"><button type="button" class="btn area-editar" data-id="'+html(a.id)+'">Editar</button> <button type="button" class="btn danger area-excluir" data-id="'+html(a.id)+'">Excluir</button></td></tr>').join('')+'</tbody></table>';
  }
  form.onsubmit=function(e){
    e.preventDefault();
    const codigo=cod.value.trim(), nm=nome.value.trim(), hectares=n(area.value);
    if(!codigo||!nm||hectares<=0)return alert('Preencha todos os campos da área.');
    if((db.lavouras||[]).some(a=>!sameId(a.id,editId)&&String(a.codigo||'').trim().toLowerCase()===codigo.toLowerCase()))return alert('Já existe uma área com este Código/Nome.');
    if(editId){const a=db.lavouras.find(x=>sameId(x.id,editId));if(!a)return;a.codigo=codigo;a.nome=nm;a.area=hectares;}
    else db.lavouras.push({id:uid(),codigo,nome:nm,area:hectares});
    save();
    limpar();
    renderAreas();
  };
  tabela.onclick=function(e){
    const b=e.target.closest('button[data-id]');if(!b)return;
    const id=b.dataset.id;
    const a=(db.lavouras||[]).find(x=>sameId(x.id,id));if(!a)return;
    if(b.classList.contains('area-editar')){editId=String(id);cod.value=a.codigo||'';nome.value=a.nome||'';area.value=a.area||'';cod.focus();return;}
    if(b.classList.contains('area-excluir')){
      const usada=(db.safras||[]).some(x=>sameId(x.lavouraId,id))||(db.aplicacoes||[]).some(x=>sameId(x.lavouraId,id))||(db.manejos||[]).some(x=>sameId(x.lavouraId,id));
      if(usada)return alert('Esta área possui variedade ou manejo vinculado e não pode ser excluída.');
      if(!confirm('Excluir a área '+(a.nome||a.codigo)+'?'))return;
      db.lavouras=db.lavouras.filter(x=>!sameId(x.id,id));
      save();
      limpar();
      renderAreas();
    }
  };
  const renderBase=render;
  render=function(){renderBase();renderAreas();};
  window.renderAreasTabela=renderAreas;
  renderAreas();
})();
</script>
'''
s=s.replace('</body>',patch+'</body>',1)
p.write_text(s,encoding='utf-8')

check=p.read_text(encoding='utf-8')
assert check.count('AREAS_LIMPA_V6')==1
assert 'renderAll()' not in check
assert 'area-editar' in check and 'area-excluir' in check
print('AREAS_V6_OK')
