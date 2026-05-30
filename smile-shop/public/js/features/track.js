// public/js/features/track.js

const statusLabels = {
  pending:    { ar: 'معلق',          icon: 'fa-clock' },
  processing: { ar: 'قيد التجهيز',   icon: 'fa-cog' },
  shipped:    { ar: 'في الطريق',      icon: 'fa-truck' },
  delivered:  { ar: 'تم التوصيل',    icon: 'fa-check-circle' },
  cancelled:  { ar: 'ملغي',          icon: 'fa-times-circle' }
};

const timelineSteps = ['pending','processing','shipped','delivered'];

function getStepState(orderStatus, step) {
  if (orderStatus === 'cancelled') return '';
  const orderIdx = timelineSteps.indexOf(orderStatus);
  const stepIdx  = timelineSteps.indexOf(step);
  if (stepIdx < orderIdx)  return 'done';
  if (stepIdx === orderIdx) return 'active';
  return '';
}

function renderTimeline(status) {
  if (status === 'cancelled') {
    return `<div style="text-align:center;color:var(--red);padding:1rem 0;font-weight:600"><i class="fa fa-times-circle" style="margin-left:.4rem"></i>تم إلغاء هذا الطلب</div>`;
  }
  return `
    <div class="timeline">
      <div class="step ${getStepState(status,'pending')}">
        <div class="step-dot"><i class="fa fa-clock"></i></div>
        <div class="step-label">معلق</div>
      </div>
      <div class="step ${getStepState(status,'processing')}">
        <div class="step-dot"><i class="fa fa-cog"></i></div>
        <div class="step-label">قيد التجهيز</div>
      </div>
      <div class="step ${getStepState(status,'shipped')}">
        <div class="step-dot"><i class="fa fa-truck"></i></div>
        <div class="step-label">في الطريق</div>
      </div>
      <div class="step ${getStepState(status,'delivered')}">
        <div class="step-dot"><i class="fa fa-check"></i></div>
        <div class="step-label">تم التوصيل</div>
      </div>
    </div>`;
}

function renderOrder(o, index) {
  const sl   = statusLabels[o.status] || { ar: o.status, icon: 'fa-circle' };
  const date = new Date(o.createdAt).toLocaleDateString('ar-LY', { year:'numeric', month:'long', day:'numeric', numberingSystem: 'latn' });
  const displayId = escapeHTML(o.orderNumber || String(o._id).slice(-8).toUpperCase());

  return `
    <div class="order-card">
      <div class="order-header" onclick="toggleOrder('body-${index}')">
        <div>
          <div style="font-weight:700">طلب #${displayId}</div>
          <div class="order-date">${date}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.8rem">
          <span class="badge ${o.status}"><i class="fa ${sl.icon}" style="margin-left:.3rem"></i>${sl.ar}</span>
          <i class="fa fa-chevron-down" style="color:var(--txt2);font-size:.8rem"></i>
        </div>
      </div>
      <div class="order-body" id="body-${index}">
        ${renderTimeline(o.status)}
        <table class="items-table">
          <thead><tr><th>المنتج</th><th>السعر</th><th style="text-align:center">الكمية</th><th>الإجمالي</th></tr></thead>
          <tbody>
            ${o.items.map(i => `
              <tr>
                <td>${escapeHTML(i.name)}</td>
                <td>${i.price.toLocaleString('en-US')} د</td>
                <td style="text-align:center">${i.quantity}</td>
                <td>${(i.price * i.quantity).toLocaleString('en-US')} د</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="total-row">
          <span>الإجمالي الكلي</span>
          <span>${o.totalPrice.toLocaleString('en-US')} دينار</span>
        </div>
        ${o.notes ? `<p style="margin-top:.8rem;font-size:.85rem;color:var(--txt2)"><strong>ملاحظات:</strong> ${escapeHTML(o.notes)}</p>` : ''}
        ${o.customerAddress ? `<p style="margin-top:.4rem;font-size:.85rem;color:var(--txt2)"><strong>العنوان:</strong> ${escapeHTML(o.customerAddress)}</p>` : ''}
        <div style="display:flex; justify-content:center; margin-top: 1.2rem; border-top: 1px solid var(--border); padding-top: 1rem;">
          <a href="${generateWhatsAppLink((window.APP_CONFIG && window.APP_CONFIG.WHATSAPP_NUMBER) || '218910000000', `مرحباً متجر Smile Shop، أود الاستفسار عن حالة طلبي رقم *${displayId}* (الحالة الحالية للطلب: *${sl.ar}*)`)}" target="_blank" class="btn-whatsapp-track">
             <i class="fab fa-whatsapp" style="margin-left:0.5rem"></i> استفسار عن الطلب عبر واتساب
          </a>
        </div>
      </div>
    </div>`;
}

function toggleOrder(id) {
  const el = document.getElementById(id);
  el.classList.toggle('open');
}

async function trackOrders() {
  const phone = document.getElementById('phoneInput').value.trim();
  const orderId = document.getElementById('orderIdInput').value.trim();
  const card = document.querySelector('.search-card');
  
  if (!phone || !orderId) {
    if (card) {
      card.classList.add('shake-error');
      setTimeout(() => card.classList.remove('shake-error'), 400);
    }
    showToast('يرجى إدخال رقم الهاتف ورقم الطلب', 'error');
    return;
  }

  const btn = document.getElementById('trackBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

  const section  = document.getElementById('resultsSection');
  const content  = document.getElementById('resultsContent');
  section.style.display = 'block';
  content.innerHTML = '<div class="spinner"></div>';

  try {
    const res  = await fetch(`${API}/orders/track?phone=${encodeURIComponent(phone)}&orderId=${encodeURIComponent(orderId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const orders = data.orders || [];
    if (!orders.length) {
      if (card) {
        card.classList.add('shake-error');
        setTimeout(() => card.classList.remove('shake-error'), 400);
      }
      content.innerHTML = `
        <div class="empty">
          <i class="fa fa-box-open"></i>
          <p>لا توجد طلبات مرتبطة بهذا الرقم</p>
          <p style="font-size:.85rem;margin-top:.5rem">تأكد من صحة الرقم المستخدم عند الطلب ورقم الهاتف</p>
        </div>`;
      showToast('لم يتم العثور على أي طلبات مطابقة', 'error');
    } else {
      content.innerHTML = `<div class="results-title">وجدنا ${orders.length} طلب لرقمك</div>` +
        orders.map((o, i) => renderOrder(o, i)).join('');
      // افتح أول طلب تلقائياً
      document.getElementById('body-0')?.classList.add('open');
      showToast('تم تحميل بيانات الطلب بنجاح', 'success');
    }
  } catch(e) {
    if (card) {
      card.classList.add('shake-error');
      setTimeout(() => card.classList.remove('shake-error'), 400);
    }
    content.innerHTML = `<div class="empty"><i class="fa fa-exclamation-circle"></i><p>${e.message}</p></div>`;
    showToast(e.message || 'حدث خطأ أثناء التتبع', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-search"></i> تتبع';
  }
}

// استعلام تلقائي عند فتح الصفحة بمعلمات الرابط
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const phone = params.get('phone');
  const orderId = params.get('orderId');
  if (phone) document.getElementById('phoneInput').value = phone;
  if (orderId) document.getElementById('orderIdInput').value = orderId;
  if (phone && orderId) {
    trackOrders();
  }
});
