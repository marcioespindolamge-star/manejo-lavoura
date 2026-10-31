(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toUpperCase().replace(/\s+/g,' ');
const num=v=>{const m=String(v??'0').replace(',','.').match(/-?[0-9]+(?:\.[0-9]+)?/);return m?Number(m[0]):0};
const rows=()=>Array.isArray(db.manejosIntegrados)?db.manejosIntegrados:(db.manejosIntegrados=[]);
let editing=null,importBusy=false;
// Nomes e hectares da origem, preservando a identidade da área de cada registro.
const nomesOriginais=[
 ['FRENTE 01 - ALEX',16],['FRENTE 02 - ALEX',29],['FRENTE 03 - BELMIRO',26],
 ['FUNDO 04 - OVELHA',18],['FUNDO 05 - SAIBRO EUCALIPTO',14],
 ['FUNDO 06 - BERGAMOTEIRA',24],['FUNDO 07 - TAPERA ADÃO',25],
 ['FUNDO 08 - ÁREA NOVA MATO',22],['FUNDO 09 - MATO',53],['FUNDO 10 - VALDOMIRO',10]
];
const chavesOriginais=['frente01','frente02','frente03','fundo04','fundo05','fundo06','fundo07','fundo08','fundo09','fundo10'];
const indicesLegados=[0,1,2,2,2,3,3,4,5,6,7,8,9];
function resolverArea(r,areas){
 const idx=r.areaKey?chavesOriginais.indexOf(r.areaKey):indicesLegados[Number(r.areaIndex)];
 const porChave=areas.find(a=>a.key===r.areaKey);
 const base=porChave||(Number.isInteger(idx)&&idx>=0?{nome:nomesOriginais[idx][0],ha:nomesOriginais[idx][1]}:null);
 return {nome:base?.nome||r.areaNome||'',ha:num(base?.ha)||num(r.areaHa)};
}
function areaExibida(r){return esc(r.areaNome||'SEM ÁREA')+' — <b>'+num(r.areaHa).toLocaleString('pt-BR')+' ha</b>'}

// Controle de estoque desativado a pedido: o MANEJO não altera o saldo das compras.
function descontar(id){
 const p=pro(id);if(!p)return 0;
 let total=0;const ids=idsMesmoProduto(id);
 for(const r of rows())for(const x of r.produtos||[]){
  if(norm(x.produto)!==norm(p.nome)||norm(x.unidade)!==norm(p.unidade))continue;
  const qty=num(x.dose)*num(r.areaHa);if(qty<=0)continue;
  // Um lançamento manual equivalente já existente não pode ser debitado novamente.
  const duplicado=db.aplicacoes.some(a=>ids.includes(a.produtoId)&&a.data===r.dia&&Math.abs(num(a.qtdTotal)-qty)<0.001&&Math.abs(num(a.dose)-num(x.dose))<0.001);
  if(!duplicado)total+=qty;
 }
 return total;
}
// Nenhuma baixa de estoque é calculada ou aplicada.
function mostrar(){
 const host=$('areaManejoIntegrado');if(!host)return;
 host.innerHTML='<div class="no-print" style="margin-bottom:10px"><button class="btn" onclick="voltarManejoIntegrado()">← VOLTAR</button></div>'+
 '<h2>MANEJO DAS LAVOURAS</h2><p style="font-size:13px">Registros armazenados no GASTOS. O manejo não desconta produtos nem controla estoque.</p>'+
 '<div class="card" style="padding:12px;margin-bottom:12px"><h3>NOVO MANEJO / EDITAR</h3><form id="miForm"><div class="r2"><div><label>Lavoura</label><select id="miArea" required></select></div><div><label>Data</label><input id="miDia" type="date" required></div></div>'+
 '<div class="r2"><div><label>Tipo de manejo</label><select id="miTipo"><option>Manejo de inverno</option><option>Dessecação</option><option>Plantio</option><option>Adubação</option><option>Capina</option><option>Fungicida</option><option>Herbicida</option><option>Inseticida</option><option>Colheita</option><option>Outro</option></select></div><div><label>Observação</label><input id="miObs"></div></div>'+
 '<div id="miProdutos"></div><div class="actions"><button type="button" class="btn" id="miAdd">+ PRODUTO</button><button class="btn pri" type="submit">SALVAR MANEJO</button><button type="button" class="btn" id="miCancel">CANCELAR</button></div></form></div>'+
 '<div class="card" style="padding:12px;margin-bottom:12px"><h3>REGISTROS</h3><div id="miLista"></div></div>'+
 '<details class="card" style="padding:12px"><summary style="cursor:pointer;font-weight:bold">IMPORTAR MANEJOS ANTIGOS (UMA VEZ)</summary><p style="font-size:13px">Para preservar o histórico do Firebase antigo, informe o acesso do MANEJO uma única vez. Os documentos serão copiados pelo ID original. Nenhum registro antigo será apagado.</p><form id="miImport"><label>E-mail do MANEJO</label><input id="miEmail" type="email" required autocomplete="username"><label>Senha do MANEJO</label><input id="miSenha" type="password" required autocomplete="current-password"><button class="btn pri" type="submit">IMPORTAR REGISTROS</button></form><p id="miImportStatus" role="status"></p></details>';
 $('miArea').innerHTML=db.lavouras.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.nome)+' — '+num(l.area)+' ha</option>').join('');
 $('miDia').value=new Date().toISOString().slice(0,10);
 $('miAdd').onclick=()=>addProduto();
 $('miCancel').onclick=limpar;
 $('miForm').onsubmit=salvarManejo;
 $('miImport').onsubmit=importar;
 addProduto();listar();
}
function addProduto(p={},foco=false){
 const el=document.createElement('div');el.className='r2';el.style.marginBottom='8px';
 el.innerHTML='<div><label>Produto</label><input class="miNome" list="miSugestoes" value="'+esc(p.produto||'')+'" placeholder="Produto"></div><div style="display:flex;gap:5px;align-items:end"><div style="flex:1"><label>Dose/ha</label><input class="miDose" inputmode="decimal" value="'+esc(p.dose||'')+'"></div><div style="width:70px"><label>Unid.</label><select class="miUnidade"><option>L</option><option>KG</option></select></div><button class="btn danger miRem" type="button">×</button></div>';
 $('miProdutos').appendChild(el);el.querySelector('.miUnidade').value=p.unidade||'L';
 el.querySelector('.miRem').onclick=()=>el.remove();
 let datalist=$('miSugestoes');if(!datalist){datalist=document.createElement('datalist');datalist.id='miSugestoes';$('miProdutos').appendChild(datalist)}
 datalist.innerHTML=produtosUnicos().map(x=>'<option value="'+esc(x.nome)+'"></option>').join('');
 if(foco)el.querySelector('.miNome').focus();
}
function limpar(){editing=null;$('miForm').reset();$('miProdutos').innerHTML='';addProduto()}
function salvarManejo(e){
 e.preventDefault();const lav=lavById($('miArea').value);if(!lav)return alert('Selecione uma lavoura');
 const tipo=$('miTipo').value;
 const produtos=[...document.querySelectorAll('#miProdutos>.r2')].map(el=>({produto:el.querySelector('.miNome').value.trim(),dose:num(el.querySelector('.miDose').value),unidade:el.querySelector('.miUnidade').value})).filter(p=>p.produto&&p.dose>0);
 if(!['Plantio','Colheita','Outro'].includes(tipo)&&!produtos.length)return alert('Informe produto e dose.');
 const r={id:editing||'gastos-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),lavouraId:lav.id,areaNome:lav.nome,areaHa:num(lav.area),dia:$('miDia').value,tipo,observacao:$('miObs').value.trim(),produtos};
 const i=rows().findIndex(x=>x.id===r.id);if(i>=0)db.manejosIntegrados[i]=r;else rows().push(r);
 save();limpar();listar();alert('Manejo salvo no GASTOS.');
}
function lavById(id){return db.lavouras.find(l=>String(l.id)===String(id))}
function listar(){
 const target=$('miLista');if(!target)return;
 const arr=[...rows()].sort((a,b)=>String(b.dia||'').localeCompare(String(a.dia||'')));
 target.innerHTML=arr.length?'<div style="overflow-x:auto"><table><tr><th>Data</th><th>Área</th><th>Manejo / Produtos</th><th>Ações</th></tr>'+arr.map(r=>'<tr><td>'+esc(r.dia)+'</td><td>'+esc(r.areaNome)+'</td><td><b>'+esc(r.tipo)+'</b><div>'+esc((r.produtos||[]).map(p=>p.produto+' '+p.dose+' '+p.unidade+'/ha').join(' • '))+'</div></td><td><button class="btn miEdit" data-id="'+esc(r.id)+'">EDITAR</button> <button class="btn danger miDelete" data-id="'+esc(r.id)+'">EXCLUIR</button></td></tr>').join('')+'</table></div>':'Nenhum manejo registrado neste banco.';
 target.querySelectorAll('.miEdit').forEach(b=>b.onclick=()=>editar(b.dataset.id));
 target.querySelectorAll('.miDelete').forEach(b=>b.onclick=()=>excluir(b.dataset.id));
}
function editar(id){const r=rows().find(x=>x.id===id);if(!r)return;editing=id;$('miArea').value=r.lavouraId;$('miDia').value=r.dia;$('miTipo').value=r.tipo;$('miObs').value=r.observacao||'';$('miProdutos').innerHTML='';(r.produtos||[]).forEach(p=>addProduto(p));if(!r.produtos?.length)addProduto();$('miForm').scrollIntoView({behavior:'smooth'})}
function excluir(id){if(!confirm('Excluir este manejo?'))return;db.manejosIntegrados=rows().filter(x=>x.id!==id);save();listar()}
async function importar(e){
 e.preventDefault();if(importBusy)return;
 const status=$('miImportStatus');importBusy=true;status.textContent='Conectando ao banco antigo...';
 try{
  const nome='migracao-manejo';let app=firebase.apps.find(x=>x.name===nome);
  if(!app)app=firebase.initializeApp({apiKey:'AIzaSyBREfDuGOG2IwXlzsZaseCSQLGMYTmyZ5A',authDomain:'manejo-celular.firebaseapp.com',projectId:'manejo-celular',appId:'1:88332679453:web:8f8a62078441c02ad7c9f4'},nome);
  const a=app.auth();const user=await a.signInWithEmailAndPassword($('miEmail').value.trim(),$('miSenha').value);
  if(user.user.uid!=='cFbvu67r3DhBptgBLaZfFybtCEf2')throw Error('Esta conta não está autorizada no MANEJO.');
  const fs=app.firestore();const snap=await fs.collection('manejos').get();const areaSnap=await fs.doc('configuracao_areas/areas').get();const areas=areaSnap.exists&&Array.isArray(areaSnap.data().areas)?areaSnap.data().areas:[];
  if(areas.length)db.manejoAreas=areas.filter(a=>a&&a.key&&a.nome&&num(a.ha)>0).map(a=>({key:a.key,nome:a.nome,ha:num(a.ha)}));
  let novos=0,existentes=0;const ids=new Set(rows().map(x=>x.id));
  snap.forEach(doc=>{
   if(ids.has('antigo-'+doc.id)){const antigo=rows().find(x=>x.id==='antigo-'+doc.id);if(antigo){const area=resolverArea(doc.data(),areas);antigo.areaNome=area.nome;antigo.areaHa=area.ha;if(doc.data().areaKey)antigo.areaKey=doc.data().areaKey;}existentes++;return}
   const r=doc.data(),ps=(r.produtos||[]).map(p=>{const m=String(p.dose||'').match(/^\s*([0-9.,]+)\s*(L|KG)?/i);return {produto:p.produto||'',dose:m?num(m[1]):0,unidade:m?.[2]?.toUpperCase()||'L'}}).filter(p=>p.produto&&p.dose>0);
   const area=resolverArea(r,areas);const lav=db.lavouras.find(l=>norm(l.nome)===norm(area.nome))||null;
   rows().push({id:'antigo-'+doc.id,origem:'manejo-celular',areaKey:r.areaKey||'',dia:r.dia||'',tipo:r.tipo||'Outro',lavouraId:lav?.id||'',areaNome:area.nome,areaHa:area.ha,observacao:r.observacao||'',produtos:ps});
   novos++;
  });
  save();atualizarCatalogoMI();listar();$('miSenha').value='';
  status.textContent='Conferência concluída: '+novos+' novos; '+existentes+' atualizados/conferidos. Nomes e hectares recuperados do MANEJO original.';
  await a.signOut();
 }catch(err){status.textContent='Importação não concluída: '+(err.code||err.message);console.error('Importação',err)}
 finally{importBusy=false}
}
window.abrirManejoIntegrado=function(){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='produtos'));$('menuPrincipalGastos').style.display='none';$('areaCompras').style.display='none';$('areaManejoIntegrado').style.display='block';mostrar();window.scrollTo(0,0)};
window.voltarManejoIntegrado=function(){$('areaManejoIntegrado').style.display='none';$('menuPrincipalGastos').style.display='flex';window.scrollTo(0,0)};

