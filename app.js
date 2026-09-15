const CFG = window.CURSO_CONFIG || {};
let db, auth, currentUser = null, state = {settings:{vipPrice:150,lifePrice:299.99},users:{},lessons:{}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const adminEmail=e=>(CFG.adminEmails||[]).some(x=>String(x).toLowerCase()===String(e||'').toLowerCase());
const isAdmin=u=>!!u&&adminEmail(u.email);
const show=p=>{$$('.page').forEach(x=>x.classList.add('hidden'));$(p).classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)};
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const days24=d=>new Date(d).getTime()+86400000;
function accessLabel(u){if(isAdmin(u))return 'Administrador';if(u.plan==='life')return 'Vitalício';if(u.plan==='vip')return 'VIP';return 'Grátis • 24h'}
function activeUser(u){if(isAdmin(u)||u.plan==='life')return true;if(u.plan==='vip')return u.expiresAt&&Date.now()<new Date(u.expiresAt).getTime();return u.createdAt&&Date.now()<days24(u.createdAt)}
function canSeeLesson(l){if(isAdmin(currentUser)||currentUser.plan==='life')return true;if(currentUser.plan==='vip')return l.access==='free'||l.access==='vip';return l.access==='free'&&activeUser(currentUser)}
function renderPrices(){
 ['vipPrice','vipPrice2'].forEach(id=>{if($('#'+id))$('#'+id).innerHTML=money(state.settings.vipPrice)+'<small>/mês</small>'});
 ['lifePrice','lifePrice2','profileLifePrice'].forEach(id=>{if($('#'+id))$('#'+id).textContent=money(state.settings.lifePrice)});
 if($('#profileVipPrice'))$('#profileVipPrice').innerHTML=money(state.settings.vipPrice)+'<small>/mês</small>';
}
function openAuth(mode='login'){show('#auth');$('#loginBox').classList.toggle('hidden',mode!=='login');$('#registerBox').classList.toggle('hidden',mode!=='register')}
function saveLocalTheme(){localStorage.setItem('cp_dark',document.body.classList.contains('dark')?'1':'0')}
async function loadState(){
 const [settingsSnap,usersSnap,lessonsSnap]=await Promise.all([db.ref('course/settings').once('value'),db.ref('course/users').once('value'),db.ref('course/lessons').once('value')]);
 state.settings={vipPrice:150,lifePrice:299.99,...(settingsSnap.val()||{})};state.users=usersSnap.val()||{};state.lessons=lessonsSnap.val()||{};
 if(!Object.keys(state.lessons).length){const seed={dep:{id:'dep',title:'Depoimento / Apresentação',desc:'Conheça o Curso da Passada e veja como funciona.',access:'free',videoUrl:''}};await db.ref('course/lessons').set(seed);state.lessons=seed}
 renderPrices();
}
async function ensureProfile(fbUser,extra={}){
 const ref=db.ref('course/users/'+fbUser.uid), snap=await ref.once('value');let u=snap.val();
 if(!u){u={id:fbUser.uid,name:extra.name||fbUser.displayName||fbUser.email.split('@')[0],email:fbUser.email.toLowerCase(),phone:extra.phone||'',plan:adminEmail(fbUser.email)?'life':'free',createdAt:new Date().toISOString(),expiresAt:null,subscriptionId:null};await ref.set(u)}
 state.users[fbUser.uid]=u;return u;
}
async function afterLogin(fbUser){currentUser=await ensureProfile(fbUser);await loadState();renderStudent();enterUI()}
function enterUI(){$('#logoutBtn').classList.remove('hidden');show('#student')}
function logout(){auth.signOut();currentUser=null;$('#logoutBtn').classList.add('hidden');show('#landing')}
function renderStudent(){
 if(!currentUser)return;
 $('#welcomeName').textContent=`Olá, ${currentUser.name.split(' ')[0]}!`;$('#accessSummary').textContent=`Acesso: ${accessLabel(currentUser)} • ${isAdmin(currentUser)?'controle administrativo':activeUser(currentUser)?'acesso ativo':'acesso expirado'}`;$('#accessPill').textContent=accessLabel(currentUser);
 const exp=$('#expiryNotice');
 if(currentUser.plan==='free'){const left=Math.max(0,days24(currentUser.createdAt)-Date.now());exp.textContent=left?`Seu acesso gratuito termina em ${Math.ceil(left/3600000)} hora(s). Para continuar, escolha VIP ou Vitalício.`:'Seu acesso gratuito de 24 horas terminou. Escolha um plano para continuar.'}
 else if(currentUser.plan==='vip')exp.textContent=currentUser.expiresAt?`Seu acesso VIP é válido até ${new Date(currentUser.expiresAt).toLocaleString('pt-BR')}.`:'Seu acesso VIP está ativo.';else exp.textContent='Seu acesso Vitalício está ativo permanentemente.';
 $('#adminSide').classList.toggle('hidden',!isAdmin(currentUser));renderLessons();renderProfile();renderAdmin();
}
function renderLessons(){
 const list=$('#lessons');list.innerHTML='';const lessons=Object.values(state.lessons).sort((a,b)=>(a.order||0)-(b.order||0));const visible=lessons.filter(canSeeLesson);$('#lessonCount').textContent=`${visible.length} aula(s) liberada(s)`;
 visible.forEach(l=>{const el=document.createElement('article');el.className='lesson';el.innerHTML=`<div class="thumb">${l.access==='free'?'▶':'🎓'}</div><h4>${l.title}</h4><p>${l.desc||''}</p><button class="primary" data-lesson="${l.id}">${l.videoUrl?'Assistir aula':'Abrir aula'}</button>`;list.appendChild(el)});
 if(!visible.length)list.innerHTML='<div class="panel"><h4>Acesso expirado</h4><p>Escolha VIP ou Vitalício para continuar.</p></div>';
 $$('#lessons [data-lesson]').forEach(b=>b.onclick=()=>openLesson(b.dataset.lesson));
}
function openLesson(id){const l=state.lessons[id];if(!l||!canSeeLesson(l))return toast('Esse conteúdo está bloqueado para seu plano.');if(l.videoUrl)window.open(l.videoUrl,'_blank','noopener');else toast('O ADM ainda não cadastrou o vídeo desta aula.')}
function renderProfile(){
 $('#profileData').innerHTML=[['Nome',currentUser.name],['E-mail',currentUser.email],['Telefone',currentUser.phone||'—'],['Plano',accessLabel(currentUser)],['Cadastro',new Date(currentUser.createdAt).toLocaleString('pt-BR')],['Validade',currentUser.plan==='free'?new Date(days24(currentUser.createdAt)).toLocaleString('pt-BR'):currentUser.plan==='vip'&&currentUser.expiresAt?new Date(currentUser.expiresAt).toLocaleString('pt-BR'):'Permanente']].map(([a,b])=>`<div class="data-item"><small>${a}</small><b>${b}</b></div>`).join('');
 $('#profileAdminShortcut').classList.toggle('hidden',!isAdmin(currentUser));$('#profileAdminBtn').onclick=()=>openAdminTab();
}
function openAdminTab(){$$('.side').forEach(x=>x.classList.remove('active'));$('[data-tab=admin]').classList.add('active');$$('.tab').forEach(x=>x.classList.add('hidden'));$('#tab-admin').classList.remove('hidden')}
function renderAdmin(){if(!isAdmin(currentUser))return;$('#admVip').value=state.settings.vipPrice;$('#admLife').value=state.settings.lifePrice;const us=Object.values(state.users),counts={free:0,vip:0,life:0};us.forEach(u=>counts[u.plan]=(counts[u.plan]||0)+1);$('#adminStats').innerHTML=`<div class="stat"><b>${us.length}</b><span>CADASTROS</span></div><div class="stat"><b>${counts.vip}</b><span>VIP</span></div><div class="stat"><b>${counts.life}</b><span>VITALÍCIOS</span></div>`;renderUsers();renderAdminLessons()}
function renderUsers(){if(!isAdmin(currentUser))return;const q=($('#userSearch')?.value||'').toLowerCase();$('#usersTable').innerHTML=Object.values(state.users).filter(u=>`${u.name} ${u.email}`.toLowerCase().includes(q)).map(u=>`<tr><td>${u.name}</td><td>${u.email}</td><td>${accessLabel(u)}</td><td>${activeUser(u)?'Ativo':'Expirado'}</td><td>${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum usuário encontrado.</td></tr>'}
function renderAdminLessons(){const box=$('#adminLessons');if(!box)return;const arr=Object.values(state.lessons);box.innerHTML=arr.map(l=>`<div class="panel" style="margin-top:10px"><b>${l.title}</b><div class="muted">${l.access.toUpperCase()} • ${l.videoUrl?'vídeo cadastrado':'sem vídeo'}</div><div style="display:flex;gap:8px;margin-top:8px"><button class="secondary" data-edit-lesson="${l.id}">Editar</button><button class="secondary" data-del-lesson="${l.id}">Excluir</button></div></div>`).join('')||'<p class="muted">Nenhuma aula cadastrada.</p>';$$('#adminLessons [data-edit-lesson]').forEach(b=>b.onclick=()=>editLesson(b.dataset.editLesson));$$('#adminLessons [data-del-lesson]').forEach(b=>b.onclick=()=>deleteLesson(b.dataset.delLesson))}
function editLesson(id){const l=state.lessons[id];if(!l)return;$('#lessonId').value=id;$('#lessonTitle').value=l.title;$('#lessonDesc').value=l.desc||'';$('#lessonAccess').value=l.access;$('#lessonVideoUrl').value=l.videoUrl||'';$('#lessonSaveBtn').textContent='Salvar alteração';openAdminTab()}
async function deleteLesson(id){if(!confirm('Excluir esta vídeo-aula?'))return;await db.ref('course/lessons/'+id).remove();delete state.lessons[id];renderAdminLessons();renderLessons();toast('Aula excluída.')}
async function saveLesson(e){e.preventDefault();if(!isAdmin(currentUser))return toast('Acesso negado.');const id=$('#lessonId').value||uid(),lesson={id,title:$('#lessonTitle').value.trim(),desc:$('#lessonDesc').value.trim(),access:$('#lessonAccess').value,videoUrl:$('#lessonVideoUrl').value.trim(),order:Object.keys(state.lessons).length+1};if(!lesson.title)return;await db.ref('course/lessons/'+id).set(lesson);state.lessons[id]=lesson;$('#lessonForm').reset();$('#lessonId').value='';$('#lessonSaveBtn').textContent='Adicionar vídeo-aula';renderAdminLessons();renderLessons();toast('Vídeo-aula salva com sucesso.')}
async function startPayment(plan){const price=plan==='vip'?state.settings.vipPrice:state.settings.lifePrice;if(!CFG.paymentBackendUrl)return toast('Configure a URL do Render em config.js.');try{const r=await fetch(CFG.paymentBackendUrl.replace(/\/$/,'')+'/payments/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,userId:currentUser.id,email:currentUser.email})});const d=await r.json();if(!r.ok)throw new Error(d.message||'Falha');if(d.checkout_url)location.href=d.checkout_url;else toast(d.message||'Não foi possível iniciar o pagamento.')}catch(e){toast(e.message||'Servidor de pagamento indisponível.')}}
async function init(){
 try{firebase.initializeApp(CFG.firebaseConfig);auth=firebase.auth();db=firebase.database();await loadState();
  auth.onAuthStateChanged(async fb=>{if(fb){await afterLogin(fb)}else{currentUser=null;$('#logoutBtn').classList.add('hidden');show('#landing')}});
 }catch(e){console.error(e);toast('Erro ao iniciar Firebase. Verifique a configuração.')}
}
$('#loginForm').onsubmit=async e=>{e.preventDefault();try{await auth.signInWithEmailAndPassword($('#loginEmail').value.trim(),$('#loginPassword').value)}catch(err){toast(err.code==='auth/invalid-credential'?'E-mail ou senha incorretos.':err.message)}};
$('#registerForm').onsubmit=async e=>{e.preventDefault();try{const name=$('#regName').value.trim(),email=$('#regEmail').value.trim().toLowerCase(),phone=$('#regPhone').value.trim(),p=$('#regPassword').value;const cred=await auth.createUserWithEmailAndPassword(email,p);await db.ref('course/users/'+cred.user.uid).set({id:cred.user.uid,name,email,phone,plan:adminEmail(email)?'life':'free',createdAt:new Date().toISOString(),expiresAt:null,subscriptionId:null});toast(adminEmail(email)?'Conta ADM criada.':'Acesso gratuito criado por 24 horas.')}catch(err){toast(err.code==='auth/email-already-in-use'?'Este e-mail já está cadastrado.':err.message)}};
$('#savePrices').onclick=async()=>{if(!isAdmin(currentUser))return toast('Acesso negado.');const vip=Number($('#admVip').value),life=Number($('#admLife').value);if(vip<0||life<0)return toast('Informe valores válidos.');await db.ref('course/settings').update({vipPrice:vip,lifePrice:life});state.settings.vipPrice=vip;state.settings.lifePrice=life;renderPrices();toast('Preços atualizados.')};
$('#userSearch').oninput=renderUsers;$('#lessonForm').onsubmit=saveLesson;$('#lessonCancelBtn').onclick=()=>{$('#lessonForm').reset();$('#lessonId').value='';$('#lessonSaveBtn').textContent='Adicionar vídeo-aula'};$('#backHome').onclick=()=>show('#landing');$('#logoutBtn').onclick=logout;
$$('[data-open]').forEach(b=>b.onclick=()=>openAuth(b.dataset.open));$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');saveLocalTheme()};$$('.side').forEach(b=>b.onclick=()=>{$$('.side').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.tab').forEach(x=>x.classList.add('hidden'));$('#tab-'+b.dataset.tab).classList.remove('hidden')});
$('#vipPayBtn').onclick=()=>startPayment('vip');$('#lifePayBtn').onclick=()=>startPayment('life');$('#profileVipPayBtn').onclick=()=>startPayment('vip');$('#profileLifePayBtn').onclick=()=>startPayment('life');
document.addEventListener('DOMContentLoaded',()=>{$('#year').textContent=new Date().getFullYear();if(localStorage.getItem('cp_dark')==='1')document.body.classList.add('dark');init()});
