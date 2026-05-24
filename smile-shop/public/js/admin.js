const API = (window.APP_CONFIG && window.APP_CONFIG.API_URL) || 'http://localhost:3000/api';
let token = localStorage.getItem('smile_admin_token') || '';
let revenueChart = null;
let monthlyChart = null;

let prodPage = 1;
let prodTotalPages = 1;
let ordPage = 1;
let ordTotalPages = 1;

const statLabels = {pending:'معلق',processing:'قيد التجهيز',shipped:'في الطريق',delivered:'تم التوصيل',cancelled:'ملغي'};

function authH(){ return {Authorization:`Bearer ${token}`,'Content-Type':'application/json'}; }

// ── Global Fetch Interceptor ──────────────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async function() {
    const response = await originalFetch.apply(this, arguments);
    if (response.status === 401 || response.status === 403) {
        if(token) {
            doLogout();
            toast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً', 'e');
        }
    }
    return response;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
async function doLogin(){
  const username = document.getElementById('uname').value.trim();
  const password = document.getElementById('upass').value.trim();
  try {
    const res = await fetch(`${API}/admin/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const d = await res.json();
    if(!res.ok) throw new Error(d.message);
    token = d.token;
    localStorage.setItem('smile_admin_token', token);
    localStorage.setItem('smile_admin_role', d.role || 'editor');
    showDashboard();
    toast(d.message,'s');
  } catch(e){ toast(e.message,'e'); }
}

function doLogout(){
  token=''; 
  localStorage.removeItem('smile_admin_token');
  localStorage.removeItem('smile_admin_role');
  document.getElementById('dashboard').style.display='none';
  document.getElementById('loginPage').style.display='flex';
}

function showDashboard(){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('dashboard').style.display='block';
  
  const role = localStorage.getItem('smile_admin_role') || 'editor';
  const sbAdmins = document.getElementById('sb-admins');
  if (sbAdmins) {
    if (role === 'owner') {
      sbAdmins.style.display = 'flex';
    } else {
      sbAdmins.style.display = 'none';
    }
  }
  
  loadStats(); loadProducts(); loadOrders();
}

if(token){ showDashboard(); }

// ── Tabs ──────────────────────────────────────────────────────────────────────
function showTab(name, el){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(s=>s.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  el.classList.add('active');
  if (name === 'shipping') loadShippingZones();
  if (name === 'admins') loadAdmins();
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats(){
  try {
    const res = await fetch(`${API}/admin/stats`,{headers:authH()});
    if(res.status === 401) return doLogout();
    const d = await res.json();
    document.getElementById('s-products').textContent = d.totalProducts;
    document.getElementById('s-orders').textContent = d.totalOrders;
    document.getElementById('s-revenue').textContent = (d.totalRevenue||0).toLocaleString('en-US')+'د';
    document.getElementById('s-pending').textContent = d.pendingOrders;
    drawChart(d.last7Days||[]);
  } catch(e){ console.error(e); }
}

function drawChart(data){
  const ctx = document.getElementById('revenueChart').getContext('2d');
  if(revenueChart) revenueChart.destroy();
  revenueChart = new Chart(ctx,{
    type:'bar',
    data:{labels:data.map(d=>d.label),datasets:[{label:'الإيرادات',data:data.map(d=>d.revenue),backgroundColor:'rgba(124,58,237,.5)',borderColor:'#7c3aed',borderWidth:2,borderRadius:8}]},
    options:{plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#94a3b8'}},y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#94a3b8'}}}}
  });
}

function drawMonthlyChart(data){
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx,{
    type:'line',
    data:{labels:data.map(d=>d.label),datasets:[{label:'الإيرادات',data:data.map(d=>d.revenue),backgroundColor:'rgba(217,70,239,.15)',borderColor:'#d946ef',borderWidth:2,borderRadius:8,fill:true,tension:.4,pointBackgroundColor:'#d946ef'}]},
    options:{plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#94a3b8'}},y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#94a3b8'}}}}
  });
}

function renderTopProducts(data){
  const el = document.getElementById('topProductsList');
  if(!data.length){ el.innerHTML = '<p style="color:var(--txt2);font-size:.9rem">لا توجد بيانات كافية بعد</p>'; return; }
  el.innerHTML = data.map((p,i) => `
    <div style="display:flex;align-items:center;gap:.8rem;padding:.6rem 0;border-bottom:1px solid var(--border)">
      <span style="font-size:1.2rem;font-weight:800;color:var(--purple);min-width:24px">${i+1}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.9rem">${p.name}</div>
        <div style="font-size:.8rem;color:var(--txt2)">مبيعات: ${p.totalQty} | إيراد: ${(p.totalRevenue||0).toLocaleString('en-US')} د</div>
      </div>
      <div style="width:60px;background:rgba(255,255,255,.05);border-radius:4px;height:6px;overflow:hidden">
        <div style="width:${Math.round((p.totalQty/data[0].totalQty)*100)}%;height:100%;background:var(--grad)"></div>
      </div>
    </div>`).join('');
}

// ── Products ──────────────────────────────────────────────────────────────────
async function loadProducts(){
  try {
    const res = await fetch(`${API}/products?page=${prodPage}&limit=10`);
    const result = await res.json();
    const products = result.data || result;
    
    if (result.pagination) {
        prodTotalPages = result.pagination.totalPages || 1;
        document.getElementById('prodPageInfo').textContent = `صفحة ${prodPage} من ${prodTotalPages}`;
        document.getElementById('prodPrevBtn').disabled = prodPage <= 1;
        document.getElementById('prodNextBtn').disabled = prodPage >= prodTotalPages;
    }

    const tb = document.getElementById('prodTbl');
    if(!products.length){ tb.innerHTML='<tr><td colspan="6" class="no-data">لا توجد منتجات بعد</td></tr>'; return; }
    tb.innerHTML = products.map(p=>`
      <tr>
        <td><div class="prod-img">${p.imageUrl?`<img src="${p.imageUrl}" style="width:40px;height:40px;border-radius:8px;object-fit:cover" onerror="this.parentElement.innerHTML='🛍️'">`:'🛍️'}</div></td>
        <td style="font-weight:600">${p.name}</td>
        <td><span class="badge processing">${p.category||'عام'}</span></td>
        <td style="color:#9f67ff;font-weight:700">${p.price.toLocaleString('en-US')} د</td>
        <td style="color:${p.stock<5?'#f59e0b':'#10b981'}">${p.stock}</td>
        <td>
          <button class="act-btn edit" onclick='openProdModal(${JSON.stringify(p)})'><i class="fa fa-edit"></i></button>
          <button class="act-btn del" onclick="delProduct('${p._id}','${p.name}')"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch(e){ toast('خطأ في تحميل المنتجات','e'); }
}

function chgProdPage(delta) {
    prodPage += delta;
    if (prodPage < 1) prodPage = 1;
    loadProducts();
}

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        document.getElementById('pFileName').textContent = input.files[0].name;
    } else {
        document.getElementById('pFileName').textContent = 'انقر لاختيار صورة للرفع';
    }
}

