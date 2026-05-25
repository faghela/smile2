// --- Configurations & Globals ---
const API = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || '/api';
let cart = JSON.parse(localStorage.getItem('smile_cart') || '[]');
let allProducts = [];
let shippingZones = [];
let selectedShippingPrice = 0;
let currentCat = 'الكل';
let currentPage = 1;
let hasMoreProducts = true;
const FREE_SHIPPING_THRESHOLD = 150; // عتبة الشحن المجاني

// دالة لتوليد رابط واتساب آمن ومنسق
function generateWhatsAppLink(phone, message) {
  if (!phone) return '#';
  // تنظيف رقم الهاتف: الاحتفاظ بالأرقام فقط
  let cleanPhone = phone.replace(/\D/g, '');
  // إذا كان يبدأ بـ 09، نقوم بتحويله لكود ليبيا 2189
  if (cleanPhone.startsWith('09')) {
    cleanPhone = '218' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    cleanPhone = '218' + cleanPhone;
  }
  // إذا كان لا يحتوي على كود الدولة وربما يكون رقم ليبي عادي من 9 خانات
  if (!cleanPhone.startsWith('218') && cleanPhone.length === 9) {
    cleanPhone = '218' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}