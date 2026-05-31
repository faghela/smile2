// --- Active Filter State ---
let activeFilters = { sort: 'newest', inStock: false, minPrice: '', maxPrice: '' };
let filterPanelOpen = false;

// --- Filter Bar Logic ---
function toggleFilters() {
  filterPanelOpen = !filterPanelOpen;
  document.getElementById('filterPanel').classList.toggle('open', filterPanelOpen);
  document.getElementById('filterToggle').classList.toggle('active', filterPanelOpen);
}

function updatePriceLabel() {
  const min = document.getElementById('minPrice').value;
  const max = document.getElementById('maxPrice').value;
  const label = document.getElementById('priceRangeLabel');
  if (!min && !max) { label.textContent = '0 — غير محدود'; return; }
  label.textContent = `${min ? Number(min).toLocaleString('en-US') : '0'} — ${max ? Number(max).toLocaleString('en-US') : 'غير محدود'}`;
}

function applyFilters() {
  activeFilters.sort    = document.getElementById('sortSelect').value;
  activeFilters.inStock = document.getElementById('inStockOnly').checked;
  activeFilters.minPrice = document.getElementById('minPrice').value;
  activeFilters.maxPrice = document.getElementById('maxPrice').value;

  // Update filter badge count
  let count = 0;
  if (activeFilters.sort !== 'newest') count++;
  if (activeFilters.inStock) count++;
  if (activeFilters.minPrice) count++;
  if (activeFilters.maxPrice) count++;
  const badge = document.getElementById('filterBadge');
  badge.style.display = count > 0 ? 'inline-block' : 'none';
  badge.textContent = count;

  currentPage = 1;
  fetchProducts();
}

function resetFilters() {
  document.getElementById('sortSelect').value = 'newest';
  document.getElementById('inStockOnly').checked = false;
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('priceRangeLabel').textContent = '0 — غير محدود';
  document.getElementById('filterBadge').style.display = 'none';
  activeFilters = { sort: 'newest', inStock: false, minPrice: '', maxPrice: '' };
  currentPage = 1;
  fetchProducts();
}

// --- Data Fetching (Products & Categories) ---
async function fetchProducts(append = false) {
  if (!append) {
    currentPage = 1;
    document.getElementById('productsGrid').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  }

  const params = new URLSearchParams({ page: currentPage, limit: 12 });
  if (currentCat !== 'الكل') params.set('category', currentCat);
  if (activeFilters.sort && activeFilters.sort !== 'newest') params.set('sort', activeFilters.sort);
  if (activeFilters.inStock) params.set('inStock', 'true');
  if (activeFilters.minPrice) params.set('minPrice', activeFilters.minPrice);
  if (activeFilters.maxPrice) params.set('maxPrice', activeFilters.maxPrice);

  try {
    const res = await fetch(`${API}/products?${params}`);
    const result = await res.json();
    const products = result.data || result;
    if (result.pagination) {
      hasMoreProducts = currentPage < result.pagination.totalPages;
      document.getElementById('loadMoreBtn').style.display = hasMoreProducts ? 'block' : 'none';
    }
    if (!append) allProducts = [];
    allProducts = [...allProducts, ...products];
    renderProducts(products, append);
    if (!append) fetchCategories();
    try { populateCrossSell(); } catch(e) { console.error('populateCrossSell failed:', e); }
  } catch(e) {
    console.error('fetchProducts failed:', e);
    document.getElementById('productsGrid').innerHTML = '<div class="empty"><i class="fa fa-exclamation-circle"></i><p>حدث خطأ في جلب المنتجات</p></div>';
  }
}

function loadMoreProducts() {
  if (hasMoreProducts) { currentPage++; fetchProducts(true); }
}