function openProdModal(p=null){
  document.getElementById('modalTitle').textContent = p ? 'تعديل منتج' : 'إضافة منتج';
  document.getElementById('editId').value = p?p._id:'';
  document.getElementById('pName').value = p?p.name:'';
  document.getElementById('pDesc').value = p?p.description:'';
  document.getElementById('pCat').value = p?p.category:'';
  document.getElementById('pPrice').value = p?p.price:'';
  document.getElementById('pStock').value = p?p.stock:'';
  document.getElementById('pImgUrl').value = p?p.imageUrl:'';
  document.getElementById('pImgLink').value = p && p.imageUrl && p.imageUrl.startsWith('http') ? p.imageUrl : '';
  
  document.getElementById('pFile').value = '';
  document.getElementById('pFileName').textContent = p && p.imageUrl && !p.imageUrl.startsWith('http') ? 'ملف مرفوع مسبقاً' : 'انقر لاختيار صورة للرفع';
  
  document.getElementById('prodModal').classList.add('open');
}
function closeProdModal(){ document.getElementById('prodModal').classList.remove('open'); }

async function saveProd(){
  const btn = document.getElementById('saveProdBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';

  try {
      const id = document.getElementById('editId').value;
      const fileInput = document.getElementById('pFile');
      let finalImageUrl = document.getElementById('pImgLink').value.trim() || document.getElementById('pImgUrl').value;

      // 1. Upload File if selected
      if (fileInput.files && fileInput.files[0]) {
          const formData = new FormData();
          formData.append('image', fileInput.files[0]);
          
          const upRes = await fetch(`${API}/upload`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData
          });
          const upData = await upRes.json();
          if (!upRes.ok) throw new Error(upData.message || 'فشل رفع الصورة');
          finalImageUrl = upData.imageUrl;
      }

      // 2. Save Product
      const body = {
        name:document.getElementById('pName').value.trim(),
        description:document.getElementById('pDesc').value.trim(),
        category:document.getElementById('pCat').value.trim()||'عام',
        price:+document.getElementById('pPrice').value,
        stock:+document.getElementById('pStock').value,
        imageUrl: finalImageUrl
      };
      
      const url = id ? `${API}/products/${id}` : `${API}/products`;
      const res = await fetch(url,{method:id?'PUT':'POST',headers:authH(),body:JSON.stringify(body)});
      const d = await res.json();
      if(!res.ok) throw new Error(d.message);
      
      toast(id?'تم تحديث المنتج بنجاح':'تمت إضافة المنتج بنجاح','s');
      closeProdModal(); loadProducts(); loadStats();
  } catch(e){ 
      toast(e.message,'e'); 
  } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-save" style="margin-left:.5rem"></i>حفظ المنتج';
  }
}

