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

    // Variants
    const vSection = qs('#modal-variants-section');
    const vWrap = qs('#modal-variants-chips');
    let selectedVariantName = '';
    let currentChosenVariant = (p.variants && p.variants.length > 0) ? p.variants[0] : null;
    let currentChosenSize = null;

    if (p.variants && p.variants.length > 0) {
      vSection.style.display = 'flex';
      vWrap.innerHTML = p.variants.map((v, i) => {
        const vPrice = Number(v.sellPrice || p.sellPrice || 0);
        const vImgIdx = resolveVariantImageIndex(v, i, gallery);
        const vImgUrl = (vImgIdx >= 0 && vImgIdx < gallery.length) ? gallery[vImgIdx] : null;
        return `
          <div class="v-pill ${i === 0 ? 'selected' : ''}" data-index="${i}" data-img-index="${vImgIdx}">
            ${vImgUrl ? `<img src="${esc(vImgUrl)}" class="v-pill-thumb" alt="${esc(v.name)}" onerror="this.style.display='none'" />` : ''}
            <span>${esc(v.emoji || '✦')}</span>
            <span class="v-pill-name">${esc(v.name)}</span>
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
            currentChosenVariant = chosen;
            selectedVariantName = chosen.name;
            const chosenPrice = Number(chosen.sellPrice || p.sellPrice || 0);
            if (chosenPrice > 0) {
              qs('#modal-price-thb').textContent = `฿${chosenPrice.toLocaleString('th-TH')}`;
            }

            // FLIP GALLERY TO LINKED VARIANT IMAGE!
            const targetImgIdx = resolveVariantImageIndex(chosen, idx, gallery);
            if (targetImgIdx >= 0 && typeof activeShowGalleryImage === 'function') {
              activeShowGalleryImage(targetImgIdx);
            }
          }
        });
      });
    } else {
      vSection.style.display = 'none';
    }

    // Render gallery with two-way sync to variant pills
    renderModalGallery(gallery, (imgIdx) => {
      // If user clicked thumbnail in gallery, highlight the matching variant pill
      const matchingPill = qs(`.v-pill[data-img-index="${imgIdx}"]`, vWrap);
      if (matchingPill && !matchingPill.classList.contains('selected')) {
        qsa('.v-pill', vWrap).forEach(el => el.classList.remove('selected'));
        matchingPill.classList.add('selected');
        const vIdx = Number(matchingPill.dataset.index);
        const chosen = p.variants[vIdx];
        if (chosen) {
          currentChosenVariant = chosen;
          selectedVariantName = chosen.name;
          const chosenPrice = Number(chosen.sellPrice || p.sellPrice || 0);
          if (chosenPrice > 0) {
            qs('#modal-price-thb').textContent = `฿${chosenPrice.toLocaleString('th-TH')}`;
          }
        }
      }
    });

    // Sizes Table
    const sSection = qs('#modal-sizes-section');
    const sTbody = qs('#modal-size-tbody');
    if (p.sizes && p.sizes.length > 0) {
      sSection.style.display = 'flex';
      currentChosenSize = p.sizes[0];
      sTbody.innerHTML = p.sizes.map((s, si) => {
        const sPrice = Number(s.sellPrice || 0);
        return `
          <tr class="modal-size-row ${si === 0 ? 'selected' : ''}" data-size-idx="${si}" style="cursor:pointer;" title="คลิกเพื่อเลือกไซส์นี้">
            <td class="spec-size-key">${esc(s.name)}</td>
            <td>${esc(s.measurement || 'สัดส่วนมาตรฐานตามโรงงาน')}</td>
            <td>${sPrice > 0 ? `฿${sPrice.toLocaleString('th-TH')}` : '<span style="color:var(--accent-green); font-weight:600;">เปิดรับพรี</span>'}</td>
          </tr>
        `;
      }).join('');

      qsa('.modal-size-row', sTbody).forEach((row, sidx) => {
        row.onclick = () => {
          qsa('.modal-size-row', sTbody).forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          currentChosenSize = p.sizes[sidx];
          showToast(`📏 เลือกไซส์: ${currentChosenSize.name}`);
        };
      });
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

    // Primary Actions: Buy Now & Add to Cart
    const buyNowBtn = qs('#modal-buy-now-btn');
    if (buyNowBtn) {
      buyNowBtn.onclick = () => {
        closeProductModal(false);
        const itemPrice = Number(currentChosenVariant?.sellPrice || currentChosenSize?.sellPrice || p.sellPrice || 0);
        const itemImage = currentChosenVariant?.image || p.imageUrl || gallery[0] || 'furlestial.ico';
        startCheckout([{
          productId: p.id,
          name: p.name,
          variant: currentChosenVariant ? currentChosenVariant.name : '',
          size: currentChosenSize ? currentChosenSize.name : '',
          price: itemPrice,
          image: itemImage,
          quantity: 1
        }]);
      };
    }

    const addCartBtn = qs('#modal-add-cart-btn');
    if (addCartBtn) {
      addCartBtn.onclick = () => {
        const itemPrice = Number(currentChosenVariant?.sellPrice || currentChosenSize?.sellPrice || p.sellPrice || 0);
        const itemImage = currentChosenVariant?.image || p.imageUrl || gallery[0] || 'furlestial.ico';
        addItemToCart({
          productId: p.id,
          name: p.name,
          variant: currentChosenVariant ? currentChosenVariant.name : '',
          size: currentChosenSize ? currentChosenSize.name : '',
          price: itemPrice,
          image: itemImage,
          quantity: 1
        });
        showToast(`🛒 เพิ่ม "${p.name}" ลงในตะกร้าแล้วนะแง้ว!`);
      };
    }

    // Order CTA Button (Facebook Messenger Fallback)
    const orderBtn = qs('#modal-order-btn');
    const pContact = p.contact ? (p.contact.startsWith('http') ? p.contact : ('https://' + p.contact)) : contactUrl;
    orderBtn.href = pContact;
    orderBtn.onclick = () => {
      const vText = selectedVariantName ? ` (เลือกลาย: ${selectedVariantName})` : '';
      const sText = currentChosenSize ? ` [ไซส์: ${currentChosenSize.name}]` : '';
      const copyText = `สนใจสั่งพรีออเดอร์: [${p.id}] ${p.name}${vText}${sText}`;
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

  let activeShowGalleryImage = null;

  function resolveVariantImageIndex(v, idx, gallery) {
    if (!gallery || gallery.length === 0) return -1;
    if (typeof v.imageIndex === 'number' && v.imageIndex >= 0 && v.imageIndex < gallery.length) {
      return v.imageIndex;
    }
    if (v.image || v.imageUrl) {
      const target = String(v.image || v.imageUrl).trim();
      const matchIdx = gallery.findIndex(g => g === target || g.includes(target) || target.includes(g));
      if (matchIdx !== -1) return matchIdx;
    }

    // Keyword / Heuristic mapping based on variant name
    const nameLow = String(v.name || '').toLowerCase();
    if (/ดำล้วน/.test(nameLow) && gallery.length > 1) return 1;
    if (/ดำและสีเหลือง|ดำเหลือง/.test(nameLow) && gallery.length > 2) return 2;
    if (/กลาง/.test(nameLow) && gallery.length > 3) return 3;
    if (/ใหญ่สุด|ใหญ่/.test(nameLow) && gallery.length > 4) return 4;
    if (/เล็ก/.test(nameLow) && gallery.length > 0) return 0;

    // Default 1-to-1 index matching if gallery has enough photos
    if (idx < gallery.length) {
      return idx;
    }

    return 0;
  }

  function renderModalGallery(images, onImageChange = null) {
    if (!images || images.length === 0) images = ['furlestial.ico'];
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

      if (typeof onImageChange === 'function') {
        onImageChange(idx);
      }
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

    activeShowGalleryImage = showImage;
    showImage(0);
    return showImage;
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

    // Initialize Cart, Checkout & Supabase Auth Systems
    initCartSystem();
    initCheckoutSystem();
    initCustomerAuthSystem();
  }

  // ─────────────────────────────────────────────────────
  //  SUPABASE, CART, CHECKOUT & PROMPTPAY PAYMENT
  // ─────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://rlztfgosssuvoutrhhdd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsenRmZ29zc3N1dm91dHJoaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODU5MTUsImV4cCI6MjA5MjI2MTkxNX0.XekP0_IqcfB-Uj-rw_5_A_zhuKnlmRvadvm68Z9F7So';
  let supabase = null;
  try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) {
    console.warn('[Supabase Init Warning]', e);
  }

  let cart = [];
  let checkoutItems = [];
  let currentSlipFile = null;
  let currentAuthUser = null;

  function initCartSystem() {
    try {
      cart = JSON.parse(localStorage.getItem('furlestial_cart') || '[]');
    } catch { cart = []; }
    updateCartBadge();

    qs('#header-cart-btn')?.addEventListener('click', () => openCartModal());
    qs('#cart-close-btn')?.addEventListener('click', () => closeCartModal());
    qs('#cart-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target === qs('#cart-modal-backdrop')) closeCartModal();
    });
    qs('#cart-shop-now-btn')?.addEventListener('click', () => closeCartModal());

    qs('#cart-clear-btn')?.addEventListener('click', () => {
      if (cart.length === 0) return;
      if (confirm('ต้องการล้างสินค้าทั้งหมดในตะกร้าใช่หรือไม่?')) {
        cart = [];
        saveCart();
        renderCartModal();
        showToast('ล้างตะกร้าสินค้าเรียบร้อยแล้ว');
      }
    });

    qs('#cart-checkout-btn')?.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('ไม่มีสินค้าในตะกร้า');
        return;
      }
      closeCartModal();
      startCheckout(cart);
    });
  }

  function saveCart() {
    localStorage.setItem('furlestial_cart', JSON.stringify(cart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const countBadge = qs('#header-cart-count');
    if (countBadge) {
      if (totalCount > 0) {
        countBadge.textContent = totalCount > 99 ? '99+' : totalCount;
        countBadge.style.display = 'inline-block';
      } else {
        countBadge.style.display = 'none';
      }
    }
  }

  function addItemToCart(item) {
    const existing = cart.find(c => c.productId === item.productId && c.variant === item.variant && c.size === item.size);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    } else {
      cart.push({ ...item, quantity: item.quantity || 1 });
    }
    saveCart();
  }

  function openCartModal() {
    renderCartModal();
    const bd = qs('#cart-modal-backdrop');
    if (bd) {
      bd.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartModal() {
    const bd = qs('#cart-modal-backdrop');
    if (bd) {
      bd.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function renderCartModal() {
    const listEl = qs('#cart-items-list');
    const emptyView = qs('#cart-empty-view');
    const footerEl = qs('#cart-modal-footer');
    if (!listEl) return;

    if (cart.length === 0) {
      listEl.innerHTML = '';
      emptyView.style.display = 'block';
      footerEl.style.display = 'none';
      return;
    }

    emptyView.style.display = 'none';
    footerEl.style.display = 'block';

    let total = 0;
    listEl.innerHTML = cart.map((item, idx) => {
      const itemSubtotal = item.price * (item.quantity || 1);
      total += itemSubtotal;
      const optDesc = [item.variant ? `ลาย: ${item.variant}` : '', item.size ? `ไซส์: ${item.size}` : ''].filter(Boolean).join(' • ');
      return `
        <div class="cart-item-card">
          <img src="${esc(item.image || 'furlestial.ico')}" class="cart-item-img" alt="${esc(item.name)}" onerror="this.src='furlestial.ico'" />
          <div class="cart-item-info">
            <div class="cart-item-name" title="${esc(item.name)}">${esc(item.name)}</div>
            ${optDesc ? `<div class="cart-item-var">${esc(optDesc)}</div>` : ''}
            <div class="cart-item-price">฿${item.price.toLocaleString('th-TH')} <span style="font-size:0.72rem; color:#888; font-weight:normal;">(รวม ฿${itemSubtotal.toLocaleString('th-TH')})</span></div>
          </div>
          <div class="cart-qty-ctrl">
            <button type="button" class="cart-qty-btn btn-qty-minus" data-idx="${idx}">−</button>
            <span class="cart-qty-val">${item.quantity || 1}</span>
            <button type="button" class="cart-qty-btn btn-qty-plus" data-idx="${idx}">+</button>
          </div>
          <button type="button" class="cart-remove-btn" data-idx="${idx}" title="ลบรายการนี้">✕</button>
        </div>
      `;
    }).join('');

    qs('#cart-total-thb').textContent = `฿${total.toLocaleString('th-TH')}`;

    qsa('.btn-qty-minus', listEl).forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.idx);
        if (cart[i].quantity > 1) {
          cart[i].quantity--;
        } else {
          cart.splice(i, 1);
        }
        saveCart();
        renderCartModal();
      };
    });

    qsa('.btn-qty-plus', listEl).forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.idx);
        cart[i].quantity = (cart[i].quantity || 1) + 1;
        saveCart();
        renderCartModal();
      };
    });

    qsa('.cart-remove-btn', listEl).forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.idx);
        cart.splice(i, 1);
        saveCart();
        renderCartModal();
        showToast('นำสินค้าออกจากตะกร้าแล้ว');
      };
    });
  }

  // ─────────────────────────────────────────────────────
  //  CHECKOUT & PAYMENT LOGIC
  // ─────────────────────────────────────────────────────
  function initCheckoutSystem() {
    qs('#checkout-close-btn')?.addEventListener('click', () => closeCheckoutModal());
    qs('#checkout-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target === qs('#checkout-modal-backdrop')) closeCheckoutModal();
    });

    qs('#btn-copy-kbank')?.addEventListener('click', () => {
      copyToClipboard('015-1-98030-9');
      showToast('📋 คัดลอกเลขบัญชีกสิกรไทย (015-1-98030-9) แล้ว!');
    });

    // Step navigation
    qs('#chk-proceed-payment-btn')?.addEventListener('click', () => {
      const name = qs('#chk-name')?.value?.trim();
      const phone = qs('#chk-phone')?.value?.trim();
      const address = qs('#chk-address')?.value?.trim();
      const postal = qs('#chk-postal')?.value?.trim();
      const note = qs('#chk-note')?.value?.trim();

      if (!name) { showToast('กรุณากรอกชื่อ-นามสกุลผู้รับ'); qs('#chk-name')?.focus(); return; }
      if (!phone || phone.length < 9) { showToast('กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง'); qs('#chk-phone')?.focus(); return; }
      if (!address || address.length < 10) { showToast('กรุณากรอกที่อยู่จัดส่งโดยละเอียด'); qs('#chk-address')?.focus(); return; }
      if (!postal || postal.length < 5) { showToast('กรุณากรอกรหัสไปรษณีย์'); qs('#chk-postal')?.focus(); return; }

      // Save customer info locally for instant auto-fill next time
      try {
        localStorage.setItem('furlestial_customer_info', JSON.stringify({ name, phone, address, postal, note }));
      } catch {}

      // Transition to Step 2: Payment
      qs('#checkout-shipping-section').style.display = 'none';
      qs('#checkout-payment-section').style.display = 'block';
      qs('#chk-step1-badge')?.classList.remove('active');
      qs('#chk-step2-badge')?.classList.add('active');
      qs('#chk-payment-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    qs('#chk-back-shipping-btn')?.addEventListener('click', () => {
      qs('#checkout-payment-section').style.display = 'none';
      qs('#checkout-shipping-section').style.display = 'block';
      qs('#chk-step2-badge')?.classList.remove('active');
      qs('#chk-step1-badge')?.classList.add('active');
    });

    // Slip file selection
    const dropzone = qs('#slip-dropzone');
    const fileInput = qs('#slip-file-input');
    dropzone?.addEventListener('click', (e) => {
      if (e.target.closest('#slip-remove-btn')) return;
      fileInput?.click();
    });

    dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = '#f59e0b'; });
    dropzone?.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleSlipFile(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleSlipFile(fileInput.files[0]);
      }
    });

    qs('#slip-remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      currentSlipFile = null;
      if (fileInput) fileInput.value = '';
      qs('#slip-preview-wrap').style.display = 'none';
      qs('#slip-prompt').style.display = 'block';
    });

    qs('#chk-submit-order-btn')?.addEventListener('click', () => submitOrder());

    // Order Success Modal Actions
    qs('#btn-copy-order-id')?.addEventListener('click', () => {
      const oid = qs('#success-order-id')?.textContent || '';
      copyToClipboard(oid);
      showToast('📋 คัดลอกรหัสออเดอร์ ' + oid + ' แล้ว!');
    });
    qs('#btn-success-close')?.addEventListener('click', () => closeSuccessModal());
    qs('#btn-view-my-orders')?.addEventListener('click', () => {
      closeSuccessModal();
      openAuthModal('lookup');
    });
  }

  function handleSlipFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)');
      return;
    }
    currentSlipFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      qs('#slip-preview-img').src = e.target.result;
      qs('#slip-prompt').style.display = 'none';
      qs('#slip-preview-wrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  function startCheckout(items) {
    if (!items || items.length === 0) return;
    checkoutItems = [...items];

    // Pre-fill customer info if available
    try {
      const saved = JSON.parse(localStorage.getItem('furlestial_customer_info') || '{}');
      if (saved.name && !qs('#chk-name').value) qs('#chk-name').value = saved.name;
      if (saved.phone && !qs('#chk-phone').value) qs('#chk-phone').value = saved.phone;
      if (saved.address && !qs('#chk-address').value) qs('#chk-address').value = saved.address;
      if (saved.postal && !qs('#chk-postal').value) qs('#chk-postal').value = saved.postal;
      if (saved.note && !qs('#chk-note').value) qs('#chk-note').value = saved.note;
    } catch {}

    // Calculate total & render items list in checkout
    let total = 0;
    const listEl = qs('#chk-items-summary-list');
    if (listEl) {
      listEl.innerHTML = checkoutItems.map(it => {
        const sub = it.price * (it.quantity || 1);
        total += sub;
        const opt = [it.variant ? `ลาย: ${it.variant}` : '', it.size ? `ไซส์: ${it.size}` : ''].filter(Boolean).join(' • ');
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed rgba(255,255,255,0.08); font-size:0.84rem;">
            <div>
              <strong style="color:#fff;">${esc(it.name)}</strong>
              ${opt ? `<div style="font-size:0.75rem; color:#f0c060;">${esc(opt)}</div>` : ''}
              <div style="font-size:0.75rem; color:#888;">จำนวน: ${it.quantity || 1} ชิ้น × ฿${it.price.toLocaleString('th-TH')}</div>
            </div>
            <div style="font-weight:700; color:#34d399;">฿${sub.toLocaleString('th-TH')}</div>
          </div>
        `;
      }).join('');
    }

    qs('#chk-subtotal-thb').textContent = `฿${total.toLocaleString('th-TH')}`;
    qs('#chk-payment-exact-thb').textContent = `฿${total.toLocaleString('th-TH')}`;

    // Reset step UI
    qs('#checkout-shipping-section').style.display = 'block';
    qs('#checkout-payment-section').style.display = 'none';
    qs('#chk-step1-badge')?.classList.add('active');
    qs('#chk-step2-badge')?.classList.remove('active');

    // Reset slip
    currentSlipFile = null;
    const fi = qs('#slip-file-input');
    if (fi) fi.value = '';
    qs('#slip-preview-wrap').style.display = 'none';
    qs('#slip-prompt').style.display = 'block';

    const bd = qs('#checkout-modal-backdrop');
    if (bd) {
      bd.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCheckoutModal() {
    const bd = qs('#checkout-modal-backdrop');
    if (bd) {
      bd.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  async function submitOrder() {
    if (!currentSlipFile) {
      showToast('⚠️ กรุณาแนบรูปสลิปหลักฐานการโอนเงินก่อนกดยืนยันนะแง้ว');
      return;
    }

    const submitBtn = qs('#chk-submit-order-btn');
    const origBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ กำลังส่งคำสั่งซื้อและอัปโหลดสลิป...</span>`;

    const name = qs('#chk-name')?.value?.trim();
    const phone = qs('#chk-phone')?.value?.trim();
    const address = qs('#chk-address')?.value?.trim();
    const postal = qs('#chk-postal')?.value?.trim();
    const note = qs('#chk-note')?.value?.trim();
    const totalAmount = checkoutItems.reduce((sum, it) => sum + (it.price * (it.quantity || 1)), 0);

    // Generate unique order ID
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const orderId = `FUR-${dateStr}-${randCode}`;

    let slipUrl = '';

    try {
      // 1. Upload Slip to Supabase Storage
      if (supabase && currentSlipFile) {
        try {
          const fileExt = currentSlipFile.name.split('.').pop() || 'jpg';
          const filePath = `${orderId}_${Date.now()}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('payment_slips')
            .upload(filePath, currentSlipFile, { cacheControl: '3600', upsert: true });

          if (!uploadErr && uploadData) {
            const { data: pubData } = supabase.storage.from('payment_slips').getPublicUrl(filePath);
            slipUrl = pubData?.publicUrl || '';
          } else {
            console.warn('[Slip Upload Fail, fallback to base64]', uploadErr);
          }
        } catch (upEx) {
          console.warn('[Slip Storage Exception]', upEx);
        }
      }

      // 2. Insert Order into Supabase Database
      if (supabase) {
        const orderPayload = {
          id: orderId,
          customer_id: currentAuthUser ? currentAuthUser.id : null,
          customer_name: name,
          customer_phone: phone,
          customer_email: (currentAuthUser && currentAuthUser.email) ? currentAuthUser.email : null,
          shipping_address: address,
          shipping_postal_code: postal,
          total_amount: totalAmount,
          payment_method: 'promptpay',
          payment_slip_url: slipUrl,
          payment_status: 'paid',
          order_status: 'verifying',
          customer_note: note
        };

        const { error: ordErr } = await supabase.from('orders').insert(orderPayload);
        if (ordErr) console.warn('[Supabase Insert Order Error]', ordErr);

        const itemsPayload = checkoutItems.map(it => ({
          order_id: orderId,
          product_id: it.productId,
          product_name: it.name,
          variant_name: it.variant || null,
          size_name: it.size || null,
          price: it.price,
          quantity: it.quantity || 1,
          image_url: it.image || null
        }));

        const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsErr) console.warn('[Supabase Insert Items Error]', itemsErr);
      }

      // 3. Save Order into Local History
      try {
        const myOrders = JSON.parse(localStorage.getItem('furlestial_my_orders') || '[]');
        myOrders.unshift({
          id: orderId,
          date: new Date().toISOString(),
          customerName: name,
          phone: phone,
          totalAmount: totalAmount,
          items: checkoutItems,
          slipUrl: slipUrl,
          status: 'verifying'
        });
        localStorage.setItem('furlestial_my_orders', JSON.stringify(myOrders.slice(0, 30)));
      } catch {}

      // 4. Remove checked out items from Cart
      cart = cart.filter(c => !checkoutItems.some(ci => ci.productId === c.productId && ci.variant === c.variant && ci.size === c.size));
      saveCart();

      // 5. Open Success Modal
      closeCheckoutModal();
      openSuccessModal(orderId, name, phone, address, totalAmount, checkoutItems);
      showToast(`🎉 สั่งซื้อและแจ้งชำระเงินรหัส [${orderId}] สำเร็จแล้วนะแง้ว!`);
    } catch (err) {
      console.error('[Submit Order Exception]', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }
  }

  function openSuccessModal(orderId, name, phone, address, total, items) {
    qs('#success-order-id').textContent = orderId;
    const summaryEl = qs('#success-order-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="font-size:0.84rem; color:#ddd; line-height:1.6; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
          <div>👤 <strong>ผู้รับ:</strong> ${esc(name)} (โทร ${esc(phone)})</div>
          <div>📍 <strong>ที่อยู่จัดส่ง:</strong> ${esc(address)}</div>
          <div>📦 <strong>สินค้า:</strong> ${items.length} รายการ (ส่งฟรีถึงหน้าบ้าน)</div>
          <div>💰 <strong>ยอดเงินที่ชำระ:</strong> <strong style="color:#fde68a; font-size:1.05rem;">฿${total.toLocaleString('th-TH')}</strong> (PromptPay KBank)</div>
        </div>
      `;
    }
    const bd = qs('#order-success-backdrop');
    if (bd) {
      bd.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSuccessModal() {
    const bd = qs('#order-success-backdrop');
    if (bd) {
      bd.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // ─────────────────────────────────────────────────────
  //  CUSTOMER AUTH & MY ORDERS SYSTEM
  // ─────────────────────────────────────────────────────
  function initCustomerAuthSystem() {
    qs('#header-auth-btn')?.addEventListener('click', () => {
      openAuthModal(currentAuthUser ? 'profile' : 'login');
    });

    qs('#auth-close-btn')?.addEventListener('click', () => closeAuthModal());
    qs('#auth-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target === qs('#auth-modal-backdrop')) closeAuthModal();
    });

    // Tab buttons
    qsa('.auth-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        qsa('.auth-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        qs('#tab-login-content').style.display = (tab === 'login') ? 'block' : 'none';
        qs('#tab-signup-content').style.display = (tab === 'signup') ? 'block' : 'none';
        qs('#tab-lookup-content').style.display = (tab === 'lookup') ? 'block' : 'none';
      });
    });

    // Form Login
    qs('#form-customer-login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = qs('#login-email')?.value?.trim();
      const password = qs('#login-password')?.value;
      if (!supabase) { showToast('ระบบสมาชิกไม่พร้อมใช้งานชั่วคราว'); return; }
      showToast('⏳ กำลังเข้าสู่ระบบ...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showToast('เข้าสู่ระบบไม่สำเร็จ: ' + error.message);
      } else {
        currentAuthUser = data.user;
        updateCustomerAuthUI();
        showToast('✅ เข้าสู่ระบบสำเร็จแล้วนะแง้ว!');
      }
    });

    // Form Signup
    qs('#form-customer-signup')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = qs('#signup-name')?.value?.trim();
      const phone = qs('#signup-phone')?.value?.trim();
      const email = qs('#signup-email')?.value?.trim();
      const password = qs('#signup-password')?.value;
      if (!supabase) { showToast('ระบบสมาชิกไม่พร้อมใช้งานชั่วคราว'); return; }
      showToast('⏳ กำลังสร้างบัญชีสมาชิก...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone: phone } }
      });
      if (error) {
        showToast('สมัครสมาชิกไม่สำเร็จ: ' + error.message);
      } else {
        currentAuthUser = data.user;
        updateCustomerAuthUI();
        showToast('🎉 สมัครสมาชิกและเข้าสู่ระบบเรียบร้อยแล้ว!');
      }
    });

    // Logout
    qs('#btn-customer-logout')?.addEventListener('click', async () => {
      if (supabase) await supabase.auth.signOut();
      currentAuthUser = null;
      updateCustomerAuthUI();
      showToast('ออกจากระบบเรียบร้อยแล้ว');
    });

    // Guest Lookup (Track by Phone or Order ID)
    qs('#btn-do-lookup')?.addEventListener('click', () => doGuestLookup());
    qs('#lookup-query')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doGuestLookup();
    });

    // Check initial session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          currentAuthUser = session.user;
          updateCustomerAuthUI();
        }
      });
      supabase.auth.onAuthStateChange((_event, session) => {
        currentAuthUser = session ? session.user : null;
        updateCustomerAuthUI();
      });
    }
  }

  function updateCustomerAuthUI() {
    const authTxt = qs('#header-auth-txt');
    const tabsRow = qs('#auth-tabs-row');
    const loginContent = qs('#tab-login-content');
    const signupContent = qs('#tab-signup-content');
    const lookupContent = qs('#tab-lookup-content');
    const profileView = qs('#auth-logged-in-view');

    if (currentAuthUser) {
      const name = currentAuthUser.user_metadata?.full_name || currentAuthUser.user_metadata?.name || currentAuthUser.email.split('@')[0];
      if (authTxt) authTxt.textContent = name;
      if (tabsRow) tabsRow.style.display = 'none';
      if (loginContent) loginContent.style.display = 'none';
      if (signupContent) signupContent.style.display = 'none';
      if (lookupContent) lookupContent.style.display = 'none';
      if (profileView) {
        profileView.style.display = 'block';
        qs('#user-display-name').textContent = name;
        qs('#user-display-email').textContent = currentAuthUser.email;
        loadUserOrders(currentAuthUser.id);
      }
    } else {
      if (authTxt) authTxt.textContent = 'เข้าสู่ระบบ';
      if (tabsRow) tabsRow.style.display = 'flex';
      if (profileView) profileView.style.display = 'none';
      if (loginContent) loginContent.style.display = 'block';
    }
  }

  async function loadUserOrders(userId) {
    const listEl = qs('#user-orders-list');
    if (!listEl || !supabase) return;
    listEl.innerHTML = '<div style="color:#aaa; font-size:0.84rem;">⏳ กำลังโหลดประวัติคำสั่งซื้อ...</div>';

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error || !orders || orders.length === 0) {
      listEl.innerHTML = '<div style="color:#888; font-size:0.84rem; padding:8px 0;">ยังไม่มีประวัติคำสั่งซื้อ</div>';
      return;
    }
    renderOrdersCards(orders, listEl);
  }

  async function doGuestLookup() {
    const q = qs('#lookup-query')?.value?.trim();
    const resultEl = qs('#lookup-results-list');
    if (!resultEl) return;
    if (!q) { showToast('กรุณากรอกเบอร์โทรหรือรหัสคำสั่งซื้อ'); return; }

    resultEl.innerHTML = '<div style="color:#aaa; font-size:0.84rem;">⏳ กำลังค้นหาข้อมูลคำสั่งซื้อ...</div>';

    let foundOrders = [];
    if (supabase) {
      try {
        const cleanQuery = q.replace(/^#/, '');
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .or(`id.ilike.%${cleanQuery}%,customer_phone.ilike.%${cleanQuery}%`)
          .order('created_at', { ascending: false });
        if (!error && data) foundOrders = data;
      } catch (e) {
        console.warn('[Lookup DB Error]', e);
      }
    }

    // Fallback to local storage if offline or not found
    if (foundOrders.length === 0) {
      try {
        const local = JSON.parse(localStorage.getItem('furlestial_my_orders') || '[]');
        const clean = q.toLowerCase().replace(/^#/, '');
        foundOrders = local.filter(o => o.id.toLowerCase().includes(clean) || (o.phone && o.phone.includes(clean)));
      } catch {}
    }

    if (foundOrders.length === 0) {
      resultEl.innerHTML = '<div style="color:#f87171; font-size:0.84rem; padding:8px 0;">❌ ไม่พบคำสั่งซื้อที่ตรงกับข้อมูลที่ค้นหา</div>';
      return;
    }

    renderOrdersCards(foundOrders, resultEl);
  }

  function renderOrdersCards(orders, container) {
    const statusMap = {
      verifying: { label: '🟡 รอตรวจสอบยอดเงิน', color: '#fde68a' },
      preorder_placed: { label: '🔵 สั่งพรีออเดอร์แล้ว', color: '#60a5fa' },
      arrived_th: { label: '🟣 สินค้าถึงไทยแล้ว', color: '#c084fc' },
      shipped: { label: '🟢 จัดส่งแล้ว', color: '#34d399' },
      cancelled: { label: '🔴 ยกเลิก', color: '#f87171' }
    };

    container.innerHTML = orders.map(ord => {
      const st = statusMap[ord.order_status || ord.status] || { label: 'กำลังดำเนินการ', color: '#aaa' };
      const dateText = ord.created_at ? new Date(ord.created_at).toLocaleDateString('th-TH') : '';
      const items = ord.order_items || ord.items || [];
      return `
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:var(--accent-gold); font-size:0.92rem;">${esc(ord.id)}</strong>
            <span style="font-size:0.75rem; color:${st.color}; font-weight:700; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:10px;">${st.label}</span>
          </div>
          <div style="font-size:0.78rem; color:#888; margin-bottom:6px;">วันที่สั่ง: ${dateText} • ยอดชำระ: <strong style="color:#34d399;">฿${Number(ord.total_amount || ord.totalAmount || 0).toLocaleString('th-TH')}</strong></div>
          ${ord.tracking_number ? `<div style="background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3); border-radius:8px; padding:6px 10px; font-size:0.8rem; color:#34d399; margin:6px 0;">🚚 <strong>เลขพัสดุ (${esc(ord.shipping_carrier || 'Flash')}):</strong> <span style="font-family:monospace; font-weight:800;">${esc(ord.tracking_number)}</span></div>` : ''}
          <div style="font-size:0.76rem; color:#bbb;">
            ${items.map(it => `• ${esc(it.product_name || it.name)} ${it.variant_name || it.variant ? `(${esc(it.variant_name || it.variant)})` : ''} × ${it.quantity || 1}`).join('<br/>')}
          </div>
        </div>
      `;
    }).join('');
  }

  function openAuthModal(initialTab = 'login') {
    const bd = qs('#auth-modal-backdrop');
    if (!bd) return;
    if (initialTab === 'profile' && currentAuthUser) {
      updateCustomerAuthUI();
    } else {
      const tabBtn = qs(`.auth-tab-btn[data-tab="${initialTab}"]`);
      if (tabBtn) tabBtn.click();
    }
    bd.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    const bd = qs('#auth-modal-backdrop');
    if (bd) {
      bd.classList.remove('open');
      document.body.style.overflow = '';
    }
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

