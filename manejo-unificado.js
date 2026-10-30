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

const originalStock=stock;
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
stock=function(id){return originalStock(id)-descontar(id)};
function mostrar(){
 const host=$('areaManejoIntegrado');if(!host)return;
 host.innerHTML='<div class="no-print" style="margin-bottom:10px"><button class="btn" onclick="voltarManejoIntegrado()">← VOLTAR</button></div>'+
 '<h2>MANEJO DAS LAVOURAS</h2><p style="font-size:13px">Registros armazenados no GASTOS. Aplicações novas descontam do estoque; edição e exclusão recalculam o saldo.</p>'+
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
function excluir(id){if(!confirm('Excluir este manejo? O consumo será retirado do estoque.'))return;db.manejosIntegrados=rows().filter(x=>x.id!==id);save();listar()}
async function importar(e){
 e.preventDefault();if(importBusy)return;
 const status=$('miImportStatus');importBusy=true;status.textContent='Conectando ao banco antigo...';
 try{
  const nome='migracao-manejo';let app=firebase.apps.find(x=>x.name===nome);
  if(!app)app=firebase.initializeApp({apiKey:'AIzaSyBREfDuGOG2IwXlzsZaseCSQLGMYTmyZ5A',authDomain:'manejo-celular.firebaseapp.com',projectId:'manejo-celular',appId:'1:88332679453:web:8f8a62078441c02ad7c9f4'},nome);
  const a=app.auth();const user=await a.signInWithEmailAndPassword($('miEmail').value.trim(),$('miSenha').value);
  if(user.user.uid!=='cFbvu67r3DhBptgBLaZfFybtCEf2')throw Error('Esta conta não está autorizada no MANEJO.');
  const fs=app.firestore();const snap=await fs.collection('manejos').get();const areaSnap=await fs.doc('configuracao_areas/areas').get();const areas=areaSnap.exists&&Array.isArray(areaSnap.data().areas)?areaSnap.data().areas:[];
  let novos=0,existentes=0;const ids=new Set(rows().map(x=>x.id));
  snap.forEach(doc=>{
   if(ids.has('antigo-'+doc.id)){const antigo=rows().find(x=>x.id==='antigo-'+doc.id);if(antigo){const area=resolverArea(doc.data(),areas);antigo.areaNome=area.nome;antigo.areaHa=area.ha;}existentes++;return}
   const r=doc.data(),ps=(r.produtos||[]).map(p=>{const m=String(p.dose||'').match(/^\s*([0-9.,]+)\s*(L|KG)?/i);return {produto:p.produto||'',dose:m?num(m[1]):0,unidade:m?.[2]?.toUpperCase()||'L'}}).filter(p=>p.produto&&p.dose>0);
   const area=resolverArea(r,areas);const lav=db.lavouras.find(l=>norm(l.nome)===norm(area.nome))||null;
   rows().push({id:'antigo-'+doc.id,origem:'manejo-celular',dia:r.dia||'',tipo:r.tipo||'Outro',lavouraId:lav?.id||'',areaNome:area.nome,areaHa:area.ha,observacao:r.observacao||'',produtos:ps});
   novos++;
  });
  save();listar();$('miSenha').value='';
  status.textContent='Conferência concluída: '+novos+' novos; '+existentes+' atualizados/conferidos. Nomes e hectares recuperados do MANEJO original.';
  await a.signOut();
 }catch(err){status.textContent='Importação não concluída: '+(err.code||err.message);console.error('Importação',err)}
 finally{importBusy=false}
}
window.abrirManejoIntegrado=function(){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='produtos'));$('menuPrincipalGastos').style.display='none';$('areaCompras').style.display='none';$('areaManejoIntegrado').style.display='block';mostrar();window.scrollTo(0,0)};
window.voltarManejoIntegrado=function(){$('areaManejoIntegrado').style.display='none';$('menuPrincipalGastos').style.display='flex';window.scrollTo(0,0)};
})();