async function delProduct(id, name){
  if(!confirm(`هل تريد حذف "${name}"؟`)) return;
  try {
    const res = await fetch(`${API}/products/${id}`,{method:'DELETE',headers:authH()});
    const d = await res.json();
    if(!res.ok) throw new Error(d.message);
    toast(d.message,'s'); loadProducts(); loadStats();
  } catch(e){ toast(e.message,'e'); }
}

// ── Orders ────────────────────────────────────────────────────────────────────
async function loadOrders(){
  try {
    const res = await fetch(`${API}/orders?page=${ordPage}&limit=10`,{headers:authH()});
    const result = await res.json();
    const orders = result.data || result;
    
    if (result.pagination) {
        ordTotalPages = result.pagination.totalPages || 1;
        document.getElementById('ordPageInfo').textContent = `صفحة ${ordPage} من ${ordTotalPages}`;
        document.getElementById('ordPrevBtn').disabled = ordPage <= 1;
        document.getElementById('ordNextBtn').disabled = ordPage >= ordTotalPages;
    }

    const tb = document.getElementById('orderTbl');
    if(!orders.length){ tb.innerHTML='<tr><td colspan="8" class="no-data">لا توجد طلبات بعد</td></tr>'; return; }
    
    const role = localStorage.getItem('smile_admin_role') || 'editor';
    tb.innerHTML = orders.map(o=>`
      <tr>
        <td style="font-weight:600">${o.customerName}</td>
        <td style="color:var(--txt2)">${o.customerPhone}</td>
        <td><span class="badge processing">${o.city || '—'}</span></td>
        <td><button class="act-btn edit" onclick="openOrderModal('${encodeURIComponent(JSON.stringify(o))}')"><i class="fa fa-eye"></i> تفاصيل</button></td>
        <td style="color:#9f67ff;font-weight:700">${o.totalPrice.toLocaleString('en-US')} د</td>
        <td>
          <select class="status-sel" onchange="updateStatus('${o._id}',this.value)">
            ${['pending','processing','shipped','delivered','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statLabels[s]}</option>`).join('')}
          </select>
        </td>
        <td style="color:var(--txt2);font-size:.8rem">${new Date(o.createdAt).toLocaleDateString('en-US')}</td>
        <td>${role === 'owner' ? `<button class="act-btn del" onclick="delOrder('${o._id}')"><i class="fa fa-trash"></i></button>` : '—'}</td>
      </tr>`).join('');
  } catch(e){ toast('خطأ في تحميل الطلبات','e'); }
}

function chgOrdPage(delta) {
    ordPage += delta;
    if (ordPage < 1) ordPage = 1;
    loadOrders();
}

async function updateStatus(id, status){
  try {
    const res = await fetch(`${API}/orders/${id}/status`,{method:'PUT',headers:authH(),body:JSON.stringify({status})});
    if(!res.ok) throw new Error((await res.json()).message);
    toast('تم تحديث الحالة','s'); loadStats();
  } catch(e){ toast(e.message,'e'); }
}

async function delOrder(id){
  if(!confirm('هل تريد حذف هذا الطلب؟')) return;
  try {
    const res = await fetch(`${API}/orders/${id}`,{method:'DELETE',headers:authH()});
    if(!res.ok) throw new Error((await res.json()).message);
    toast('تم حذف الطلب','s'); loadOrders(); loadStats();
  } catch(e){ toast(e.message,'e'); }
}

function openOrderModal(oStr){
  const o = JSON.parse(decodeURIComponent(oStr));
  const html = `
    <div style="margin-bottom:1rem; font-size: 0.95rem;">
      <p><strong>رقم الطلب:</strong> ${o.orderNumber || o._id}</p>
      <p><strong>العميل:</strong> ${o.customerName}</p>
      <p><strong>الهاتف:</strong> ${o.customerPhone}</p>
      <p><strong>المدينة:</strong> ${o.city || '—'}</p>
      <p><strong>العنوان:</strong> ${o.customerAddress}</p>
      <p><strong>التوصيل:</strong> ${(o.shippingPrice || 0) === 0 ? 'مجاني' : (o.shippingPrice).toLocaleString('en-US') + ' د'}</p>
      <p><strong>تاريخ الطلب:</strong> ${new Date(o.createdAt).toLocaleString('en-US')}</p>
      <p><strong>الملاحظات:</strong> ${o.notes || 'لا يوجد'}</p>
    </div>
    <table style="width:100%; border:1px solid var(--border); margin-bottom:1rem; border-collapse:collapse; font-size: 0.9rem;">
      <thead>
        <tr style="background:rgba(255,255,255,0.05)">
           <th style="padding:.5rem; border:1px solid var(--border); text-align: right;">المنتج</th>
           <th style="padding:.5rem; border:1px solid var(--border); text-align: right;">السعر</th>
           <th style="padding:.5rem; border:1px solid var(--border); text-align: center;">الكمية</th>
           <th style="padding:.5rem; border:1px solid var(--border); text-align: right;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${o.items.map(i => `
          <tr>
            <td style="padding:.5rem; border:1px solid var(--border)">${i.name}</td>
            <td style="padding:.5rem; border:1px solid var(--border)">${i.price} د</td>
            <td style="padding:.5rem; border:1px solid var(--border); text-align: center;">${i.quantity}</td>
            <td style="padding:.5rem; border:1px solid var(--border)">${(i.price * i.quantity).toLocaleString('en-US')} د</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <h3 style="color:var(--purple); text-align: left;">الإجمالي الكلي: ${o.totalPrice.toLocaleString('en-US')} دينار</h3>
  `;
  document.getElementById('orderModalBody').innerHTML = html;
  document.getElementById('orderModal').classList.add('open');
}
function closeOrderModal(){ document.getElementById('orderModal').classList.remove('open'); }

async function exportCSV() {
    try {
        toast('جاري تجهيز الملف...', 's');
        const status = document.getElementById('exportStatus').value;
        const from   = document.getElementById('exportFrom').value;
        const to     = document.getElementById('exportTo').value;
        let url = `${API}/orders/export?status=${status}`;
        if(from) url += `&from=${from}`;
        if(to)   url += `&to=${to}`;
        const res = await fetch(url, { headers: authH() });
        if (!res.ok) throw new Error('فشل التصدير');
        const blob = await res.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(objUrl);
        toast('تم تصدير الملف بنجاح', 's');
    } catch(e) { toast(e.message, 'e'); }
}

// ── Polling for New Orders ────────────────────────────────────────────────────
let lastCheckTime = Date.now();
setInterval(async () => {
    if(!token || document.getElementById('dashboard').style.display === 'none') return;
    try {
        const res = await fetch(`${API}/orders/check-new?lastCheck=${lastCheckTime}`, { headers: authH() });
        if (res.ok) {
            const data = await res.json();
            if (data.newOrders > 0) {
                toast(`لديك ${data.newOrders} طلب جديد!`, 's');
                loadStats();
                if(document.getElementById('tab-orders').classList.contains('active')) {
                   loadOrders();
                }
            }
        }
    } catch(e) {}
    lastCheckTime = Date.now();
}, 20000); // كل 20 ثانية

// ── Shipping Zones CRUD ───────────────────────────────────────────────────────
async function loadShippingZones() {
  try {
    const res = await fetch(`${API}/shipping`);
    const zones = await res.json();
    const tb = document.getElementById('shippingTbl');
    if (!zones.length) { tb.innerHTML = '<tr><td colspan="3" class="no-data">لا توجد مناطق بعد — أضف مدينتك الأولى</td></tr>'; return; }
    tb.innerHTML = zones.map(z => `
      <tr>
        <td style="font-weight:600">${z.city}</td>
        <td style="color:${z.price===0?'var(--green)':'#9f67ff'};font-weight:700">${z.price === 0 ? 'مجاني 🎉' : z.price.toLocaleString('en-US') + ' د'}</td>
        <td>
          <button class="act-btn edit" onclick='openShippingModal(${JSON.stringify(z)})'><i class="fa fa-edit"></i></button>
          <button class="act-btn del" onclick="delShippingZone('${z._id}','${z.city}')"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch(e) { toast('خطأ في تحميل مناطق الشحن', 'e'); }
}