/* Quadro visual compacto, inspirado no layout original do MANEJO. */
let areaSelecionadaMI='',formAbertoMI=false;
const nomesAntigosMI={
 'FRENTE 16':'frente01','FRENTE 29':'frente02','FRENTE 3':'frente03','FRENTE 14':'frente03','FRENTE 9':'frente03',
 'FUNDO OVELHA 10':'fundo04','FUNDO OVELHA 8':'fundo04','FUNDO SAIBRO 14':'fundo05',
 'FUNDO BERGAMOTEIRA 23':'fundo06','FUNDO TAPERA 25':'fundo07','FUNDO ÁREA NOVA 22':'fundo08',
 'FUNDO MATO 53':'fundo09','FUNDO VALDOMIRO 9':'fundo10'
};
const formatoHaMI=n=>num(n).toLocaleString('pt-BR',{maximumFractionDigits:2});
const formatoDoseMI=n=>num(n).toLocaleString('pt-BR',{minimumFractionDigits:num(n)>0&&num(n)<1?3:0,maximumFractionDigits:3});
const dataBRMI=d=>/^\d{4}-\d\d-\d\d$/.test(d||'')?d.slice(8,10)+'/'+d.slice(5,7):esc(d||'');
function catalogoMI(){
 const base=nomesOriginais.map((x,i)=>({key:chavesOriginais[i],nome:x[0],ha:x[1]}));
 const catalogo=Array.isArray(db.manejoAreas)?db.manejoAreas:[];
 for(const a of catalogo){if(!a||!a.key)continue;const i=base.findIndex(b=>b.key===a.key);const novo={key:String(a.key),nome:String(a.nome||''),ha:num(a.ha)};if(i>=0)base[i]=novo;else base.push(novo)}
 for(const r of rows()){
  const chave=chaveMI(r);
  if(base.some(a=>a.key===chave))continue;
  base.push({key:chave,nome:String(r.areaNome||'ÁREA SEM NOME'),ha:num(r.areaHa)});
 }
 return base;
}
function chaveMI(r){
 if(r.areaKey)return String(r.areaKey);
 const nome=norm(r.areaNome);
 const original=nomesOriginais.findIndex(a=>norm(a[0])===nome);
 if(original>=0)return chavesOriginais[original];
 if(nomesAntigosMI[nome])return nomesAntigosMI[nome];
 return 'extra-'+nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'-').toLowerCase();
}
function areaMI(){return catalogoMI().find(a=>a.key===areaSelecionadaMI)}
function atualizarCatalogoMI(){
 const areas=catalogoMI();
 if(!areas.some(a=>a.key===areaSelecionadaMI))areaSelecionadaMI=areas[0]?.key||'';
 const sel=$('miAreaSelect');if(!sel)return;
 sel.innerHTML=areas.map(a=>'<option value="'+esc(a.key)+'">'+esc(a.nome)+' — '+formatoHaMI(a.ha)+' HA</option>').join('');
 sel.value=areaSelecionadaMI;
 $('miTotal').textContent=formatoHaMI(areas.reduce((v,a)=>v+num(a.ha),0))+' HA';
}
mostrar=function(){
 const host=$('areaManejoIntegrado');if(!host)return;
 host.innerHTML='<div style="padding:10px 12px;background:#f2f6f1"><button class="btn" id="miVoltar">← VOLTAR</button></div><div class="mi-hero"><img class="mi-logo" src="https://marcioespindolamge-star.github.io/quadro-manejo/LogoTrator.png" alt="Manejo"><h2>MANEJO DAS LAVOURAS</h2><p>AGROPECUÁRIA PAINEIRA</p></div>'+
 '<div class="mi-wrap"><div class="mi-tools"><div class="mi-total">ÁREA TOTAL<strong id="miTotal">—</strong></div><button class="mi-caderno" id="miCaderno">📋 CADERNO DE CAMPO</button></div>'+
 '<div class="mi-panel"><h3>SELECIONE A LAVOURA</h3><div class="mi-picker"><select id="miAreaSelect" aria-label="Selecione a lavoura"></select><button class="mi-areaadd" id="miNovaArea">+ ÁREA</button></div></div>'+
 '<button class="mi-report" id="miRelatorio">📄 RELATÓRIO GERAL</button><div class="mi-reportview" id="miReportView"></div>'+
 '<div id="miLista"></div>'+
 '<div class="mi-panel mi-formpanel" id="miFormPanel"><h3 id="miFormTitulo">NOVO MANEJO</h3><form id="miForm"><div class="r2"><div><label>Lavoura</label><select id="miArea" required></select></div><div><label>Data</label><input id="miDia" type="date" required></div></div>'+
 '<div class="r2"><div><label>Tipo de manejo</label><select id="miTipo"><option>Manejo de inverno</option><option>Dessecação</option><option>Plantio</option><option>Adubação</option><option>Capina</option><option>Fungicida</option><option>Herbicida</option><option>Inseticida</option><option>Colheita</option><option>Outro</option></select></div><div><label>Observação</label><input id="miObs"></div></div>'+
 '<div id="miProdutos"></div><div class="actions"><button type="button" class="btn" id="miAdd">+ PRODUTO</button><button class="btn pri" type="submit">SALVAR MANEJO</button><button type="button" class="btn" id="miCancel">CANCELAR</button></div></form></div>'+
 '<details class="mi-panel" id="miImportBox"><summary style="cursor:pointer;font-weight:800;color:#245d39">IMPORTAR / CONFERIR MANEJOS ANTIGOS</summary><p class="mi-note">Os registros originais não serão apagados. Registros já importados serão reconhecidos pelo ID.</p><form id="miImport"><label>E-mail do MANEJO antigo</label><input id="miEmail" type="email" required autocomplete="username"><label>Senha</label><input id="miSenha" type="password" required autocomplete="current-password"><button class="btn pri" type="submit">CONFERIR REGISTROS</button></form><p id="miImportStatus" role="status"></p></details>'+
 '</div>';
 $('miAreaSelect').onchange=e=>{areaSelecionadaMI=e.target.value;formAbertoMI=false;if($('miFormPanel'))$('miFormPanel').classList.remove('on');listar()};
 $('miNovaArea').onclick=()=>editarAreaMI(true);
 $('miCaderno').onclick=()=>window.open('https://marcioespindolamge-star.github.io/quadro-manejo/?abrir=caderno','_blank','noopener');
 $('miRelatorio').onclick=relatorioMI;
 $('miVoltar').onclick=voltarManejoIntegrado;
 $('miVoltar').classList.add('mi-voltar');host.querySelector('.mi-hero').prepend($('miVoltar'));
 $('miAdd').onclick=()=>addProduto({},true);
 $('miCancel').onclick=limpar;
 $('miForm').onsubmit=salvarManejo;
 $('miImport').onsubmit=importar;
 $('miDia').value=new Date().toLocaleDateString('en-CA');
 atualizarCatalogoMI();addProduto();listar();
};
function abrirFormularioMI(id){
 const area=areaMI();if(!area)return;
 formAbertoMI=true;
 $('miFormPanel').classList.add('on');
 $('miFormTitulo').textContent=id?'EDITAR MANEJO':'NOVO MANEJO — '+area.nome;
 $('miArea').innerHTML=catalogoMI().map(a=>'<option value="'+esc(a.key)+'">'+esc(a.nome)+' — '+formatoHaMI(a.ha)+' HA</option>').join('');
 $('miArea').value=areaSelecionadaMI;
 if(!id){editing=null;$('miForm').reset();$('miArea').value=areaSelecionadaMI;$('miDia').value=new Date().toLocaleDateString('en-CA');$('miProdutos').innerHTML='';addProduto()}
 $('miFormPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
listar=function(){
 const target=$('miLista');if(!target)return;
 atualizarCatalogoMI();
 const area=areaMI();if(!area){target.textContent='Nenhuma lavoura cadastrada.';return}
 const rs=rows().filter(r=>chaveMI(r)===area.key).sort((a,b)=>String(a.dia||'').localeCompare(String(b.dia||'')));
 target.innerHTML='<section class="mi-field"><div class="mi-fieldhead"><span class="mi-name">'+esc(area.nome)+'</span><button class="mi-icon" id="miEditarArea" title="Editar área">✎</button><span class="mi-ha">'+formatoHaMI(area.ha)+' HA</span></div>'+
 (rs.length?rs.map(r=>'<article class="mi-card"><div class="mi-cardtop"><span class="mi-date">'+dataBRMI(r.dia)+'</span><span class="mi-kind">'+esc(r.tipo||'Outro')+'</span><button class="mi-icon miEdit" data-id="'+esc(r.id)+'" title="Editar manejo">✎</button><button class="mi-icon danger miDelete" data-id="'+esc(r.id)+'" title="Excluir manejo">×</button></div>'+
 ((r.produtos||[]).length?'<div class="mi-products">'+r.produtos.map(p=>'<span class="mi-pname">'+esc(p.produto)+'</span><span class="mi-pdose">'+formatoHaMI(p.dose)+' '+esc(p.unidade||'L')+'</span>').join('')+'</div>':'')+
 (r.observacao?'<p class="mi-note">'+esc(r.observacao)+'</p>':'')+'</article>').join(''):'<p class="mi-note" style="padding:12px">Nenhum manejo registrado nesta lavoura.</p>')+
 '<button class="mi-new" id="miNovo">+ MANEJO</button></section>';
 $('miEditarArea').onclick=()=>editarAreaMI(false);
 $('miNovo').onclick=()=>abrirFormularioMI();
 target.querySelectorAll('.miEdit').forEach(b=>b.onclick=()=>editar(b.dataset.id));
 target.querySelectorAll('.miDelete').forEach(b=>b.onclick=()=>excluir(b.dataset.id));
};
limpar=function(){editing=null;formAbertoMI=false;const el=$('miFormPanel');if(el)el.classList.remove('on');if($('miForm')){$('miForm').reset();$('miProdutos').innerHTML='';addProduto()}};
editar=function(id){
 const r=rows().find(x=>x.id===id);if(!r)return;
 areaSelecionadaMI=chaveMI(r);abrirFormularioMI(id);editing=id;
 $('miArea').value=areaSelecionadaMI;$('miDia').value=r.dia;$('miTipo').value=r.tipo;$('miObs').value=r.observacao||'';
 $('miProdutos').innerHTML='';(r.produtos||[]).forEach(p=>addProduto(p));if(!(r.produtos||[]).length)addProduto();
};
salvarManejo=function(e){
 e.preventDefault();const area=catalogoMI().find(a=>a.key===$('miArea').value);if(!area)return alert('Selecione uma lavoura.');
 const tipo=$('miTipo').value;
 const produtos=[...document.querySelectorAll('#miProdutos>.r2')].map(el=>({produto:el.querySelector('.miNome').value.trim(),dose:num(el.querySelector('.miDose').value),unidade:el.querySelector('.miUnidade').value})).filter(p=>p.produto&&p.dose>0);
 if(!['Plantio','Colheita','Outro'].includes(tipo)&&!produtos.length)return alert('Informe produto e dose.');
 const anterior=editing?rows().find(r=>r.id===editing):null;
 const r={...anterior,id:editing||'gastos-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),areaKey:area.key,areaNome:area.nome,areaHa:area.ha,lavouraId:anterior?.lavouraId||'',dia:$('miDia').value,tipo,observacao:$('miObs').value.trim(),produtos};
 const i=rows().findIndex(x=>x.id===r.id);if(i>=0)db.manejosIntegrados[i]=r;else rows().push(r);
 areaSelecionadaMI=area.key;save();limpar();listar();
};
function editarAreaMI(nova){
 const a=areaMI(),antigo=$('miAreaEditor');if(antigo)antigo.remove();
 const overlay=document.createElement('div');overlay.id='miAreaEditor';
 overlay.style.cssText='position:fixed;inset:0;background:#0009;z-index:9999;display:flex;align-items:center;justify-content:center;padding:15px';
 overlay.innerHTML='<form id="miAreaForm" style="background:white;border-radius:14px;padding:20px;width:min(100%,420px);box-shadow:0 10px 35px #0004">'+
 '<h3 style="color:#245d39;margin:0 0 15px">'+(nova?'NOVA LAVOURA':'EDITAR LAVOURA')+'</h3>'+
 '<label for="miNomeArea" style="font-weight:800;display:block;margin-bottom:5px">NOME DA LAVOURA</label>'+
 '<input id="miNomeArea" required style="width:100%;margin-bottom:14px" value="'+esc(nova?'':a?.nome||'')+'">'+
 '<label for="miHectaresArea" style="font-weight:800;display:block;margin-bottom:5px">ÁREA (HECTARES)</label>'+
 '<input id="miHectaresArea" required inputmode="decimal" style="width:100%;margin-bottom:18px" value="'+esc(nova?'':String(a?.ha??''))+'">'+
 '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn" id="miCancelarArea">CANCELAR</button><button type="submit" class="btn pri">SALVAR</button></div></form>';
 document.body.appendChild(overlay);
 $('miCancelarArea').onclick=()=>overlay.remove();
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 $('miAreaForm').onsubmit=e=>{
  e.preventDefault();
  const nome=$('miNomeArea').value.trim().toUpperCase(),raw=$('miHectaresArea').value.trim().replace(',','.');
  const ha=Number(raw);
  if(!nome||!Number.isFinite(ha)||ha<=0)return alert('Informe o nome e uma área válida em hectares.');
  const lista=catalogoMI();
  if(nova){const key='nova-'+Date.now().toString(36);lista.push({key,nome,ha});areaSelecionadaMI=key}
  else{const item=lista.find(x=>x.key===areaSelecionadaMI);if(!item)return;item.nome=nome;item.ha=ha;rows().forEach(r=>{if(chaveMI(r)===item.key){r.areaNome=nome;r.areaHa=ha}})}
  db.manejoAreas=lista;save();overlay.remove();atualizarCatalogoMI();listar();
 };
 $('miNomeArea').focus();
}
function relatorioMI(){
 const box=$('miReportView');if(box.classList.contains('on')){box.classList.remove('on');return}
 const all=rows().slice().sort((a,b)=>String(a.dia||'').localeCompare(String(b.dia||'')));
 box.innerHTML='<h3>RELATÓRIO GERAL — MANEJO DAS LAVOURAS</h3><p class="mi-note">'+all.length+' registros • '+$('miTotal').textContent+' de área cadastrada</p>'+
 '<div style="overflow-x:auto"><table><tr><th>DATA</th><th>LAVOURA</th><th>MANEJO</th><th>PRODUTOS / DOSES</th></tr>'+
 all.map(r=>'<tr><td>'+dataBRMI(r.dia)+'</td><td>'+esc(r.areaNome)+' — '+formatoHaMI(r.areaHa)+' HA</td><td>'+esc(r.tipo)+'</td><td>'+esc((r.produtos||[]).map(p=>p.produto+' '+formatoHaMI(p.dose)+' '+p.unidade).join(' / '))+'</td></tr>').join('')+
 '</table></div><div class="actions"><button class="btn pri" id="miExportar">EXPORTAR PDF</button><button class="btn" id="miFecharRel">FECHAR</button></div>';
 box.classList.add('on');$('miExportar').onclick=exportarMI;$('miFecharRel').onclick=()=>box.classList.remove('on');
 box.scrollIntoView({behavior:'smooth',block:'start'});
}
function exportarMI(){
 if(!window.jspdf?.jsPDF)return alert('Gerador PDF indisponível.');
 const doc=new window.jspdf.jsPDF();let y=18;doc.setFontSize(15);doc.text('MANEJO DAS LAVOURAS - AGROPECUARIA PAINEIRA',12,y);y+=9;doc.setFontSize(10);
 for(const r of rows().slice().sort((a,b)=>String(a.dia||'').localeCompare(String(b.dia||'')))){
  const txt=[dataBRMI(r.dia)+'  '+r.areaNome+'  '+formatoHaMI(r.areaHa)+' HA  - '+r.tipo,...(r.produtos||[]).map(p=>p.produto+': '+formatoHaMI(p.dose)+' '+p.unidade+'/ha')];
  for(const linha of txt){for(const trecho of doc.splitTextToSize(String(linha),184)){if(y>280){doc.addPage();y=17}doc.text(trecho,12,y);y+=5}}y+=4;
 }
 doc.save('relatorio-manejo.pdf');
}
// Mostra apenas o cabeçalho do MANEJO enquanto esta aba está aberta.
const abrirManejoOriginalMI=window.abrirManejoIntegrado;
window.abrirManejoIntegrado=function(){abrirManejoOriginalMI();const h=document.querySelector('header.topo-gastos');if(h)h.style.display='none'};
const voltarManejoOriginalMI=window.voltarManejoIntegrado;
window.voltarManejoIntegrado=function(){voltarManejoOriginalMI();const h=document.querySelector('header.topo-gastos');if(h)h.style.display=''};
})();
