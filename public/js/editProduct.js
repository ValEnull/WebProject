/* editProduct.js – modifica prodotto + gestione eliminazione condizionata ---------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  /* ───── elementi base ───── */
  const form        = document.getElementById('productForm');
  const imagesInput = document.getElementById('images');
  const prevBox     = document.getElementById('imagePreview');
  const successMod  = new bootstrap.Modal(document.getElementById('successModal'));
  const backBtn     = document.getElementById('backToInventory');
  const cancelBtn   = document.getElementById('cancelButton');
  const deleteBtn   = document.getElementById('deleteButton');

  /* ───── JWT ───── */
  const token = localStorage.getItem('token');
  if (!token) return (location.href = '/login.html');
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('expired');
  } catch { localStorage.removeItem('token'); return (location.href = '/login.html'); }

  /* ───── id prodotto ───── */
  const productId = new URLSearchParams(location.search).get('id');
  if (!productId) return (location.href = 'inventario.html');

  /* ───── vari appoggio ───── */
  const existingImages = new Map();

  /* ───── load prodotto ───── */
  (async function loadProduct () {
    try {
      const p = await (await fetch(`/api/products/${productId}`)).json();
      productName.value = p.nome_prodotto;
      price.value       = p.prezzo;
      quantity.value    = p.quant;
      description.value = p.descrizione;
      category.value    = p.tipologia_id;
      // immagini esistenti
      prevBox.innerHTML = '';
      (p.immagini || []).forEach(img => {
        const w = document.createElement('div');
        w.className = 'position-relative d-inline-block me-2 mb-2';
        w.innerHTML = `<img src="data:image/*;base64,${img.immagine_base64}" style="height:80px;width:80px;object-fit:cover;" class="rounded border">
                       <button class="btn btn-sm btn-danger position-absolute top-0 end-0" data-imgid="${img.immagine_id}">&times;</button>`;
        w.querySelector('button').onclick = ev => deleteExistingImage(ev.target.dataset.imgid);
        prevBox.appendChild(w);
        existingImages.set(img.immagine_id, w);
      });
    } catch (err) {
      console.error(err); alert('Impossibile caricare il prodotto'); location.href = 'inventario.html';
    }
  })();

  /* ───── rimozione immagine salvata ───── */
  async function deleteExistingImage (imgId) {
    if (!confirm('Eliminare definitivamente questa immagine?')) return;
    try {
      const res = await fetch(`/api/products/images/${imgId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) throw new Error('delete img');
      existingImages.get(+imgId)?.remove(); existingImages.delete(+imgId);
    } catch { alert('Errore cancellazione immagine'); }
  }

  /* ───── anteprima nuove immagini ───── */
  imagesInput.addEventListener('change', () => {
    [...prevBox.querySelectorAll('[data-new]')].forEach(e => e.remove());
    if (imagesInput.files.length > 5) { alert('Max 5 immagini'); imagesInput.value = ''; return; }

    [...imagesInput.files].forEach((file, idx) => {
      if (!file.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = e => {
        const div = document.createElement('div'); div.setAttribute('data-new',''); div.className = 'position-relative d-inline-block me-2 mb-2';
        div.innerHTML = `<img src="${e.target.result}" style="height:80px;width:80px;object-fit:cover;" class="rounded border">
                         <button class="btn btn-sm btn-danger position-absolute top-0 end-0" data-idx="${idx}">&times;</button>`;
        div.querySelector('button').onclick = ev => { removeImage(+ev.target.dataset.idx); div.remove(); };
        prevBox.appendChild(div);
      };
      r.readAsDataURL(file);
    });
  });

  function removeImage(i){
    const dt = new DataTransfer();
    [...imagesInput.files].forEach((f, idx)=>{ if(idx!==i) dt.items.add(f); });
    imagesInput.files = dt.files;
  }

  /* ───── submit modifica ───── */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      nome_prodotto: productName.value,
      tipologia_id: +category.value,
      prezzo:       +price.value,
      descrizione:  description.value,
      quant:        +quantity.value
    };
    try {
      const res = await fetch(`/api/products/${productId}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
    } catch { return alert('Errore salvataggio'); }

    for (const file of [...imagesInput.files]) {
      const base64 = await new Promise((ok,ko)=>{ const fr=new FileReader(); fr.onload=()=>ok(fr.result.split(',')[1]); fr.onerror=ko; fr.readAsDataURL(file); });
      await fetch(`/api/products/${productId}/images`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ immagine_base64: base64 }) });
    }
    successMod.show();
  });

  /* ───── eliminazione condizionata ───── */
  deleteBtn?.addEventListener('click', async () => {
    if (!confirm('Eliminare il prodotto? Se è presente in ordini esistenti verrà semplicemente impostato a stock 0.')) return;
    try {
      // 1. Prova una DELETE diretta
      const res = await fetch(`/api/products/${productId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
      if (res.ok || res.status === 204) {
        alert('Prodotto eliminato'); location.href='inventario.html'; return;
      }
      if (res.status === 409) {  // FK violation → prodotto referenziato negli ordini
        const fix = await fetch(`/api/products/${productId}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ quant: 0 }) });
        if (fix.ok) { alert('Il prodotto è presente in ordini: stock impostato a 0 e nascosto dallo shop.'); location.href='inventario.html'; return; }
      }
      const d = await res.json().catch(()=>({message:'Errore'}));
      alert(d.message || 'Impossibile eliminare/aggiornare il prodotto');
    } catch(err){ console.error(err); alert('Errore rete'); }
  });

  /* ───── navigazione ───── */
  backBtn.onclick   = () => location.href='inventario.html';
  cancelBtn.onclick = () => location.href='inventario.html';
});