function openShippingModal(z = null) {
  document.getElementById('shippingModalTitle').textContent = z ? 'تعديل منطقة' : 'إضافة مدينة';
  document.getElementById('shippingEditId').value = z ? z._id : '';
  document.getElementById('sCity').value  = z ? z.city  : '';
  document.getElementById('sPrice').value = z !== null && z.price !== undefined ? z.price : '';
  document.getElementById('shippingModal').classList.add('open');
}
function closeShippingModal() { document.getElementById('shippingModal').classList.remove('open'); }

async function saveShippingZone() {
  const btn = document.getElementById('saveShippingBtn');
  btn.disabled = true; btn.textContent = 'جاري الحفظ...';
  try {
    const id    = document.getElementById('shippingEditId').value;
    const city  = document.getElementById('sCity').value.trim();
    const price = document.getElementById('sPrice').value;
    if (!city) throw new Error('اسم المدينة مطلوب');
    if (price === '') throw new Error('سعر التوصيل مطلوب');
    const url    = id ? `${API}/shipping/${id}` : `${API}/shipping`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authH(), body: JSON.stringify({ city, price: Number(price) }) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);
    toast(id ? 'تم تحديث المنطقة بنجاح' : 'تمت إضافة المدينة بنجاح', 's');
    closeShippingModal();
    loadShippingZones();
  } catch(e) { toast(e.message, 'e'); }
  btn.disabled = false; btn.innerHTML = '<i class="fa fa-save" style="margin-left:.5rem"></i>حفظ المنطقة';
}

