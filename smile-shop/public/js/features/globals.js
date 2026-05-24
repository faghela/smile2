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