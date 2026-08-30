/* ─────────────────────────────────────────────────────────────────────────
   TENANTS — grid, filter and detail panel.

   THE ASTRO PORT. Everything below reads from the JSON in the page. That
   block is deliberately the exact shape of the future `tenants.json`, so
   porting is:

     1. move the JSON out to src/data/tenants.json
     2. let Astro render the grid tiles and the panel markup at build time
        (a `.map()` producing the same HTML that renderGrid() produces here)
     3. delete renderGrid() — the filter, the URL sync and the panel all
        keep working untouched, because they only ever query the DOM

   Nothing here is throwaway except renderGrid().
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  const grid = document.getElementById('tenant-grid');

  /* Hand-edited JSON is easy to break — one trailing comma and the whole
     block fails to parse. Without this the grid just renders empty and the
     only clue is in the console, so say it on the page instead. */
  let data;
  try {
    data = JSON.parse(document.getElementById('tenant-data').textContent);
  } catch (err) {
    grid.innerHTML =
      '<p style="grid-column:1/-1;background:var(--paper);padding:2rem;' +
      'font-size:.8rem;line-height:1.8">' +
      '<strong>The tenant data could not be read.</strong><br>' +
      'Usually a trailing comma, a missing comma, or a straight double quote ' +
      'inside a piece of copy. The browser says:<br><em>' +
      String(err.message).replace(/</g, '&lt;') + '</em></p>';
    console.error('tenant-data JSON is invalid:', err);
    return;
  }

  const panel = document.getElementById('tenant-panel');
  const scrim = document.getElementById('tenant-scrim');
  const filterBar = document.getElementById('tenant-filters');

  const byId = Object.fromEntries(data.map((t) => [t.id, t]));
  let lastFocus = null;

  /* ---- the grid -------------------------------------------------------
     In Astro this is generated at build time and this function disappears.
     The markup it produces is what the .astro template should emit. */
  function renderGrid() {
    grid.innerHTML = data
      .map(
        (t) => `
      <article class="tile" data-category="${t.category}" data-tenant="${t.id}">
        <button class="tile__hit" type="button" aria-haspopup="dialog">
          <span class="tile__frame">
            <img src="${t.art}" alt="" loading="lazy" width="800" height="800">
          </span>
          <span class="tile__cat">${t.category}</span>
          <span class="tile__name">${t.name}</span>
        </button>
      </article>`
      )
      .join('');
  }

  /* ---- filtering, with the state kept in the URL ---------------------- */
  function applyFilter(cat, push) {
    grid.querySelectorAll('.tile').forEach((tile) => {
      tile.hidden = !(cat === 'all' || tile.dataset.category === cat);
    });
    filterBar.querySelectorAll('.filter').forEach((b) => {
      const on = b.dataset.filter === cat;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const shown = grid.querySelectorAll('.tile:not([hidden])').length;
    document.getElementById('tenant-count').textContent =
      shown + (shown === 1 ? ' tenant' : ' tenants');
    if (push) writeUrl({ filter: cat });
  }

  /* One place that owns the query string, so filter and panel can't fight
     over it. On the Astro build the tenant key becomes a real path
     (/tenants/<id>/) and only this function changes. */
  function writeUrl(patch) {
    const u = new URL(window.location.href);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === 'all') u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    });
    history.pushState({ filter: u.searchParams.get('filter'), tenant: u.searchParams.get('tenant') }, '', u);
  }

  /* ---- the detail panel ----------------------------------------------- */
  function fill(t) {
    panel.querySelector('.panel__name').textContent = t.name;
    panel.querySelector('.panel__cat').textContent = t.category;
    panel.querySelector('.panel__unit').textContent = t.unit || '';
    panel.querySelector('.panel__blurb').textContent = t.blurb;

    panel.querySelector('.panel__shots').innerHTML = (t.photos || [])
      .map((src) => `<img src="${src}" alt="" loading="lazy">`)
      .join('');

    const site = panel.querySelector('.panel__site');
    if (t.link) { site.href = t.link; site.hidden = false; }
    else site.hidden = true;

    panel.querySelector('.panel__socials').innerHTML = Object.entries(t.socials || {})
      .map(([k, v]) => `<a href="${v}" rel="noopener">${k}</a>`)
      .join('');

    fillMap(t);
  }

  /* ---- where to find them --------------------------------------------
     One plan image per floor, shared by every tenant on it. The cross is
     a CSS element placed at t.map.x / t.map.y, which are percentages of
     the plan's own box — so the marker holds its position whatever size
     the map renders at, and moving a stall is two numbers in the JSON.

     A tenant with no `map` gets no figure at all. That is the normal
     state for a new trader, not an error. */
  const FLOORS = {
    ground: { src: 'images/map/floor-ground.png', label: 'Ground floor' },
    upper:  { src: 'images/map/floor-upper.png',  label: 'Upstairs' },
  };

  function fillMap(t) {
    const fig = panel.querySelector('.panel__map');
    if (!fig) return;
    const m = t.map;
    const floor = m && FLOORS[m.floor];
    if (!floor || typeof m.x !== 'number' || typeof m.y !== 'number') {
      fig.hidden = true;
      return;
    }
    const plan = fig.querySelector('.panel__map-plan');
    plan.src = floor.src;
    plan.alt = `Plan of the ${floor.label.toLowerCase()}, showing where to find ${t.name}`;
    const cross = fig.querySelector('.map-cross');
    cross.style.left = m.x + '%';
    cross.style.top  = m.y + '%';
    fig.querySelector('.panel__map-cap').textContent = floor.label;
    fig.hidden = false;
  }

  function openPanel(id, push) {
    const t = byId[id];
    if (!t) return;
    lastFocus = document.activeElement;
    fill(t);
    panel.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(() => document.body.classList.add('panel-open'));
    document.body.style.overflow = 'hidden';
    panel.querySelector('.panel__close').focus();
    if (push) writeUrl({ tenant: id });
  }

  function closePanel(fromPop) {
    document.body.classList.remove('panel-open');
    document.body.style.overflow = '';
    setTimeout(() => { panel.hidden = true; scrim.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus();
    if (!fromPop) {
      const u = new URL(window.location.href);
      u.searchParams.delete('tenant');
      history.pushState({ filter: u.searchParams.get('filter'), tenant: null }, '', u);
    }
  }

  /* ---- wiring ---------------------------------------------------------- */
  renderGrid();

  grid.addEventListener('click', (e) => {
    const hit = e.target.closest('.tile__hit');
    if (hit) openPanel(hit.closest('.tile').dataset.tenant, true);
  });

  filterBar.addEventListener('click', (e) => {
    const b = e.target.closest('.filter');
    if (b) applyFilter(b.dataset.filter, true);
  });

  scrim.addEventListener('click', () => closePanel(false));
  panel.addEventListener('click', (e) => {
    if (e.target.closest('.panel__close')) closePanel(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closePanel(false);
  });

  /* Back and forward move through filters and panels, and a pasted link
     opens the page in the right state. */
  function readUrl() {
    const q = new URLSearchParams(window.location.search);
    applyFilter(q.get('filter') || 'all', false);
    const t = q.get('tenant');
    if (t && byId[t]) openPanel(t, false);
    else if (!panel.hidden) closePanel(true);
  }
  window.addEventListener('popstate', readUrl);
  readUrl();
})();