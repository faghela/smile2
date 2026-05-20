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
  label.textContent = `${min ? Number(min).toLocaleString('ar-IQ') : '0'} — ${max ? Number(max).toLocaleString('ar-IQ') : 'غير محدود'}`;
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
    try { populateCrossSell(); } catch(e) {}
  } catch(e) {
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
    const stockTxt   = p.stock === 0 ? 'نفذ المخزون' : p.stock < 5 ? `متبقي ${p.stock} فقط` : `متوفر`;
    const pData      = JSON.stringify(p).replace(/"/g, '&quot;');
    return `<div class="product-card" style="animation-delay:${append ? i*0.1 : 0}s" onclick="handleCardClick(event, ${pData})">
      <div class="card-img">
        ${p.imageUrl ? `<img src="${p.imageUrl}" loading="lazy">` : '🛍️'}
        <div class="qv-hint"><i class="fa fa-eye"></i> عرض سريع</div>
      </div>
      <div class="card-body">
        <div class="card-cat">${p.category || 'عام'}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-desc">${p.description}</div>
        <div class="card-footer">
          <div>
            <div class="card-price">${p.price.toLocaleString('ar-IQ')} د</div>
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

  // Staggered reveal
  setTimeout(() => {
    document.querySelectorAll('.product-card:not(.reveal)').forEach((el, idx) => {
      setTimeout(() => el.classList.add('reveal'), idx * 50);
    });
  }, 50);
}

function handleCardClick(e, p) {
  if (e.target.closest('.add-btn')) {
    if (p.stock > 0) addToCart(p);
  } else {
    // Any other click opens Quick View
    openQuickView(p);
  }
}

// --- Quick View Logic ---
let qvProduct = null;

function openQuickView(p) {
  qvProduct = p;
  const stockCls = p.stock === 0 ? 'out' : p.stock < 5 ? 'low' : 'in';
  const stockTxt = p.stock === 0 ? '❌ نفذ المخزون' : p.stock < 5 ? `⚠️ متبقي ${p.stock} قطعة فقط` : '✅ متوفر في المخزون';

  document.getElementById('qvImg').innerHTML = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="${p.name}">`
    : `<div class="qv-emoji">🛍️</div>`;
  document.getElementById('qvCat').textContent   = p.category || 'عام';
  document.getElementById('qvName').textContent  = p.name;
  document.getElementById('qvPrice').textContent = `${p.price.toLocaleString('ar-IQ')} دينار`;
  document.getElementById('qvDesc').textContent  = p.description;
  const stockEl = document.getElementById('qvStock');
  stockEl.textContent = stockTxt;
  stockEl.className   = `qv-stock ${stockCls}`;

  const addBtn = document.getElementById('qvAddBtn');
  addBtn.disabled = p.stock === 0;
  addBtn.innerHTML = p.stock === 0
    ? '<i class="fa fa-ban"></i> نفذ المخزون'
    : '<i class="fa fa-shopping-bag"></i> إضافة للسلة';

  document.getElementById('qvOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQuickView(event, force = false) {
  if (force || event.target === document.getElementById('qvOverlay')) {
    document.getElementById('qvOverlay').classList.remove('open');
    document.body.style.overflow = '';
    qvProduct = null;
  }
}

function qvAddToCart() {
  if (qvProduct && qvProduct.stock > 0) {
    addToCart(qvProduct);
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
    bar.innerHTML = `<button class="cat-btn ${'الكل' === currentCat ? 'active' : ''}" onclick="filterCat('الكل',this)">الكل</button>` +
      cats.map(c => `<button class="cat-btn ${c===currentCat?'active':''}" onclick="filterCat('${c}',this)">${c}</button>`).join('');
  } catch(e) {}
}

function filterCat(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  fetchProducts();
}