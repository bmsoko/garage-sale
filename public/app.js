(function () {
  const cfg = window.GARAGE_SALE_CONFIG;
  const grid = document.getElementById('items-grid');
  const emptyState = document.getElementById('empty-state');
  const filterBar = document.getElementById('filter-bar');
  const generalWhatsappLinks = document.querySelectorAll('[data-whatsapp-general]');

  const CATEGORY_ICON = {
    'Bicicletas': '🚲',
    'Muebles': '🛋️',
    'Juguetes y otros': '🚗',
  };

  const CONDITION_CLASS = {
    'como nuevo': 'badge-nuevo',
    'muy buen estado': 'badge-muybueno',
    'buen estado': 'badge-bueno',
  };

  function conditionClass(condition) {
    const key = (condition || '').toLowerCase();
    for (const prefix in CONDITION_CLASS) {
      if (key.startsWith(prefix)) return CONDITION_CLASS[prefix];
    }
    return 'badge-normal';
  }

  function formatPrice(price, currency) {
    const n = Number(price);
    const formatted = n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
    return `${currency === 'USD' ? 'USD' : '$'} ${formatted}`;
  }

  function waLink(number, itemName) {
    const digits = (number || cfg.WHATSAPP_NUMBER).replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hola! Te escribo por "${itemName}" que vi en la página de Garage Sale. ¿Todavía está disponible?`
    );
    return `https://wa.me/${digits}?text=${text}`;
  }

  function placeholderMedia(category) {
    const icon = CATEGORY_ICON[category] || '📦';
    return `
      <div class="media-placeholder">
        <span class="media-placeholder-icon">${icon}</span>
        <span class="media-placeholder-tag">Foto próximamente</span>
      </div>
    `;
  }

  function mediaBlock(item) {
    if (item.image_url) {
      return `<img class="item-photo" src="${item.image_url}" alt="${escapeHtml(item.name)}" loading="lazy">`;
    }
    return placeholderMedia(item.category);
  }

  function videoBlock(item) {
    if (!item.video_url) return '';
    return `
      <video class="item-video" controls preload="none" poster="${item.image_url || ''}">
        <source src="${item.video_url}">
        Tu navegador no soporta video.
      </video>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function cardHtml(item, index) {
    const rotate = index % 3 === 0 ? '-1.2deg' : index % 3 === 1 ? '1deg' : '-0.4deg';
    const sold = item.is_sold ? '<div class="sold-stamp">VENDIDO</div>' : '';
    return `
      <article class="item-card ${item.is_sold ? 'is-sold' : ''}" style="--rotate:${rotate}">
        ${sold}
        <div class="item-media">
          ${mediaBlock(item)}
          <div class="price-tag">
            <span class="price-tag-hole"></span>
            ${formatPrice(item.price, item.currency)}
          </div>
        </div>
        <div class="item-body">
          <h3 class="item-name">${escapeHtml(item.name)}</h3>
          <span class="condition-badge ${conditionClass(item.condition)}">✔ ${escapeHtml(item.condition)}</span>
          <p class="item-desc">${escapeHtml(item.description || '')}</p>
          ${videoBlock(item)}
        </div>
        <a class="whatsapp-btn" href="${waLink(item.whatsapp_number, item.name)}" target="_blank" rel="noopener">
          <span class="wa-icon">💬</span> Preguntar por WhatsApp
        </a>
      </article>
    `;
  }

  let allItems = [];
  let activeCategory = 'Todos';

  function render() {
    const items = activeCategory === 'Todos'
      ? allItems
      : allItems.filter((it) => it.category === activeCategory);

    if (!items.length) {
      grid.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;
    grid.innerHTML = items.map(cardHtml).join('');
  }

  function buildFilters(items) {
    const categories = ['Todos', ...new Set(items.map((it) => it.category))];
    filterBar.innerHTML = categories
      .map(
        (cat) => `<button class="filter-pill ${cat === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
          ${cat === 'Todos' ? 'Todos' : `${CATEGORY_ICON[cat] || ''} ${escapeHtml(cat)}`}
        </button>`
      )
      .join('');

    filterBar.querySelectorAll('.filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        filterBar.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });
  }

  async function loadItems() {
    grid.innerHTML = '<p class="loading">Cargando artículos… 📦</p>';
    try {
      const res = await fetch(
        `${cfg.SUPABASE_URL}/rest/v1/items?select=*&order=sort_order.asc`,
        {
          headers: {
            apikey: cfg.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
      allItems = await res.json();
      buildFilters(allItems);
      render();
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<p class="loading">No pudimos cargar los artículos. Probá recargar la página. 🙏</p>`;
    }
  }

  generalWhatsappLinks.forEach((el) => {
    el.href = `https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Te escribo por el Garage Sale 🙂')}`;
  });

  document.getElementById('site-name').textContent = cfg.SITE_NAME;
  document.title = cfg.SITE_NAME;

  loadItems();
})();
