(function () {
  const cfg = window.GARAGE_SALE_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const emailInput = document.getElementById('email-input');
  const sendLinkBtn = document.getElementById('send-link-btn');
  const loginMsg = document.getElementById('login-msg');
  const dashboardMsg = document.getElementById('dashboard-msg');
  const whoLabel = document.getElementById('who-label');
  const logoutBtn = document.getElementById('logout-btn');
  const newItemBtn = document.getElementById('new-item-btn');
  const itemsList = document.getElementById('items-list');
  const emptyAdmin = document.getElementById('empty-admin');

  const CATEGORIES = ['Bicicletas', 'Muebles', 'Juguetes y otros'];

  function showMsg(el, text, type) {
    el.innerHTML = text ? `<div class="msg ${type}">${text}</div>` : '';
  }

  // ---------- Auth ----------

  sendLinkBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) return;
    sendLinkBtn.disabled = true;
    showMsg(loginMsg, 'Enviando…', 'ok');
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/admin/' },
    });
    sendLinkBtn.disabled = false;
    if (error) {
      showMsg(loginMsg, `Error: ${escapeHtml(error.message)}`, 'error');
      return;
    }
    showMsg(loginMsg, `Listo, revisá ${escapeHtml(email)} y hacé clic en el link. Podés cerrar esta pestaña.`, 'ok');
  });

  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    location.reload();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    render(session);
  });

  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    render(session);
  }

  function render(session) {
    if (session && session.user) {
      loginView.style.display = 'none';
      dashboardView.style.display = 'block';
      logoutBtn.style.display = 'inline-block';
      whoLabel.textContent = session.user.email;
      loadItems();
    } else {
      loginView.style.display = 'block';
      dashboardView.style.display = 'none';
      logoutBtn.style.display = 'none';
      whoLabel.textContent = '';
    }
  }

  // ---------- Idle auto-logout (20 min) ----------

  let idleTimer;
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      await sb.auth.signOut();
      location.reload();
    }, 20 * 60 * 1000);
  }
  ['mousemove', 'keydown', 'click', 'scroll'].forEach((evt) =>
    document.addEventListener(evt, resetIdleTimer, { passive: true })
  );
  resetIdleTimer();

  // ---------- Dashboard ----------

  let items = [];

  async function loadItems() {
    itemsList.innerHTML = '<p>Cargando…</p>';
    const { data, error } = await sb.from('items').select('*').order('sort_order');
    if (error) {
      showMsg(dashboardMsg, `Error cargando artículos: ${escapeHtml(error.message)}`, 'error');
      itemsList.innerHTML = '';
      return;
    }
    items = data;
    renderItems();
  }

  function renderItems() {
    if (!items.length) {
      itemsList.innerHTML = '';
      emptyAdmin.hidden = false;
      return;
    }
    emptyAdmin.hidden = true;
    itemsList.innerHTML = items.map(rowHtml).join('');
    items.forEach((item) => wireRow(item.id));
  }

  function rowHtml(item) {
    const catOptions = CATEGORIES.map(
      (c) => `<option value="${escapeHtml(c)}" ${c === item.category ? 'selected' : ''}>${escapeHtml(c)}</option>`
    ).join('');
    const thumb = item.image_url
      ? `<img class="thumb" src="${item.image_url}" alt="">`
      : `<div class="thumb-placeholder">📦</div>`;
    return `
      <div class="item-row" data-id="${item.id}">
        <div class="thumb-col">
          ${thumb}
          <input type="file" accept="image/*,video/*" data-role="file">
        </div>
        <div class="fields">
          <div class="span-2">
            <label>Nombre</label>
            <input type="text" data-field="name" value="${escapeAttr(item.name)}">
          </div>
          <div>
            <label>Categoría</label>
            <select data-field="category">${catOptions}</select>
          </div>
          <div>
            <label>Precio (ARS)</label>
            <input type="number" data-field="price" value="${item.price}">
          </div>
          <div>
            <label>Estado</label>
            <input type="text" data-field="condition" value="${escapeAttr(item.condition)}">
          </div>
          <div>
            <label>Orden</label>
            <input type="number" data-field="sort_order" value="${item.sort_order}">
          </div>
          <div class="span-2">
            <label>Descripción</label>
            <textarea data-field="description" rows="2">${escapeHtml(item.description || '')}</textarea>
          </div>
          <div class="span-2">
            <label>URL de video (opcional)</label>
            <input type="text" data-field="video_url" value="${escapeAttr(item.video_url || '')}">
          </div>
          <div class="span-2 row-actions">
            <label class="sold-checkbox">
              <input type="checkbox" data-field="is_sold" ${item.is_sold ? 'checked' : ''}>
              Vendido
            </label>
            <span class="row-status" data-role="status"></span>
            <button class="btn-danger" data-role="delete">Eliminar</button>
            <button class="btn-primary" data-role="save">Guardar</button>
          </div>
        </div>
      </div>
    `;
  }

  function wireRow(id) {
    const row = itemsList.querySelector(`.item-row[data-id="${id}"]`);
    if (!row) return;
    const status = row.querySelector('[data-role="status"]');

    row.querySelector('[data-role="save"]').addEventListener('click', async () => {
      status.textContent = 'Guardando…';
      const payload = {
        name: row.querySelector('[data-field="name"]').value,
        category: row.querySelector('[data-field="category"]').value,
        price: Number(row.querySelector('[data-field="price"]').value) || 0,
        condition: row.querySelector('[data-field="condition"]').value,
        sort_order: Number(row.querySelector('[data-field="sort_order"]').value) || 0,
        description: row.querySelector('[data-field="description"]').value,
        video_url: row.querySelector('[data-field="video_url"]').value || null,
        is_sold: row.querySelector('[data-field="is_sold"]').checked,
      };
      const { error } = await sb.from('items').update(payload).eq('id', id);
      status.textContent = error ? `Error: ${friendlyError(error)}` : '✔ Guardado';
      if (!error) setTimeout(() => (status.textContent = ''), 2000);
    });

    row.querySelector('[data-role="delete"]').addEventListener('click', async () => {
      if (!confirm('¿Eliminar este artículo? No se puede deshacer.')) return;
      const { error } = await sb.from('items').delete().eq('id', id);
      if (error) {
        status.textContent = `Error: ${friendlyError(error)}`;
        return;
      }
      items = items.filter((it) => it.id !== id);
      renderItems();
    });

    row.querySelector('[data-role="file"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      status.textContent = 'Subiendo…';
      const ext = file.name.split('.').pop();
      const path = `${id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await sb.storage
        .from('garage-sale-media')
        .upload(path, file, { upsert: true });
      if (uploadError) {
        status.textContent = `Error subiendo: ${friendlyError(uploadError)}`;
        return;
      }
      const { data: pub } = sb.storage.from('garage-sale-media').getPublicUrl(path);
      const isVideo = file.type.startsWith('video/');
      const field = isVideo ? 'video_url' : 'image_url';
      const { error: updateError } = await sb.from('items').update({ [field]: pub.publicUrl }).eq('id', id);
      if (updateError) {
        status.textContent = `Error guardando URL: ${friendlyError(updateError)}`;
        return;
      }
      status.textContent = '✔ Archivo subido';
      await loadItems();
    });
  }

  newItemBtn.addEventListener('click', async () => {
    const maxOrder = items.reduce((max, it) => Math.max(max, it.sort_order || 0), 0);
    const { error } = await sb.from('items').insert({
      name: 'Nuevo artículo',
      category: 'Muebles',
      description: '',
      condition: 'Buen estado',
      price: 0,
      sort_order: maxOrder + 1,
    });
    if (error) {
      showMsg(dashboardMsg, `Error creando artículo: ${friendlyError(error)}`, 'error');
      return;
    }
    await loadItems();
  });

  function friendlyError(error) {
    if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
      return 'no tenés permisos de administrador para esta acción.';
    }
    return escapeHtml(error.message || 'error desconocido');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  init();
})();