function renderProducts(products, append = false) {
  const grid = document.getElementById('productsGrid');
  if (!products.length && !append) {
    grid.innerHTML = '<div class="empty"><i class="fa fa-box-open"></i><p>لا توجد منتجات تطابق معايير البحث</p></div>';
    return;
  }

  const html = products.map((p, i) => {
    const stockClass = p.stock === 0 ? 'out' : p.stock < 5 ? 'low' : '';
    const stockTxt   = p.stock === 0 ? 'نفذ المخزون' : p.stock < 5 ? 'كمية محدودة' : 'متوفر';
    const saleActive = isOnSale(p);
    
    return `<div class="product-card" style="animation-delay:${append ? i*0.1 : 0}s" onclick="handleCardClick(event, '${p._id}')">
      <div class="card-img">
        ${p.imageUrl ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}" loading="lazy">` : '🛍️'}
        <div class="qv-hint"><i class="fa fa-eye"></i> عرض سريع</div>
        <button class="wishlist-heart-btn ${isInWishlist(p._id) ? 'active' : ''}" data-id="${p._id}" onclick="toggleWishlist(event, '${p._id}')" title="إضافة للمفضلة">
          <i class="${isInWishlist(p._id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
        ${saleActive ? `<span class="sale-badge">خصم 🔥</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-cat">${escapeHTML(p.category || 'عام')}</div>
        <div class="card-name">${escapeHTML(p.name)}</div>
        <div class="card-desc">${escapeHTML(p.description)}</div>
        ${saleActive ? `<div class="discount-timer" data-end="${escapeHTML(p.discountEndsAt)}">ينتهي العرض خلال: --:--:--</div>` : ''}
        <div class="card-footer">
          <div>
            <div class="card-price">
              ${saleActive 
                ? `<span class="sale-price">${p.salePrice.toLocaleString('en-US')} د</span> <span class="old-price">${p.price.toLocaleString('en-US')} د</span>`
                : `${p.price.toLocaleString('en-US')} د`
              }
            </div>
            <div class="card-stock ${stockClass}">${stockTxt}</div>
          </div>
          <button class="add-btn" ${p.stock === 0 ? 'disabled' : ''} title="إضافة للسلة">
            <i class="fa ${p.stock === 0 ? 'fa-ban' : 'fa-plus'}"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  if (append) { grid.insertAdjacentHTML('beforeend', html); } else { grid.innerHTML = html; }

  // Staggered reveal using IntersectionObserver
  const observerOptions = {
    threshold: 0.05,
    rootMargin: "0px 0px -30px 0px"
  };
  
  let revealDelay = 0;
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        setTimeout(() => {
          card.classList.add('reveal');
        }, revealDelay);
        revealDelay += 40; // slightly faster reveal for snappier feel
        setTimeout(() => { revealDelay = 0; }, 80);
        observer.unobserve(card);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.product-card:not(.reveal)').forEach(card => {
    revealObserver.observe(card);
  });
}

function handleCardClick(e, productId) {
  const p = allProducts.find(x => x._id === productId);
  if (!p) return;
  if (e.target.closest('.wishlist-heart-btn')) {
    // handled by toggleWishlist
    return;
  }
  if (e.target.closest('.add-btn')) {
    if (p.stock > 0) addToCart(p);
  } else {
    // Any other click opens Quick View
    openQuickView(p);
  }
}

// --- Quick View Logic ---
let qvProduct = null;
let qvQty = 1;

function switchQvTab(tabId) {
  document.querySelectorAll('.qv-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.qv-tab-content').forEach(content => content.classList.remove('active'));
  
  const selectedBtn = document.getElementById(`btn-tab-${tabId}`);
  const selectedContent = document.getElementById(`tab-${tabId}`);
  if (selectedBtn) selectedBtn.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');
}

function openQuickView(p) {
  qvProduct = p;
  qvQty = 1;
  const stockCls = p.stock === 0 ? 'out' : p.stock < 5 ? 'low' : 'in';
  const stockTxt = p.stock === 0 ? '❌ نفذ المخزون' : p.stock < 5 ? '⚠️ متوفر - كمية محدودة' : '✅ متوفر في المخزون';
  const saleActive = isOnSale(p);

  document.getElementById('qvImg').innerHTML = p.imageUrl
    ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}">`
    : `<div class="qv-emoji">🛍️</div>`;
  document.getElementById('qvCat').textContent   = p.category || 'عام';
  document.getElementById('qvName').textContent  = p.name;
  
  const qvPriceEl = document.getElementById('qvPrice');
  if (saleActive) {
    qvPriceEl.innerHTML = `<span class="sale-price" style="color:#ec4899;font-weight:800">${p.salePrice.toLocaleString('en-US')} د</span> <span class="old-price" style="text-decoration:line-through;font-size:1.1rem;color:var(--txt2);margin-right:0.6rem">${p.price.toLocaleString('en-US')} د</span>`;
  } else {
    qvPriceEl.textContent = `${p.price.toLocaleString('en-US')} دينار`;
  }
  
  // Set up Quick View countdown timer
  const qvTimer = document.getElementById('qvDiscountTimer');
  if (qvTimer) {
    if (saleActive) {
      qvTimer.innerHTML = `<div class="discount-timer" data-end="${p.discountEndsAt}">ينتهي العرض خلال: --:--:--</div>`;
      qvTimer.style.display = 'flex';
    } else {
      qvTimer.style.display = 'none';
    }
  }

  document.getElementById('qvDesc').textContent  = p.description;
  const stockEl = document.getElementById('qvStock');
  stockEl.textContent = stockTxt;
  stockEl.className   = `qv-stock ${stockCls}`;

  // Reset tab to info
  switchQvTab('info');

  // تحديث وعرض تحديد الكمية
  const qtySection = document.getElementById('qvQtySection');
  if (qtySection) {
    qtySection.style.display = p.stock === 0 ? 'none' : 'flex';
  }
  const qtyNum = document.getElementById('qvQtyNum');
  if (qtyNum) qtyNum.textContent = 1;

  const addBtn = document.getElementById('qvAddBtn');
  addBtn.disabled = p.stock === 0;
  addBtn.innerHTML = p.stock === 0
    ? '<i class="fa fa-ban"></i> نفذ المخزون'
    : '<i class="fa fa-shopping-bag"></i> إضافة للسلة';

  // Load related products
  populateRelatedProducts(p);

  document.getElementById('qvOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function changeQvQty(delta) {
  if (!qvProduct) return;
  const newQty = qvQty + delta;
  if (newQty < 1) return;
  if (newQty > qvProduct.stock) {
    showToast('عذراً، لقد تجاوزت الكمية المتاحة في المخزون لهذا المنتج', 'error');
    return;
  }
  qvQty = newQty;
  const qtyNum = document.getElementById('qvQtyNum');
  if (qtyNum) qtyNum.textContent = qvQty;
}

function closeQuickView(event, force = false) {
  if (force || event.target === document.getElementById('qvOverlay')) {
    document.getElementById('qvOverlay').classList.remove('open');
    document.body.style.overflow = '';
    qvProduct = null;
    qvQty = 1;
  }
}

function qvAddToCart() {
  if (qvProduct && qvProduct.stock > 0) {
    addToCart(qvProduct, qvQty);
    closeQuickView(null, true);
  }
}

// Keyboard close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeQuickView(null, true);
    closeSuccess();
  }
});

