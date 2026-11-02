/* =====================================================
   FURLESTIAL SHOP — ONLINE CATALOG SCRIPT
   Zero dependencies • Deep-Linking (#F0012) • Fast Search
   ===================================================== */

(() => {
  'use strict';

  let allProducts = [];
  let currentFiltered = [];
  let currentProduct = null;
  let currentImgIndex = 0;
  let contactUrl = 'https://m.me/666255349897305';

  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => [...el.querySelectorAll(sel)];

  // ─────────────────────────────────────────────────────
  //  INIT & LOAD
  // ─────────────────────────────────────────────────────
  async function init() {
    initTheme();
    initBackToTop();
    bindEvents();

    try {
      const res = await fetch('products.json?v=' + Date.now());
      if (!res.ok) throw new Error('Cannot load products.json');
      const data = await res.json();
      allProducts = Array.isArray(data) ? data : (data.products || []);

      // Auto-detect contact from products if available
      const pWithContact = allProducts.find(p => p.contact);
      if (pWithContact && pWithContact.contact) {
        let c = pWithContact.contact.trim();
        contactUrl = (c.startsWith('http://') || c.startsWith('https://')) ? c : ('https://' + c);
      }
      const headerBtn = qs('#header-contact-btn');
      if (headerBtn) {
        headerBtn.href = contactUrl;
        headerBtn.onclick = () => {
          showToast('💬 กำลังเปิดกล่องข้อความ Facebook Messenger ร้าน Furlestial Shop...');
        };
      }
      const footerBtn = qs('#footer-contact-btn');
      if (footerBtn) footerBtn.href = contactUrl;
    } catch (err) {
      console.warn('[Catalog] Error fetching products.json:', err);
      allProducts = [];
    }

    setupCategoryFilterPills();
    updateHeroStats();
    applyFiltersAndRender();
    handleInitialDeepLink();
  }

  const KNOWN_CAT_LABELS = {
    F: '🐾 ฟูร์สูท & คอสเพลย์',
    C: '👕 เสื้อผ้า & แฟชั่น',
    A: '💍 เครื่องประดับ & พวงกุญแจ',
    B: '🎒 กระเป๋า & ซองใส่ของ',
    D: '🧸 ตุ๊กตา & หมอน',
    T: '🎮 ฟิกเกอร์ & ของสะสม',
    M: '🖱️ แผ่นรองเมาส์เกมมิ่ง',
    P: '🎨 โปสเตอร์ & แสตนดี้',
    W: '🧦 ถุงเท้า & ปลอกแขน',
    S: '🔞 คอลเลกชันพิเศษ 18+',
    L: '🐉 สายรัดหนัง & แฟนตาซี',
    E: '⭐ สินค้าลิมิเต็ด',
    X: '📦 เบ็ดเตล็ดทั่วไป',
    K: '☕ แก้วน้ำ & ของใช้',
    G: '🎲 การ์ด & บอร์ดเกม',
    Q: '📱 เคสมือถือ & อุปกรณ์',
    H: '🧢 หมวก & ที่คาดผม'
  };

  function setupCategoryFilterPills() {
    const container = qs('#category-chips');
    if (!container) return;

    const existingPills = new Set(Array.from(container.querySelectorAll('.filter-pill')).map(b => (b.dataset.cat || '').toUpperCase()));

    const usedCategories = new Set();
    allProducts.forEach(p => {
      const cleanId = String(p.id || '').trim();
      const match = cleanId.match(/^([A-Za-z]+)/);
      const pref = (p.category || (match ? match[1] : cleanId.charAt(0)) || '').toUpperCase();
      if (pref) usedCategories.add(pref);
    });

    usedCategories.forEach(pref => {
      if (!existingPills.has(pref)) {
        const btn = document.createElement('button');
        btn.className = 'filter-pill';
        btn.dataset.cat = pref;
        btn.textContent = KNOWN_CAT_LABELS[pref] || `🏷️ หมวด ${pref}`;
        container.appendChild(btn);
      }
    });

    container.querySelectorAll('.filter-pill').forEach(btn => {
      btn.onclick = () => {
        container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFiltersAndRender();
      };
    });
  }

  // ─────────────────────────────────────────────────────
  //  THEME (APPLE iOS LIQUID GLASS: DARK & LIGHT)
  // ─────────────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem('furlestial_theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialTheme = saved ? saved : (prefersLight ? 'light' : 'dark');

    applyTheme(initialTheme);

    const toggleBtn = qs('#theme-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('furlestial_theme', next);
      showToast(next === 'light' ? '☀️ สลับเป็นโหมดสว่าง (Light Glass) แล้ว' : '🌙 สลับเป็นโหมดมืด (Dark Cosmic) แล้ว');
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
        if (!localStorage.getItem('furlestial_theme')) {
          applyTheme(e.matches ? 'light' : 'dark');
        }
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // ─────────────────────────────────────────────────────
  //  BACK TO TOP BUTTON
  // ─────────────────────────────────────────────────────
  function initBackToTop() {
    const btt = qs('#back-to-top-btn');
    if (!btt) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btt.classList.add('show');
      } else {
        btt.classList.remove('show');
      }
    }, { passive: true });

    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─────────────────────────────────────────────────────
  //  DEEP LINKING (#F0012)
  // ─────────────────────────────────────────────────────
  function handleInitialDeepLink() {
    const hash = window.location.hash.replace('#', '').trim();
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('p') || hash;

    if (targetId) {
      const found = allProducts.find(p => p.id && p.id.toUpperCase() === targetId.toUpperCase());
      if (found) {
        setTimeout(() => openProductModal(found), 150);
      }
    }
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').trim();
    if (!hash && currentProduct) {
      closeProductModal(false);
    } else if (hash && (!currentProduct || currentProduct.id !== hash)) {
      const found = allProducts.find(p => p.id && p.id.toUpperCase() === hash.toUpperCase());
      if (found) openProductModal(found, false);
    }
  });

  // ─────────────────────────────────────────────────────
  //  HERO STATS
  // ─────────────────────────────────────────────────────
  function updateHeroStats() {
    const statTotal = qs('#stat-total');
    const statPreorder = qs('#stat-preorder');
    if (statTotal) statTotal.textContent = allProducts.length;
    if (statPreorder) {
      const activeCount = allProducts.filter(p => p.status === 'preorder' || p.status === 'arrived').length;
      statPreorder.textContent = activeCount;
    }
  }

  // ─────────────────────────────────────────────────────
  //  FILTERING & SORTING
  // ─────────────────────────────────────────────────────
  function applyFiltersAndRender() {
    const searchVal = (qs('#search-input')?.value || '').trim().toLowerCase();
    const activeCat = (qs('.filter-pill.active, .cat-chip.active')?.dataset.cat || '').trim();
    const statusVal = qs('#status-filter')?.value || '';
    const sortVal = qs('#sort-select')?.value || 'newest';

    currentFiltered = allProducts.filter(p => {
      // Search
      if (searchVal) {
        const idMatch = (p.id || '').toLowerCase().includes(searchVal);
        const nameMatch = (p.name || '').toLowerCase().includes(searchVal);
        const nameCnMatch = (p.nameCn || '').toLowerCase().includes(searchVal);
        const descMatch = (p.desc || '').toLowerCase().includes(searchVal);
        if (!idMatch && !nameMatch && !nameCnMatch && !descMatch) return false;
      }

      // Category
      if (activeCat) {
        const cat = (p.category || (p.id || '').charAt(0)).toUpperCase();
        if (cat !== activeCat.toUpperCase()) return false;
      }

      // Status
      if (statusVal && p.status !== statusVal) {
        return false;
      }

      return true;
    });

    // Sorting
    const codeCmp = (a, b) => String(a.id || '').localeCompare(String(b.id || ''), 'en', { numeric: true, sensitivity: 'base' });
    const ts = v => { const t = Date.parse(v || ''); return isNaN(t) ? 0 : t; };
    const getMinPrice = p => Number(p.minSellPrice || p.sellPrice || 0);

    const sorters = {
      newest: (a, b) => ts(b.createdAt) - ts(a.createdAt) || codeCmp(b, a),
      'price-asc': (a, b) => getMinPrice(a) - getMinPrice(b),
      'price-desc': (a, b) => getMinPrice(b) - getMinPrice(a),
      'code-asc': codeCmp,
      'name-asc': (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'th', { sensitivity: 'base' }),
    };

    currentFiltered.sort(sorters[sortVal] || sorters.newest);
    renderGrid(currentFiltered);
  }

  // ─────────────────────────────────────────────────────
  //  RENDER GRID
  // ─────────────────────────────────────────────────────
  function renderGrid(items) {
    const grid = qs('#products-grid');
    const emptyState = qs('#empty-state');
    const countEl = qs('#results-count');

    if (countEl) countEl.textContent = `แสดง ${items.length} รายการ`;

    if (items.length === 0) {
      grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = items.map(p => {
      const minP = Number(p.minSellPrice || p.sellPrice || 0);
      const maxP = Number(p.maxSellPrice || p.sellPrice || 0);
      const hasMulti = maxP > minP && minP > 0;
      const priceText = hasMulti
        ? `฿${minP.toLocaleString('th-TH')} – ฿${maxP.toLocaleString('th-TH')}`
        : `฿${minP.toLocaleString('th-TH')}`;

      const gallery = p.galleryImages || (p.imageUrl ? [p.imageUrl] : []);
      const coverImg = gallery[0] || p.imageUrl || 'furlestial.ico';
      const statusClass = `status-${p.status || 'preorder'}`;
      const statusLabels = {
        preorder: 'PRE-ORDER',
        ordered: 'IN TRANSIT',
        arrived: 'IN STOCK',
        closed: 'CLOSED',
      };

      return `
        <article class="product-card" data-id="${esc(p.id)}" role="button" tabindex="0" onclick="">
          <div class="card-media">
            <img src="${esc(coverImg)}" alt="${esc(p.name)}" class="card-img" loading="lazy" onerror="this.src='furlestial.ico'" />
            <span class="card-badge-code">${esc(p.id)}</span>
            <span class="card-badge-status ${statusClass}">${statusLabels[p.status] || 'PRE-ORDER'}</span>
            ${gallery.length > 1 ? `<span class="card-gallery-pill">${gallery.length} รูป</span>` : ''}
          </div>
          <div class="card-body">
            <h3 class="card-title">${esc(p.name)}</h3>
            <div class="card-shop">${esc(p.nameCn || '[Furlestial Licensed Studio]')}</div>
            <div class="card-price-row">
              <span class="card-price-main">${priceText}</span>
              ${hasMulti ? '<span class="card-price-multi">ตามตัวเลือก</span>' : ''}
              ${p.origPrice > minP ? `<span class="card-price-orig">฿${p.origPrice.toLocaleString('th-TH')}</span>` : ''}
            </div>
            <div class="card-ship-badge">✓ รวมส่งฟรีถึงหน้าบ้านคุณ (0 บาท)</div>
            <button class="card-cta-btn" type="button" aria-label="ดูรายละเอียด ${esc(p.name)}">ดูตารางไซส์ & รายละเอียด →</button>
          </div>
        </article>
      `;
    }).join('');

    // Bind card clicks directly and defensively for all platforms
    qsa('.product-card', grid).forEach(card => {
      const handleOpen = (e) => {
        if (e) e.stopPropagation();
        const id = card.dataset.id;
        const p = allProducts.find(item => item.id === id);
        if (p) openProductModal(p);
      };
      card.addEventListener('click', handleOpen);
      // Keyboard enter/space support for accessibility
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────
  //  MODAL LOGIC
  // ─────────────────────────────────────────────────────
  function openProductModal(p, updateHash = true) {
    currentProduct = p;
    currentImgIndex = 0;

    if (updateHash) {
      window.location.hash = '#' + p.id;
    }

    const modal = qs('#product-modal');
    const backdrop = qs('#product-modal-backdrop');

    // Basic Info
    qs('#modal-code').textContent = p.id;
    qs('#modal-title').textContent = p.name;
    qs('#modal-shop').textContent = p.nameCn || '[Furlestial Shop]';

    // Status
    const statusEl = qs('#modal-status');
    const statusLabels = {
      preorder: 'PRE-ORDER',
      ordered: 'IN TRANSIT',
      arrived: 'IN STOCK',
      closed: 'CLOSED'
    };
    statusEl.textContent = statusLabels[p.status] || 'PRE-ORDER';
    statusEl.className = `tag-status status-${p.status || 'preorder'}`;

    // Pricing
    const minP = Number(p.minSellPrice || p.sellPrice || 0);
    const maxP = Number(p.maxSellPrice || p.sellPrice || 0);
    const hasMulti = maxP > minP && minP > 0;
    qs('#modal-price-thb').textContent = hasMulti
      ? `฿${minP.toLocaleString('th-TH')} – ฿${maxP.toLocaleString('th-TH')}`
      : `฿${minP.toLocaleString('th-TH')}`;

    const origEl = qs('#modal-price-orig');
    if (p.origPrice && p.origPrice > minP) {
      origEl.textContent = `฿${p.origPrice.toLocaleString('th-TH')}`;
      origEl.style.display = 'inline';
    } else {
      origEl.style.display = 'none';
    }

    // Media & Thumbnails
    const gallery = (p.galleryImages && p.galleryImages.length > 0) ? p.galleryImages : [p.imageUrl || 'furlestial.ico'];
    renderModalGallery(gallery);

    // Variants
    const vSection = qs('#modal-variants-section');
    const vWrap = qs('#modal-variants-chips');
    let selectedVariantName = '';
    if (p.variants && p.variants.length > 0) {
      vSection.style.display = 'flex';
      vWrap.innerHTML = p.variants.map((v, i) => {
        const vPrice = Number(v.sellPrice || p.sellPrice || 0);
        return `
          <div class="v-pill ${i === 0 ? 'selected' : ''}" data-index="${i}">
            <span>${esc(v.emoji || '✦')}</span>
            <span>${esc(v.name)}</span>
            ${vPrice > 0 ? `<span class="v-pill-price">฿${vPrice.toLocaleString('th-TH')}</span>` : ''}
          </div>
        `;
      }).join('');

      selectedVariantName = p.variants[0].name;

      qsa('.v-pill', vWrap).forEach((pill, idx) => {
        pill.addEventListener('click', () => {
          qsa('.v-pill', vWrap).forEach(el => el.classList.remove('selected'));
          pill.classList.add('selected');
          const chosen = p.variants[idx];
          if (chosen) {
            selectedVariantName = chosen.name;
            const chosenPrice = Number(chosen.sellPrice || p.sellPrice || 0);
            if (chosenPrice > 0) {
              qs('#modal-price-thb').textContent = `฿${chosenPrice.toLocaleString('th-TH')}`;
            }
          }
        });
      });
    } else {
      vSection.style.display = 'none';
    }

    // Sizes Table
    const sSection = qs('#modal-sizes-section');
    const sTbody = qs('#modal-size-tbody');
    if (p.sizes && p.sizes.length > 0) {
      sSection.style.display = 'flex';
      sTbody.innerHTML = p.sizes.map(s => {
        const sPrice = Number(s.sellPrice || 0);
        return `
          <tr>
            <td class="spec-size-key">${esc(s.name)}</td>
            <td>${esc(s.measurement || 'สัดส่วนมาตรฐานตามโรงงาน')}</td>
            <td>${sPrice > 0 ? `฿${sPrice.toLocaleString('th-TH')}` : '<span style="color:var(--accent-green); font-weight:600;">เปิดรับพรี</span>'}</td>
          </tr>
        `;
      }).join('');
    } else {
      sSection.style.display = 'none';
    }

    // Description
    qs('#modal-desc').textContent = p.desc || 'สินค้าพรีออเดอร์เกรดพรีเมียมลิขสิทธิ์แท้ สอบถามรายละเอียดเพิ่มเติมทางแชทได้ตลอด 24 ชั่วโมง!';

    // Separated Specifications Section
    const specsBlock = qs('#modal-specs-block');
    const specsGrid = qs('#modal-specs-grid');
    if (specsBlock && specsGrid) {
      if (p.specs && typeof p.specs === 'object' && Object.keys(p.specs).length > 0) {
        specsGrid.innerHTML = '';
        for (const [key, val] of Object.entries(p.specs)) {
          const card = document.createElement('div');
          card.className = 'spec-card-item';
          card.innerHTML = `<div class="spec-card-key">${esc(key)}</div><div class="spec-card-val">${esc(val)}</div>`;
          specsGrid.appendChild(card);
        }
        specsBlock.style.display = 'block';
      } else {
        specsBlock.style.display = 'none';
      }
    }

    // Order CTA Button
    const orderBtn = qs('#modal-order-btn');
    const pContact = p.contact ? (p.contact.startsWith('http') ? p.contact : ('https://' + p.contact)) : contactUrl;
    orderBtn.href = pContact;
    orderBtn.onclick = () => {
      // Copy product summary to clipboard so customer can paste directly in chat!
      const vText = selectedVariantName ? ` (เลือกลาย: ${selectedVariantName})` : '';
      const copyText = `สนใจสั่งพรีออเดอร์: [${p.id}] ${p.name}${vText}`;
      copyToClipboard(copyText, false);
      showToast(`📋 คัดลอกรหัส [${p.id}] แล้ว! กำลังเปิด Messenger เพื่อทักแชท...`);
    };

    if (modal) modal.scrollTop = 0;
    const layout = qs('.sheet-layout', modal);
    if (layout) layout.scrollTop = 0;

    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal(clearHash = true) {
    const backdrop = qs('#product-modal-backdrop');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    currentProduct = null;

    if (clearHash && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  function renderModalGallery(images) {
    const mainImg = qs('#modal-main-img');
    const counter = qs('#modal-img-counter');
    const thumbWrap = qs('#modal-thumbnails');
    const prevBtn = qs('#img-prev-btn');
    const nextBtn = qs('#img-next-btn');

    function showImage(idx) {
      if (idx < 0) idx = images.length - 1;
      if (idx >= images.length) idx = 0;
      currentImgIndex = idx;

      mainImg.src = images[idx];
      counter.textContent = `${idx + 1} / ${images.length}`;

      qsa('.thumb-item', thumbWrap).forEach((t, i) => {
        t.classList.toggle('active', i === idx);
        if (i === idx) t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    }

    if (images.length <= 1) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      counter.style.display = 'none';
      thumbWrap.style.display = 'none';
    } else {
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
      counter.style.display = 'block';
      thumbWrap.style.display = 'flex';

      thumbWrap.innerHTML = images.map((u, i) => `
        <div class="thumb-item ${i === 0 ? 'active' : ''}" data-idx="${i}">
          <img src="${esc(u)}" alt="thumb ${i + 1}" loading="lazy" onerror="this.src='furlestial.ico'" />
        </div>
      `).join('');

      qsa('.thumb-item', thumbWrap).forEach(t => {
        t.addEventListener('click', () => showImage(Number(t.dataset.idx)));
      });

      prevBtn.onclick = () => showImage(currentImgIndex - 1);
      nextBtn.onclick = () => showImage(currentImgIndex + 1);
    }

    showImage(0);
  }

  // ─────────────────────────────────────────────────────
  //  EVENTS & HELPERS
  // ─────────────────────────────────────────────────────
  function bindEvents() {
    // Event delegation on products-grid for ultra-resilient mobile/touch interactions
    const grid = qs('#products-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const id = card.dataset.id;
        const p = allProducts.find(item => item.id === id);
        if (p) openProductModal(p);
      });
    }

    // Search input
    const searchInp = qs('#search-input');
    const clearBtn = qs('#search-clear-btn');
    searchInp?.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = searchInp.value ? 'flex' : 'none';
      applyFiltersAndRender();
    });
    clearBtn?.addEventListener('click', () => {
      searchInp.value = '';
      clearBtn.style.display = 'none';
      applyFiltersAndRender();
      searchInp.focus();
    });

    // Category filter pills
    qsa('.filter-pill, .cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        qsa('.filter-pill, .cat-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFiltersAndRender();
      });
    });

    // Status filter & sort
    qs('#status-filter')?.addEventListener('change', applyFiltersAndRender);
    qs('#sort-select')?.addEventListener('change', applyFiltersAndRender);

    // Reset filters
    qs('#reset-filters-btn')?.addEventListener('click', () => {
      if (searchInp) searchInp.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      qsa('.filter-pill, .cat-chip').forEach((b, i) => b.classList.toggle('active', i === 0));
      if (qs('#status-filter')) qs('#status-filter').value = '';
      applyFiltersAndRender();
    });

    // Modal Close
    qs('#modal-close-btn')?.addEventListener('click', () => closeProductModal(true));
    qs('.sheet-handle')?.addEventListener('click', () => closeProductModal(true));
    qs('#product-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target === qs('#product-modal-backdrop')) closeProductModal(true);
    });

    // Keyboard navigation (Esc, ArrowLeft, ArrowRight)
    window.addEventListener('keydown', (e) => {
      if (!currentProduct) return;
      if (e.key === 'Escape') {
        closeProductModal(true);
      } else if (e.key === 'ArrowLeft') {
        qs('#img-prev-btn')?.click();
      } else if (e.key === 'ArrowRight') {
        qs('#img-next-btn')?.click();
      }
    });

    // Copy link button
    qs('#modal-copy-link-btn')?.addEventListener('click', () => {
      if (!currentProduct) return;
      const permalink = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? (window.location.origin + window.location.pathname + '#' + currentProduct.id)
        : ('https://furlestial.pages.dev/#' + currentProduct.id);
      copyToClipboard(permalink);
      showToast('🔗 คัดลอกลิงก์ถาวรของสินค้านี้แล้ว!');
    });
  }

  function copyToClipboard(text, notify = true) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }

  function showToast(msg) {
    const t = qs('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const escapeHtml = esc;

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

