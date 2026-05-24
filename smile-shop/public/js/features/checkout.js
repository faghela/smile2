// --- Multi-step Checkout & Cities ---
let currentStep = 1;

// جلب مناطق الشحن وملء القائمة المنسدلة والبطاقات البصرية الحديثة
async function fetchShippingZones() {
  try {
    const res = await fetch(`${API}/shipping`);
    shippingZones = await res.json();
    
    // 1. ملء القائمة المنسدلة المخفية للتوافقية التامة مع الأكواد الحالية
    const sel = document.getElementById('custCity');
    if (sel) {
      sel.innerHTML = '<option value="">-- اختر مدينتك --</option>' +
        shippingZones.map(z =>
          `<option value="${z.city}" data-price="${z.price}">${z.city} — ${z.price === 0 ? 'شحن مجاني' : z.price.toLocaleString('en-US') + ' د'}</option>`
        ).join('');
    }
    
    // 2. ملء شبكة البطاقات الحديثة والمصممة بأسلوب عصري
    const grid = document.getElementById('cityCardsGrid');
    if (grid) {
      if (shippingZones.length === 0) {
        grid.innerHTML = '<div style="text-align:center; color:var(--txt2); grid-column:1/-1; padding: 1.5rem 0;">لا توجد مدن توصيل متاحة حالياً</div>';
        return;
      }
      
      grid.innerHTML = shippingZones.map(z => {
        const priceText = z.price === 0 ? 'شحن مجاني' : `${z.price.toLocaleString('en-US')} د`;
        return `
          <div class="city-card" data-city="${z.city}" onclick="selectCityCard('${z.city}', ${z.price}, this)">
            <i class="fa fa-map-marker-alt city-card-icon"></i>
            <div class="city-card-name">${z.city}</div>
            <div class="city-card-price">${priceText}</div>
          </div>
        `;
      }).join('');
    }
  } catch(e) { 
    console.warn('لم يتم جلب مناطق الشحن:', e);
    const grid = document.getElementById('cityCardsGrid');
    if (grid) {
      grid.innerHTML = '<div style="text-align:center; color:var(--red); grid-column:1/-1; padding: 1.5rem 0;"><i class="fa fa-exclamation-circle"></i> خطأ في جلب مدن التوصيل</div>';
    }
  }
}

// دالة اختيار بطاقة المدينة وتحديث الحقول المخفية والمعاينة
function selectCityCard(city, price, cardElement) {
  // 1. تحديث القيمة في القائمة المنسدلة المخفية
  const sel = document.getElementById('custCity');
  if (sel) {
    sel.value = city;
  }
  
  // 2. تحديث الحالة البصرية النشطة للبطاقة المحددة
  document.querySelectorAll('.city-card').forEach(card => card.classList.remove('active'));
  if (cardElement) {
    cardElement.classList.add('active');
  }
  
  // 3. تحديث سعر الشحن والتحقق من صحة النموذج وإجمالي السعر
  selectedShippingPrice = price;
  
  const preview = document.getElementById('shippingPreview');
  if (city && preview) {
    preview.style.display = 'block';
    document.getElementById('spCity').textContent = city;
    document.getElementById('spCityPrice').textContent = price === 0 ? 'مجاني 🎉' : `${price.toLocaleString('en-US')} دينار`;
  } else if (preview) {
    preview.style.display = 'none';
  }
  
  validateStep2();
  updateFinalSummary();
}

