// --- Cart & Upselling ---

/**
 * Saves the current cart to localStorage and updates UI.
 */
function saveCart() { 
  localStorage.setItem('smile_cart', JSON.stringify(cart)); 
  updateCartUI(); 
}

/**
 * Adds a product to the cart with specified quantity, validating stock.
 * @param {Object} p - The product object.
 * @param {number} [qty=1] - The quantity to add.
 */
function addToCart(p, qty = 1) {
  const ex = cart.find(i => i.productId === p._id);
  const currentQty = ex ? ex.quantity : 0;
  if (currentQty + qty > p.stock) { 
    showToast('عذراً، لقد تجاوزت الكمية المتاحة في المخزون لهذا المنتج', 'error'); 
    return; 
  }
  
  if (navigator.vibrate) navigator.vibrate(50);
  
  const activePrice = (p.salePrice && p.discountEndsAt && new Date(p.discountEndsAt) > new Date()) ? p.salePrice : p.price;
  
  if(ex){ 
    ex.quantity += qty; 
  } else { 
    cart.push({
      productId: p._id,
      name: p.name,
      price: activePrice,
      quantity: qty,
      imageUrl: p.imageUrl,
      stock: p.stock
    }); 
  }
  saveCart();
  
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.classList.remove('show');
    setTimeout(() => badge.classList.add('show'), 50);
  }
  
  showToast(`تمت إضافة ${qty} من "${p.name}" بسعادة ✨`, 'success');
  openCart();
}

/**
 * Changes quantity of a product in the cart.
 * @param {string} id - Product ID.
 * @param {number} delta - Change amount (e.g. +1 or -1).
 */
function changeQty(id, delta) {
  const item = cart.find(i => i.productId === id);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty > (item.stock || 9999)) { 
    showToast('وصلت للحد الأقصى المتاح', 'error'); 
    return; 
  }
  item.quantity = newQty;
  if (item.quantity <= 0) cart = cart.filter(i => i.productId !== id);
  saveCart();
}

/**
 * Removes a product completely from the cart.
 * @param {string} id - Product ID.
 */
function removeFromCart(id) { 
  cart = cart.filter(i => i.productId !== id); 
  saveCart(); 
}

/**
 * Updates the cart sidebar and header badge UI.
 */
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = count;
    if (count > 0) badge.classList.add('show'); else badge.classList.remove('show');
  }

  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = total.toLocaleString('en-US') + ' د';

  try {
    const spBar = document.getElementById('spBar');
    const spMsg = document.getElementById('spMsg');
    const progress = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
    if (spBar) spBar.style.width = `${progress}%`;
    if (spMsg && spBar) {
      if (total >= FREE_SHIPPING_THRESHOLD) {
        spMsg.innerHTML = '<span style="color:var(--green);font-weight:700">مبروك! حصلت على شحن مجاني 🎉</span>';
        spBar.style.background = 'var(--green)';
      } else if (total > 0) {
        const remaining = FREE_SHIPPING_THRESHOLD - total;
        spMsg.innerHTML = `أضف بـ <b style="color:var(--purple-l)">${remaining.toLocaleString('en-US')} د</b> للحصول على شحن مجاني`;
        spBar.style.background = 'var(--grad)';
      } else {
        spMsg.innerHTML = `شحن مجاني عند تسوقك بـ ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-US')} د`;
        spBar.style.background = 'var(--grad)';
      }
    }
  } catch(e) { 
    console.warn('shipping bar:', e); 
  }

  if (cart.length === 0) {
    if (el) el.innerHTML = '<div class="cart-empty"><i class="fa fa-shopping-bag"></i><p>سلتك تنتظر إبداعك</p></div>';
    if (footer) footer.style.display = 'none';
    const csSection = document.getElementById('crossSellSection');
    if (csSection) csSection.style.display = 'none';
  } else {
    if (el) {
      el.innerHTML = cart.map(i => `
        <div class="cart-item">
          <div class="cart-item-img">${i.imageUrl ? `<img src="${escapeHTML(i.imageUrl)}" alt="${escapeHTML(i.name)}">` : '🛒'}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${escapeHTML(i.name)}</div>
            <div class="cart-item-price">${(i.price * i.quantity).toLocaleString('en-US')} د</div>
            <div class="qty-ctrl">
              <button class="qty-btn" onclick="changeQty('${i.productId}',-1)">-</button>
              <span class="qty-num">${i.quantity}</span>
              <button class="qty-btn" onclick="changeQty('${i.productId}',1)">+</button>
            </div>
          </div>
          <button class="remove-btn" onclick="removeFromCart('${i.productId}')" title="إزالة"><i class="fa fa-times"></i></button>
        </div>`).join('');
    }
    if (footer) footer.style.display = 'block';
    try { 
      populateCrossSell(); 
    } catch(e) { 
      console.warn('cross-sell:', e); 
    }
  }
}

/**
 * Opens the shopping cart sidebar.
 */
function openCart() { 
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.add('open'); 
  if (overlay) overlay.classList.add('open'); 
}

/**
 * Closes the shopping cart sidebar.
 */
function closeCart() { 
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.remove('open'); 
  if (overlay) overlay.classList.remove('open'); 
}

/**
 * Adds a product to the cart by its ID.
 * @param {string} productId - Product ID.
 * @param {number} [qty=1] - Quantity.
 */
function addToCartById(productId, qty = 1) {
  const p = allProducts.find(x => x._id === productId);
  if (p) addToCart(p, qty);
}

let lastCartProductIds = '';
/**
 * Populates upselling cross-sell items in the cart sidebar.
 * Optimized: Only updates suggestion cards when actual items change, not quantities.
 */
function populateCrossSell() {
  const currentIds = cart.map(c => c.productId).sort().join(',');
  if (currentIds === lastCartProductIds) return; 
  lastCartProductIds = currentIds;

  const csDiv = document.getElementById('csItems');
  const available = allProducts.filter(p => !cart.find(c => c.productId === p._id) && p.stock > 0);
  const shuffled = [...available].sort(() => 0.5 - Math.random()).slice(0, 4);
  
  if(!shuffled.length) { 
    const csSection = document.getElementById('crossSellSection');
    if (csSection) csSection.style.display = 'none'; 
    return; 
  }
  const csSection = document.getElementById('crossSellSection');
  if (csSection) csSection.style.display = 'block';
  
  if (csDiv) {
    csDiv.innerHTML = shuffled.map(p => {
      const activePrice = (p.salePrice && p.discountEndsAt && new Date(p.discountEndsAt) > new Date()) ? p.salePrice : p.price;
      return `
        <div class="cs-card" onclick="addToCartById('${p._id}')">
          <div class="cs-img">${p.imageUrl ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}">` : '🛍️'}</div>
          <div class="cs-name">${escapeHTML(p.name)}</div>
          <div class="cs-price">+ ${activePrice.toLocaleString('en-US')} د</div>
        </div>
      `;
    }).join('');
  }
}