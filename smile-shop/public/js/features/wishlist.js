// --- Wishlist Management ---
let wishlist = [];

try {
  wishlist = JSON.parse(localStorage.getItem('smile_wishlist')) || [];
} catch(e) {
  wishlist = [];
}

/**
 * Saves the current wishlist to localStorage and updates UI elements.
 */
function saveWishlist() {
  localStorage.setItem('smile_wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  updateHeartButtons();
}

/**
 * Toggles a product in the wishlist (adds if not present, removes if present).
 * Shows a toast message to the user upon change.
 * @param {Event} e - The trigger event (optional, for stopping propagation).
 * @param {string} productId - ID of the product.
 */
function toggleWishlist(e, productId) {
  if (e) e.stopPropagation();
  
  const idx = wishlist.indexOf(productId);
  const p = allProducts.find(x => x._id === productId);
  const productName = p ? p.name : 'المنتج';
  
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast(`تمت إزالة "${productName}" من المفضلة 💔`, 'info');
  } else {
    wishlist.push(productId);
    if (navigator.vibrate) navigator.vibrate(50);
    showToast(`تمت إضافة "${productName}" للمفضلة ❤️`, 'success');
  }
  
  saveWishlist();
}

/**
 * Checks if a product is currently in the wishlist.
 * @param {string} productId - ID of the product.
 * @returns {boolean} True if the product is in the wishlist.
 */
function isInWishlist(productId) {
  return wishlist.includes(productId);
}

/**
 * Opens the wishlist sidebar overlay.
 */
function openWishlist() {
  const sidebar = document.getElementById('wishlistSidebar');
  const overlay = document.getElementById('wishlistOverlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

/**
 * Closes the wishlist sidebar overlay.
 */
function closeWishlist() {
  const sidebar = document.getElementById('wishlistSidebar');
  const overlay = document.getElementById('wishlistOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

/**
 * Renders/updates the wishlist items in the sidebar UI.
 */
function updateWishlistUI() {
  const badge = document.getElementById('wishlistBadge');
  const bnavBadge = document.getElementById('bnavWishlistBadge');
  const el = document.getElementById('wishlistItems');
  
  const count = wishlist.length;
  
  if (badge) {
    badge.textContent = count;
    if (count > 0) badge.classList.add('show'); else badge.classList.remove('show');
  }
  if (bnavBadge) {
    bnavBadge.textContent = count;
    if (count > 0) bnavBadge.classList.add('show'); else bnavBadge.classList.remove('show');
  }
  
  if (!el) return;
  
  if (count === 0) {
    el.innerHTML = '<div class="cart-empty"><i class="fa-regular fa-heart"></i><p>قائمة المفضلة فارغة</p></div>';
    return;
  }
  
  const itemsHTML = wishlist.map(id => {
    const p = allProducts.find(x => x._id === id);
    if (!p) return ''; // If product is not loaded
    
    // Check if on sale
    const priceHTML = (p.salePrice && p.discountEndsAt && new Date(p.discountEndsAt) > new Date())
      ? `<span class="sale-price" style="color:#ec4899;font-weight:800">${p.salePrice.toLocaleString('en-US')} د</span> <span class="old-price" style="text-decoration:line-through;font-size:0.8rem;color:var(--txt2);margin-right:0.4rem">${p.price.toLocaleString('en-US')} د</span>`
      : `${p.price.toLocaleString('en-US')} د`;
      
    return `
      <div class="cart-item">
        <div class="cart-item-img">${p.imageUrl ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}">` : '🛒'}</div>
        <div class="cart-item-info" style="cursor:pointer;" onclick="openProductFromWishlist('${p._id}')">
          <div class="cart-item-name">${escapeHTML(p.name)}</div>
          <div class="cart-item-price">${priceHTML}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
          <button class="remove-btn" style="position:static; opacity:1; transform:scale(1);" onclick="toggleWishlist(event, '${p._id}')" title="إزالة"><i class="fa fa-times"></i></button>
          <button class="add-btn" style="padding:0.4rem 0.6rem; font-size:0.8rem; height:28px; width:28px; display:flex; align-items:center; justify-content:center; border-radius:50%" ${p.stock === 0 ? 'disabled' : ''} onclick="addFromWishlistToCart('${p._id}')" title="إضافة للسلة">
            <i class="fa fa-plus"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  el.innerHTML = itemsHTML;
}

/**
 * Opens a product in the quick view modal directly from the wishlist.
 * @param {string} id - ID of the product.
 */
function openProductFromWishlist(id) {
  const p = allProducts.find(x => x._id === id);
  if (p) {
    closeWishlist();
    openQuickView(p);
  }
}

/**
 * Adds a product from the wishlist directly to the shopping cart.
 * @param {string} id - ID of the product.
 */
function addFromWishlistToCart(id) {
  const p = allProducts.find(x => x._id === id);
  if (p) {
    addToCart(p);
  }
}

/**
 * Updates all wishlist heart button icons across the interface.
 */
function updateHeartButtons() {
  document.querySelectorAll('.wishlist-heart-btn').forEach(btn => {
    const id = btn.getAttribute('data-id');
    if (id) {
      const active = isInWishlist(id);
      btn.classList.toggle('active', active);
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = active ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      }
    }
  });
}

// Initial UI load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateWishlistUI, 500);
});

