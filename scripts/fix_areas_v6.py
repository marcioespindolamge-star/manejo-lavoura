from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
start=s.find('<script>\n/* LAVOURAS_EDITAR_EXCLUIR_V2 */')
if start < 0:
    raise SystemExit('marcador inicial nao encontrado')
s=s[:start]
patch='''<script>
/* AREAS_UNICA_V6 */
(function(){
  const form=document.getElementById('fLav');
  const cod=document.getElementById('lavCodigo');
  const nome=document.getElementById('lavNome');
  const area=document.getElementById('lavArea');
  const tabela=document.getElementById('tblLav');
  let editId='';
  function limpar(){editId='';form.reset();cod.focus();}
  function renderAreas(){
    const lista=db.lavouras||[];
    const total=lista.reduce((s,a)=>s+n(a.area),0);
    document.getElementById('totalLav').innerHTML='<b>ÁREA TOTAL CADASTRADA: '+total.toLocaleString('pt-BR',{maximumFractionDigits:2})+' ha</b>';
    tabela.innerHTML='<table><thead><tr><th>Código</th><th>Área</th><th>Tamanho</th><th>Ações</th></tr></thead><tbody>'+lista.map(a=>'<tr><td>'+String(a.codigo||'')+'</td><td><b>'+String(a.nome||'')+'</b></td><td>'+n(a.area).toLocaleString('pt-BR',{maximumFractionDigits:2})+' ha</td><td><button type="button" class="btn area-editar" data-id="'+a.id+'">Editar</button> <button type="button" class="btn danger area-excluir" data-id="'+a.id+'">Excluir</button></td></tr>').join('')+'</tbody></table>';
  }
  form.onsubmit=function(e){
    e.preventDefault();
    const codigo=cod.value.trim(), nm=nome.value.trim(), hectares=n(area.value);
    if(!codigo||!nm||hectares<=0)return alert('Preencha código, nome e área.');
    if((db.lavouras||[]).some(a=>String(a.id)!==String(editId)&&String(a.codigo||'').trim().toLowerCase()===codigo.toLowerCase()))return alert('Já existe uma área com este código.');
    if(editId){const a=db.lavouras.find(x=>String(x.id)===String(editId));if(!a)return;a.codigo=codigo;a.nome=nm;a.area=hectares;}
    else db.lavouras.push({id:uid(),codigo,nome:nm,area:hectares});
    save();renderAreas();limpar();
  };
  tabela.onclick=function(e){
    const b=e.target.closest('button[data-id]');if(!b)return;
    const id=b.dataset.id;
    if(b.classList.contains('area-editar')){
      const a=db.lavouras.find(x=>String(x.id)===String(id));if(!a)return;
      editId=String(a.id);cod.value=a.codigo||'';nome.value=a.nome||'';area.value=a.area||'';cod.focus();return;
    }
    if(b.classList.contains('area-excluir')){
      const a=db.lavouras.find(x=>String(x.id)===String(id));if(!a)return;
      const usada=(db.safras||[]).some(x=>String(x.lavouraId)===String(id))||(db.aplicacoes||[]).some(x=>String(x.lavouraId)===String(id))||(db.manejos||[]).some(x=>String(x.lavouraId)===String(id));
      if(usada)return alert('Esta área possui variedade ou manejo vinculado e não pode ser excluída.');
      if(!confirm('Excluir a área '+(a.nome||a.codigo)+'?'))return;
      db.lavouras=db.lavouras.filter(x=>String(x.id)!==String(id));save();renderAreas();limpar();
    }
  };
  const renderBase=render;
  render=function(){renderBase();renderAreas();};
  renderAreas();
})();
</script>
</body></html>'''
p.write_text(s+patch,encoding='utf-8')
