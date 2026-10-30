(function(){
  const ORIGEM='https://marcioespindolamge-star.github.io';
  let registros=new Map(),recebido=false;
  const originalStock=stock;
  const chave=v=>String(v||'').trim().toUpperCase().replace(/\\s+/g,' ');
  const numero=v=>Number(String(v||'').replace(',','.'));
  function consumo(id){
    const produto=pro(id);
    if(!produto||!recebido)return 0;
    let total=0;
    const ids=idsMesmoProduto(id);
    registros.forEach(r=>{
      if(r.tipo==='Plantio')return;
      (r.produtos||[]).forEach(p=>{
        if(chave(p.produto)!==chave(produto.nome))return;
        const doseTexto=String(p.dose||'').trim();
        const m=doseTexto.match(/^([0-9]+(?:[.,][0-9]+)?)\\s*(L|KG)$/i);
        if(!m||chave(m[2])!==chave(produto.unidade))return;
        const dose=numero(m[1]),area=numero(r.areaHa),quantidade=dose*area;
        if(!Number.isFinite(quantidade)||quantidade<=0)return;
        const jaLancado=db.aplicacoes.some(a=>ids.includes(a.produtoId)&&a.data===r.dia&&Math.abs(n(a.qtdTotal)-quantidade)<0.001&&Math.abs(n(a.dose)-dose)<0.001);
        if(!jaLancado)total+=quantidade;
      });
    });
    return total;
  }
  stock=function(id){return originalStock(id)-consumo(id)};
  window.addEventListener('message',e=>{
    if(e.origin!==ORIGEM||e.source!==document.getElementById('quadroManejoFrame')?.contentWindow)return;
    if(e.data?.tipo!=='PAINEIRA_MANEJO_V1'||!Array.isArray(e.data.registros))return;
    const novos=new Map();
    e.data.registros.forEach(r=>{if(r&&typeof r.id==='string'&&r.id&&Array.isArray(r.produtos))novos.set(r.id,r)});
    registros=novos;recebido=true;
    const aviso=document.getElementById('manejoIntegracaoStatus');
    if(aviso)aviso.textContent='Conectado: '+registros.size+' registros. Consumo calculado sem criar novas aplicações no banco.';
    render();
  });
  const frame=document.getElementById('quadroManejoFrame');
  if(frame)frame.addEventListener('load',()=>frame.contentWindow?.postMessage({tipo:'PAINEIRA_SOLICITAR_MANEJOS_V1'},ORIGEM));
  const status=document.createElement('div');
  status.id='manejoIntegracaoStatus';status.style.cssText='font-size:12px;padding:8px;color:#16452e';
  status.textContent='Abra o MANEJO para sincronizar o consumo com o estoque.';
  if(frame)frame.parentNode.insertBefore(status,frame);
})();