async function delShippingZone(id, city) {
  if (!confirm(`حذف منطقة "${city}"?`)) return;
  try {
    const res = await fetch(`${API}/shipping/${id}`, { method: 'DELETE', headers: authH() });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message);
    toast(d.message, 's'); loadShippingZones();
  } catch(e) { toast(e.message, 'e'); }
}

function toast(msg, type='s'){
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa fa-${type==='s'?'check-circle':'exclamation-circle'}"></i>${msg}`;
  c.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// ── Admin Management CRUD (Owner Only) ─────────────────────────────────────────
async function loadAdmins() {
  try {
    const res = await fetch(`${API}/admin/admins`, { headers: authH() });
    if (!res.ok) throw new Error((await res.json()).message || 'فشل تحميل المشرفين');
    const admins = await res.json();
    const tb = document.getElementById('adminTbl');
    if (!admins.length) { tb.innerHTML = '<tr><td colspan="4" class="no-data">لا يوجد مشرفين</td></tr>'; return; }
    
    tb.innerHTML = admins.map(a => `
      <tr>
        <td style="font-weight:600">${a.username}</td>
        <td><span class="badge ${a.role === 'owner' ? 'delivered' : 'processing'}">${a.role === 'owner' ? 'مالك (Owner)' : 'محرر (Editor)'}</span></td>
        <td style="color:var(--txt2);font-size:.8rem">${new Date(a.createdAt).toLocaleDateString('en-US')}</td>
        <td>
          <button class="act-btn edit" onclick='openAdminModal(${JSON.stringify(a)})'><i class="fa fa-edit"></i></button>
          <button class="act-btn del" onclick="delAdmin('${a._id}','${a.username}')"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) { toast(e.message, 'e'); }
}

function openAdminModal(a = null) {
  document.getElementById('adminModalTitle').textContent = a ? 'تعديل حساب مشرف' : 'إضافة مشرف جديد';
  document.getElementById('adminEditId').value = a ? a._id : '';
  document.getElementById('aUsername').value = a ? a.username : '';
  document.getElementById('aPassword').value = '';
  document.getElementById('aRole').value = a ? a.role : 'editor';
  
  if (a) {
    document.getElementById('aPasswordRequiredHint').style.display = 'none';
    document.getElementById('aPasswordHelp').style.display = 'block';
  } else {
    document.getElementById('aPasswordRequiredHint').style.display = 'inline';
    document.getElementById('aPasswordHelp').style.display = 'none';
  }
  
  document.getElementById('adminModal').classList.add('open');
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('open');
}

async function saveAdmin() {
  const btn = document.getElementById('saveAdminBtn');
  btn.disabled = true; btn.textContent = 'جاري الحفظ...';
  try {
    const id = document.getElementById('adminEditId').value;
    const username = document.getElementById('aUsername').value.trim();
    const password = document.getElementById('aPassword').value.trim();
    const role = document.getElementById('aRole').value;
    
    if (!username) throw new Error('اسم المستخدم مطلوب');
    if (!id && !password) throw new Error('كلمة المرور مطلوبة للمشرف الجديد');
    if (password && password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 رموز على الأقل');
    
    const body = { username, role };
    if (password) body.password = password;
    
    const url = id ? `${API}/admin/admins/${id}` : `${API}/admin/admins`;
    const method = id ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: authH(),
      body: JSON.stringify(body)
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'فشل الحفظ');
    
    toast(id ? 'تم تحديث المشرف بنجاح' : 'تم إضافة المشرف بنجاح', 's');
    closeAdminModal();
    loadAdmins();
  } catch (e) {
    toast(e.message, 'e');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-save" style="margin-left:.5rem"></i>حفظ حساب المشرف';
  }
}

async function delAdmin(id, name) {
  if (!confirm(`هل أنت متأكد من حذف المشرف "${name}"؟`)) return;
  try {
    const res = await fetch(`${API}/admin/admins/${id}`, { method: 'DELETE', headers: authH() });
    const d = await res.json();
    if (!res.ok) throw new Error(d.message || 'فشل الحذف');
    toast(d.message, 's');
    loadAdmins();
  } catch (e) {
    toast(e.message, 'e');
  }
}