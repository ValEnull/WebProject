/* addProduct.js – crea prodotto + immagini base64 ------------------ */
document.addEventListener('DOMContentLoaded', () => {

  /* ───────── elementi utili ───────── */
  const form        = document.getElementById('productForm');
  const imagesInput = document.getElementById('images');
  const prevBox     = document.getElementById('imagePreview');
  const successMod  = new bootstrap.Modal(document.getElementById('successModal'));
  const backBtn     = document.getElementById('backToInventory');
  const cancelBtn   = document.getElementById('cancelButton');

  /* ───────── JWT check ───────── */
  const token = localStorage.getItem('token');
  if (!token) return (location.href = '/login.html');
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (payload.exp && payload.exp < Date.now() / 1000) {
    localStorage.removeItem('token');
    return (location.href = '/login.html');
  }

  /* ───────── anteprima immagini (max 5) ───────── */
  imagesInput.addEventListener('change', () => {
    prevBox.innerHTML = '';
    if (imagesInput.files.length > 5) {
      alert('Puoi caricare al massimo 5 immagini');
      imagesInput.value = '';
      return;
    }
    [...imagesInput.files].forEach((file, idx) => {
      if (!file.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = e => {
        const w = document.createElement('div');
        w.className = 'position-relative d-inline-block me-2 mb-2';
        w.innerHTML = `
          <img src="${e.target.result}" style="height:80px;width:80px;object-fit:cover;" class="rounded border">
          <button class="btn btn-sm btn-danger position-absolute top-0 end-0" data-idx="${idx}">&times;</button>`;
        w.querySelector('button').onclick = ev => { removeImage(+ev.target.dataset.idx); w.remove(); };
        prevBox.appendChild(w);
      };
      r.readAsDataURL(file);
    });
  });

  function removeImage(i) {
    const dt = new DataTransfer();
    [...imagesInput.files].forEach((f, idx) => { if (idx !== i) dt.items.add(f); });
    imagesInput.files = dt.files;
  }

  /* ───────── submit ───────── */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    /* 1️⃣  crea prodotto */
    const body = {
      nome_prodotto:  productName.value,
      tipologia_id:   +category.value,
      prezzo:         +price.value,
      descrizione:    description.value,
      quant:          +quantity.value
    };

    let prodotto_id;
    try {
      const res = await fetch('/api/products', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const d = await res.json().catch(()=>({error:'Errore server'}));
        return alert(d.error || 'Errore creazione prodotto');
      }
      ({ prodotto_id } = await res.json());
    } catch (err) {
      console.error(err); return alert('Errore rete (creazione).');
    }

    /* 2️⃣  upload immagini base64 */
    for (const file of [...imagesInput.files]) {
      const base64 = await new Promise((ok,ko)=>{
        const r=new FileReader();
        r.onload=()=>ok(r.result.split(',')[1]);
        r.onerror=ko;
        r.readAsDataURL(file);
      });
      await fetch(`/api/products/${prodotto_id}/images`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ immagine_base64: base64 })
      });
    }

    /* 3️⃣  successo */
    successMod.show();
  });

  backBtn.onclick   = () => location.href = 'inventario.html';
  cancelBtn.onclick = () => location.href = 'inventario.html';
});
