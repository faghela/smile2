// --- Init ---
updateCartUI();
fetchProducts();
// تحديث ملخص السعر عند الانتقال للخطوة 3
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btnNext2') setTimeout(updateFinalSummary, 50);
});

// الاستعلام التلقائي عن منتج من الرابط وفتحه في العرض السريع لتهيئة SEO
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('product');
  if (productId) {
    try {
      if (/^[0-9a-fA-F]{24}$/.test(productId)) {
        const res = await fetch(`${API}/products/${productId}`);
        if (res.ok) {
          const product = await res.json();
          setTimeout(() => {
            if (typeof openQuickView === 'function') {
              openQuickView(product);
            }
          }, 600);
        }
      }
    } catch (e) {
      console.warn('Failed to auto-load product from query:', e);
    }
  }
});