// دالة تصفية/البحث عن البطاقات ديناميكياً
function filterCityCards() {
  const query = document.getElementById('citySearchInput').value.trim().toLowerCase();
  const cards = document.querySelectorAll('.city-card');
  cards.forEach(card => {
    const cityName = card.dataset.city.toLowerCase();
    if (cityName.includes(query)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// دالة تصفير اختيار المدينة وإعادة تعيين البطاقات وحقول البحث
function resetCitySelection() {
  const searchInput = document.getElementById('citySearchInput');
  if (searchInput) searchInput.value = '';
  
  const cards = document.querySelectorAll('.city-card');
  cards.forEach(card => {
    card.classList.remove('active');
    card.style.display = 'flex';
  });
  
  const preview = document.getElementById('shippingPreview');
  if (preview) preview.style.display = 'none';
  
  const cityEl = document.getElementById('custCity');
  if (cityEl) cityEl.value = '';
}

function onCityChange() {
  const sel = document.getElementById('custCity');
  const selectedOption = sel.options[sel.selectedIndex];
  const city = sel.value;
  const price = city ? Number(selectedOption.dataset.price) : 0;
  
  selectedShippingPrice = price;
  
  const preview = document.getElementById('shippingPreview');
  if (city) {
    preview.style.display = 'block';
    document.getElementById('spCity').textContent = city;
    document.getElementById('spCityPrice').textContent = price === 0 ? 'مجاني 🎉' : `${price.toLocaleString('en-US')} دينار`;
  } else {
    preview.style.display = 'none';
  }
  
  validateStep2();
  // تحديث ملخص الخطوة 3 فوراً
  updateFinalSummary();
}

function updateCheckoutSummary() {
  const container = document.getElementById('checkoutSummaryItems');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<div class="summary-empty"><i class="fa fa-shopping-bag"></i><p>السلة فارغة</p></div>';
    return;
  }
  
  container.innerHTML = cart.map(item => `
    <div class="summary-item">
      <div class="summary-item-img">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}">` : '🛍️'}
      </div>
      <div class="summary-item-info">
        <h4 class="summary-item-name">${item.name}</h4>
        <div class="summary-item-price-qty">
          <span>الكمية: ${item.quantity}</span>
          <span style="margin:0 0.4rem; opacity:0.5">•</span>
          <span>${item.price.toLocaleString('en-US')} د</span>
        </div>
      </div>
      <div class="summary-item-total">
        ${(item.price * item.quantity).toLocaleString('en-US')} د
      </div>
    </div>
  `).join('');
}

function updateFinalSummary() {
  const itemsTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count      = cart.reduce((s, i) => s + i.quantity, 0);
  const city       = document.getElementById('custCity')?.value || '';
  const shipping   = selectedShippingPrice;
  const grandTotal = itemsTotal + shipping;
  
  if (document.getElementById('fsCount')) document.getElementById('fsCount').textContent = count;
  if (document.getElementById('fsItemsTotal')) document.getElementById('fsItemsTotal').textContent = itemsTotal.toLocaleString('en-US') + ' د';
  if (document.getElementById('fsCityName')) document.getElementById('fsCityName').textContent = city || '—';
  if (document.getElementById('fsShipping')) document.getElementById('fsShipping').textContent = shipping === 0 ? 'مجاني 🎉' : `${shipping.toLocaleString('en-US')} د`;
  if (document.getElementById('fsTotal')) document.getElementById('fsTotal').textContent = grandTotal.toLocaleString('en-US') + ' د';

  // Persistent sidebar elements
  if (document.getElementById('sideSubtotal')) document.getElementById('sideSubtotal').textContent = itemsTotal.toLocaleString('en-US') + ' د';
  if (document.getElementById('sideShipping')) {
    if (!city) {
      document.getElementById('sideShipping').textContent = 'يحدد بعد اختيار المدينة';
      document.getElementById('sideShipping').style.fontSize = '0.85rem';
      document.getElementById('sideShipping').style.color = 'var(--txt2)';
    } else {
      document.getElementById('sideShipping').textContent = shipping === 0 ? 'مجاني 🎉' : `${shipping.toLocaleString('en-US')} د`;
      document.getElementById('sideShipping').style.fontSize = '';
      document.getElementById('sideShipping').style.color = '';
    }
  }
  if (document.getElementById('sideTotal')) document.getElementById('sideTotal').textContent = grandTotal.toLocaleString('en-US') + ' د';

  updateCheckoutSummary();
}

function startCheckout() {
  closeCart();
  currentStep = 1;
  selectedShippingPrice = 0;
  updateCheckoutUI();
  document.getElementById('checkoutOverlay').classList.add('open');
  fetchShippingZones(); // جلب المدن عند كل فتح لضمان البيانات الحديثة
  
  // Clear left-over validation classes on open
  ['fgName', 'fgPhone', 'fgAddress', 'fgCity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('valid', 'invalid');
  });
  
  resetCitySelection();
  
  validateStep1();
  validateStep2();
  updateFinalSummary();
}

function closeCheckout() { document.getElementById('checkoutOverlay').classList.remove('open'); }

function nextStep(step) {
  // If moving forward from step 1
  if (currentStep === 1 && step === 2) {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const nameValid = name.length >= 3;
    const phoneValid = /^(09[1-5]|\+2189[1-5]|002189[1-5])[0-9]{7}$/.test(phone);
    
    let hasError = false;
    if (!nameValid) {
      const fg = document.getElementById('fgName');
      fg.classList.add('invalid', 'shake-error');
      setTimeout(() => fg.classList.remove('shake-error'), 400);
      hasError = true;
    }
    if (!phoneValid) {
      const fg = document.getElementById('fgPhone');
      fg.classList.add('invalid', 'shake-error');
      setTimeout(() => fg.classList.remove('shake-error'), 400);
      hasError = true;
    }
    if (hasError) {
      showToast('الرجاء تعبئة بيانات الاسم والهاتف بشكل صحيح لتتمكن من المتابعة', 'error');
      return;
    }
  }
  
  // If moving forward from step 2
  if (currentStep === 2 && step === 3) {
    const city = document.getElementById('custCity').value;
    const cityValid = city !== '';
    
    if (!cityValid) {
      const fg = document.getElementById('fgCity');
      fg.classList.add('invalid', 'shake-error');
      setTimeout(() => fg.classList.remove('shake-error'), 400);
      showToast('الرجاء اختيار المدينة لتحديد سعر التوصيل', 'error');
      return;
    }
  }

  currentStep = step;
  updateCheckoutUI();
}

function updateCheckoutUI() {
  // Update Steps display
  [1,2,3].forEach(s => {
    document.getElementById(`step${s}`).classList.toggle('active', s === currentStep);
    const dot = document.getElementById(`dot${s}`);
    if (s < currentStep) { dot.className = 'step-dot done'; dot.innerHTML = '<i class="fa fa-check"></i>'; }
    else if (s === currentStep) { dot.className = 'step-dot active'; dot.innerHTML = s; }
    else { dot.className = 'step-dot'; dot.innerHTML = s; }
  });
  
  // Update Progress Line
  const progress = ((currentStep - 1) / 2) * 100;
  document.getElementById('stepProgress').style.width = `${progress}%`;
}

// Validation
function validateStep1() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  
  const nameValid = name.length >= 3;
  const phoneValid = /^(09[1-5]|\+2189[1-5]|002189[1-5])[0-9]{7}$/.test(phone);
  
  if (name.length > 0) {
    document.getElementById('fgName').classList.toggle('valid', nameValid);
    document.getElementById('fgName').classList.toggle('invalid', !nameValid);
  } else {
    document.getElementById('fgName').classList.remove('valid', 'invalid');
  }
  
  if (phone.length > 0) {
    document.getElementById('fgPhone').classList.toggle('valid', phoneValid);
    document.getElementById('fgPhone').classList.toggle('invalid', !phoneValid);
  } else {
    document.getElementById('fgPhone').classList.remove('valid', 'invalid');
  }
}

function validateStep2() {
  const addr = document.getElementById('custAddress').value.trim();
  const city = document.getElementById('custCity').value;
  const cityValid = city !== '';
  
  if (addr.length > 0) {
    document.getElementById('fgAddress').classList.add('valid');
    document.getElementById('fgAddress').classList.remove('invalid');
  } else {
    document.getElementById('fgAddress').classList.remove('valid', 'invalid');
  }
  
  if (cityValid) {
    document.getElementById('fgCity').classList.add('valid');
    document.getElementById('fgCity').classList.remove('invalid');
  } else {
    document.getElementById('fgCity').classList.remove('valid', 'invalid');
  }
}

function selectPaymentMethod(method, element) {
  if (method === 'zain') {
    showToast('زين كاش سيتوفر قريباً! الدفع متاح حالياً عند الاستلام فقط.', 'info');
    return;
  }
}

async function submitOrder() {
  const name    = document.getElementById('custName').value.trim();
  const phone   = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const city    = document.getElementById('custCity').value;
  const notes   = document.getElementById('custNotes').value.trim();
  
  const btn = document.getElementById('submitBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> جاري الإرسال...';
  
  try {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, customerName: name, customerPhone: phone, customerAddress: address, city, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    cart = []; saveCart();
    closeCheckout();
    
    // Show success screen with order ID/Number and phone
    showSuccessScreen(data.order?.orderNumber || data.order?._id || '', phone);
    
    // Reset forms
    ['custName','custPhone','custAddress','custNotes'].forEach(id => document.getElementById(id).value = '');
    resetCitySelection();
    selectedShippingPrice = 0;
    document.querySelectorAll('.form-group.valid').forEach(el => el.classList.remove('valid'));
    
    fetchProducts();
  } catch(e) { showToast(e.message, 'error'); }
  
  btn.disabled = false; btn.innerHTML = 'تأكيد وإرسال الطلب';
}

// --- Order Success Screen ---
function showSuccessScreen(orderId, phone) {
  document.getElementById('successOrderId').textContent = orderId || '—';
  const trackBtn = document.querySelector('.success-actions .btn-track');
  if (trackBtn && orderId && phone) {
    trackBtn.href = `/track.html?phone=${encodeURIComponent(phone)}&orderId=${encodeURIComponent(orderId)}`;
  }
  document.getElementById('successOverlay').classList.add('open');
  launchConfetti();
}

function closeSuccess() {
  const el = document.getElementById('successOverlay');
  if (el) el.classList.remove('open');
}

function copyOrderId() {
  const id = document.getElementById('successOrderId').textContent;
  if (!id || id === '—') return;
  navigator.clipboard.writeText(id).then(() => {
    const btn = document.getElementById('copyOrderId');
    btn.innerHTML = '<i class="fa fa-check"></i>';
    btn.style.background = 'var(--green)';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa fa-copy"></i>';
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);
    showToast('تم نسخ رقم الطلب ✔️', 'success');
  }).catch(() => showToast('تعذر النسخ', 'error'));
}

function launchConfetti() {
  const container = document.getElementById('successConfetti');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#fff'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.cssText = [
      `left:${Math.random()*100}%`,
      `background:${colors[Math.floor(Math.random()*colors.length)]}`,
      `animation-delay:${Math.random()*1.5}s`,
      `animation-duration:${2+Math.random()*2}s`,
      `width:${6+Math.random()*6}px`,
      `height:${6+Math.random()*6}px`,
      `border-radius:${Math.random()>0.5?'50%':'2px'}`
    ].join(';');
    container.appendChild(p);
  }
}