async function fetchCategories() {
  try {
    const res  = await fetch(`${API}/products/categories`);
    const cats = await res.json();
    const bar  = document.getElementById('catBar');
    const uniqueCats = cats.filter(c => c !== 'الكل');
    const iconMap = {
      'الكل': '✨',
      'بخ': '💨',
      'عام': '📦',
      'ساعات': '⌚',
      'عطور': '🧴',
      'ملابس': '👕',
      'أحذية': '👟',
      'إلكترونيات': '💻'
    };
    const getLabel = (c) => `${iconMap[c] || '🏷️'} ${c}`;
    bar.innerHTML = `<button class="cat-btn ${'الكل' === currentCat ? 'active' : ''}" onclick="filterCat('الكل',this)">${getLabel('الكل')}</button>` +
      uniqueCats.map(c => `<button class="cat-btn ${c===currentCat?'active':''}" onclick="filterCat('${escapeHTML(c)}',this)">${getLabel(escapeHTML(c))}</button>`).join('');
  } catch(e) {
    console.error('fetchCategories failed:', e);
  }
}

function filterCat(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  fetchProducts();
}

// Check if product has an active sale
function isOnSale(p) {
  return p.salePrice !== undefined && p.salePrice !== null && p.discountEndsAt && new Date(p.discountEndsAt) > new Date();
}

