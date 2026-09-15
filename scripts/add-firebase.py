from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='FIREBASE_SYNC_V1'
if marker in s:
    print('Firebase ja integrado')
    raise SystemExit(0)
block=r'''
<style>
#fbLogin{position:fixed;inset:0;z-index:9999;background:#f3f7f4;display:flex;align-items:center;justify-content:center;padding:20px}
#fbLogin .fbbox{width:min(390px,100%);background:#fff;border:1px solid #d9e3dc;border-radius:16px;padding:24px;box-shadow:0 12px 35px #173b2820}
#fbLogin h2{margin:0 0 6px;color:#0f5a3b;text-align:center}#fbLogin p{text-align:center;color:#6b7870;font-size:13px;margin:0 0 18px}
#fbLogin .fberr{color:#b3261e;font-size:12px;min-height:18px;margin-top:8px;text-align:center}
#fbUserBar{position:fixed;right:10px;bottom:10px;z-index:100;background:#fff;border:1px solid #d9e3dc;border-radius:9px;padding:6px 8px;font-size:11px;box-shadow:0 3px 12px #0002;display:none}
#fbUserBar button{margin-left:7px;border:0;background:#0f5a3b;color:#fff;border-radius:6px;padding:5px 8px;font-weight:700;cursor:pointer}
</style>
<div id="fbLogin">
  <div class="fbbox">
    <h2>MANEJO LAVOURA</h2><p>Entre para acessar os dados da Agropecuária Paineira</p>
    <form id="fbLoginForm">
      <label>E-mail</label><input id="fbEmail" type="email" autocomplete="username" required>
      <label>Senha</label><input id="fbSenha" type="password" autocomplete="current-password" required>
      <button class="btn pri" style="width:100%" type="submit">Entrar</button>
      <div id="fbErro" class="fberr"></div>
    </form>
  </div>
</div>
<div id="fbUserBar"><span id="fbStatus">Firebase conectado</span><button type="button" id="fbSair">Sair</button></div>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
<script>
/* FIREBASE_SYNC_V1 */
(function(){
  const firebaseConfig={
    apiKey:'AIzaSyDVFr9KjXJoITEHAssQLQ2wjm8lxhYIZzk',
    authDomain:'manejo-lavoura.firebaseapp.com',
    projectId:'manejo-lavoura',
    storageBucket:'manejo-lavoura.firebasestorage.app',
    messagingSenderId:'1005204918003',
    appId:'1:1005204918003:web:85a768bacdfbfa8548b186',
    measurementId:'G-8XQ0Q0T6MZ'
  };
  firebase.initializeApp(firebaseConfig);
  const auth=firebase.auth();
  const fire=firebase.firestore();
  fire.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  let currentUser=null, remoteReady=false, writing=false;
  const localSave=save;
  const docRef=()=>fire.collection('usuarios').doc(currentUser.uid).collection('dados').doc('manejo-lavoura');
  function gravaLocal(){
    const j=JSON.stringify(db);
    if(window.desktopStore&&window.desktopStore.save)window.desktopStore.save(j);else localStorage.setItem(KEY,j);
  }
  async function gravaNuvem(){
    if(!currentUser||!remoteReady||writing)return;
    writing=true;
    try{await docRef().set({db:JSON.parse(JSON.stringify(db)),atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
    catch(e){console.error('Firebase save',e);}
    finally{writing=false;}
  }
  save=function(){gravaLocal();render();gravaNuvem();};
  async function carregar(user){
    currentUser=user;remoteReady=false;
    const ref=docRef();
    const snap=await ref.get();
    if(snap.exists&&snap.data()&&snap.data().db){
      const remoto=snap.data().db;
      db=Object.assign({lavouras:[],safras:[],produtos:[],compras:[],aplicacoes:[],manejos:[]},remoto);
      db.manejos=db.manejos||[];
      gravaLocal();render();
    }else{
      await ref.set({db:JSON.parse(JSON.stringify(db)),criadoEm:firebase.firestore.FieldValue.serverTimestamp(),atualizadoEm:firebase.firestore.FieldValue.serverTimestamp()});
    }
    remoteReady=true;
    document.getElementById('fbLogin').style.display='none';
    document.getElementById('fbUserBar').style.display='block';
    document.getElementById('fbStatus').textContent='Sincronizado';
    ref.onSnapshot(s=>{
      if(!remoteReady||writing||!s.exists||!s.data().db)return;
      const novo=s.data().db;
      if(JSON.stringify(novo)===JSON.stringify(db))return;
      db=Object.assign({lavouras:[],safras:[],produtos:[],compras:[],aplicacoes:[],manejos:[]},novo);
      db.manejos=db.manejos||[];gravaLocal();render();
    },e=>console.error('Firebase sync',e));
  }
  auth.onAuthStateChanged(async user=>{
    if(!user){currentUser=null;remoteReady=false;document.getElementById('fbLogin').style.display='flex';document.getElementById('fbUserBar').style.display='none';return;}
    try{await carregar(user);}catch(e){document.getElementById('fbErro').textContent='Não foi possível conectar ao banco. Tente novamente.';console.error(e);}
  });
  document.getElementById('fbLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();const erro=document.getElementById('fbErro');erro.textContent='Conectando...';
    try{await auth.signInWithEmailAndPassword(document.getElementById('fbEmail').value.trim(),document.getElementById('fbSenha').value);erro.textContent='';}
    catch(x){erro.textContent='E-mail ou senha incorretos.';}
  });
  document.getElementById('fbSair').onclick=()=>auth.signOut();
})();
</script>
'''
pos=s.lower().rfind('</body>')
if pos<0: raise SystemExit('body final nao encontrado')
s=s[:pos]+block+s[pos:]
p.write_text(s,encoding='utf-8')
print('Firebase integrado ao index.html')
