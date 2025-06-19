/* ============================================================================
   USER AREA – script unico (userArea.js)
   Aggiorna dinamicamente:          
     • dati personali (username, nome, cognome)
     • email                         
     • password                     
     • eliminazione account         
   ========================================================================= */

/**************** CONFIG ****************/ 
const API_BASE = "/api/users";     // modificare se la tua route è diversa

/**************** UTILS ****************/ 
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const toast = (msg, ok = true) => {
  const el = document.createElement("div");
  el.className = `toast text-bg-${ok ? "success" : "danger"} show position-fixed bottom-0 end-0 m-3`;
  el.role = "alert";
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),4000);
};

const parseJwt = (t) => {
  try { return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return null; }
};

const authHeaders = () => {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const api = async (url, opts={}) => {
  const res = await fetch(url, { ...opts, headers: { "Content-Type":"application/json", ...authHeaders(), ...(opts.headers||{}) } });
  if (!res.ok) throw new Error(await res.text()||res.status);
  return res.status===204?{}:res.json();
};

/**************** RENDER ****************/ 
function renderStatic(u){
  // username in header e nella card
  ["#usernameHeader","#usernameDisplay"].forEach(sel=> $(sel).textContent = u.nome_utente);
  $("#fullNameDisplay").textContent = `${u.nome} ${u.cognome}`.trim();
  $("#emailDisplay").textContent    = u.email;
}
function renderInputs(u){
  $("#currentUsername").value = u.nome_utente;
  $("#fullName").value        = `${u.nome} ${u.cognome}`.trim();
  $("#currentEmail").value    = u.email;
}
async function loadUser(id){
  const u = await api(`${API_BASE}/${id}`);
  renderStatic(u); renderInputs(u);
  return u;
}

/**************** MAIN ****************/ 
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const payload = parseJwt(token||"");
  if(!payload || payload.exp*1000<Date.now()) return location.replace("/login.html");
  const uid = payload.id;
  let user;
  try{ user = await loadUser(uid); }catch{ toast("Utente non trovato",false); return; }

  /*---- MODIFICA INFO PERSONALI ----*/
  $("#infoModal .btn.btn-orange")?.addEventListener("click",async()=>{
    const [nome,cognome=""] = $("#fullName").value.trim().split(" ");
    const nuovoUsername = $("#newUsername").value.trim() || $("#currentUsername").value.trim();
    try{
      user = await api(`${API_BASE}/${uid}`,{method:"PATCH",body:JSON.stringify({ nome_utente:nuovoUsername,nome,cognome })});
      renderStatic(user); renderInputs(user);
      toast("Informazioni aggiornate");
      bootstrap.Modal.getInstance($("#infoModal")).hide();
    }catch(e){ toast(e.message||"Errore aggiornamento",false); }
  });

  /*---- MODIFICA EMAIL ----*/
  $("#emailModal .btn.btn-orange")?.addEventListener("click",async()=>{
    const newE = $("#newEmail").value.trim();
    const confE= $("#confirmEmail").value.trim();
    if(newE!==confE) return toast("Le email non coincidono",false);
    try{
      user = await api(`${API_BASE}/${uid}/email`,{method:"PATCH",body:JSON.stringify({email:newE})});
      renderStatic(user); renderInputs(user);
      toast("Email aggiornata");
      $("#newEmail").value=$("#confirmEmail").value="";
      bootstrap.Modal.getInstance($("#emailModal")).hide();
    }catch(e){ toast(e.message||"Errore email",false); }
  });

  /*---- CAMBIO PASSWORD ----*/
  $("#passwordForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const oldP=$("#currentPassword").value; const newP=$("#newPassword").value; const confP=$("#confirmPassword").value;
    if(newP!==confP) return toast("Le password non coincidono",false);
    try{
      await api(`${API_BASE}/${uid}/password`,{method:"PATCH",body:JSON.stringify({oldPassword:oldP,newPassword:newP})});
      toast("Password aggiornata");
      ["#currentPassword","#newPassword","#confirmPassword"].forEach(s=>$(s).value="");
    }catch(e){ toast(e.message||"Errore password",false); }
  });

  /*---- ELIMINA ACCOUNT ----*/
  $("#deleteAccountForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    if($("#confirmDelete").value.trim()!=="ELIMINA ACCOUNT") return toast("Conferma errata",false);
    try{
      await api(`${API_BASE}/${uid}`,{method:"DELETE",body:JSON.stringify({password:$("#currentPasswordDelete").value})});
      localStorage.removeItem("token");
      alert("Account eliminato");
      location.replace("/index.html");
    }catch(e){ toast(e.message||"Errore eliminazione",false); }
  });

  /*---- LOGOUT ----*/
  $("#logout-btn")?.addEventListener("click",()=>{ localStorage.removeItem("token"); location.replace("/index.html"); });
});