// Related products
async function populateRelatedProducts(product) {
  const section = document.getElementById('qvRelatedSection');
  const grid = document.getElementById('qvRelatedGrid');
  if (!section || !grid) return;
  
  try {
    const res = await fetch(`${API}/products?category=${encodeURIComponent(product.category || 'عام')}&limit=5`);
    const result = await res.json();
    const products = result.data || result;
    
    const related = products.filter(x => x._id !== product._id && x.stock > 0).slice(0, 4);
    
    if (related.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = 'block';
    grid.innerHTML = related.map(p => {
      const priceHTML = isOnSale(p)
        ? `<span class="sale-price" style="color:#ec4899;font-weight:700">${p.salePrice.toLocaleString('en-US')} د</span> <span class="old-price" style="text-decoration:line-through;font-size:0.72rem;color:var(--txt2);margin-right:0.3rem">${p.price.toLocaleString('en-US')} د</span>`
        : `${p.price.toLocaleString('en-US')} د`;
        
      return `
        <div class="qv-related-card" onclick="openQuickViewById('${p._id}')">
          <div class="qv-related-img">
            ${p.imageUrl ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}">` : '🛍️'}
          </div>
          <div class="qv-related-name">${escapeHTML(p.name)}</div>
          <div class="qv-related-price">${priceHTML}</div>
        </div>
      `;
    }).join('');
    
    // Cache related products so they can be opened/added from Quick View
    related.forEach(rp => {
      if (!allProducts.some(ap => ap._id === rp._id)) {
        allProducts.push(rp);
      }
    });
  } catch(e) {
    console.warn('Failed to load related products:', e);
    section.style.display = 'none';
  }
}

function openQuickViewById(id) {
  const p = allProducts.find(x => x._id === id);
  if (p) openQuickView(p);
}

// Global countdown timers updater
let lastSecond = -1;
function updateCountdownTimers() {
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec === lastSecond) return;
  lastSecond = nowSec;

  const timers = document.querySelectorAll('.discount-timer');
  if (timers.length === 0) return;
  
  const now = Date.now();
  for (let i = 0; i < timers.length; i++) {
    const timer = timers[i];
    const endStr = timer.getAttribute('data-end');
    if (!endStr) continue;
    const endTime = new Date(endStr).getTime();
    const distance = endTime - now;
    
    if (distance < 0) {
      const expiredText = "انتهى العرض ⏳";
      if (timer.textContent !== expiredText) {
        timer.textContent = expiredText;
        timer.style.color = 'var(--txt2)';
        timer.style.background = 'rgba(255,255,255,0.05)';
        timer.style.borderColor = 'var(--border)';
      }
      continue;
    }
    
    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    const pad = (n) => String(n).padStart(2, '0');
    const newText = `ينتهي العرض خلال: ${pad(hours)}:${pad(minutes)}:${pad(seconds)} ⏳`;
    if (timer.textContent !== newText) {
      timer.textContent = newText;
    }
  }
}

// Throttled setInterval running every 1000ms
setInterval(updateCountdownTimers, 1000);