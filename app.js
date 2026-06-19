// ModySOLE Admin Dashboard Client Script

const API_URL = 'https://modysole-backend.onrender.com';
let socket = null;

// Predefined 4-digit security codes for merchant dashboard access
const SECURITY_CODES = [
  'MS-SECURE-1001',
  'MS-SECURE-2002',
  'MS-SECURE-3003',
  'MS-SECURE-4004'
];

// State Variables
let orders = [];
let selectedOrderId = null;
let currentFilter = 'all';

// DOM Elements
const connectionStatus = document.getElementById('connection-status');
const ordersList = document.getElementById('orders-list');
const filterTabs = document.getElementById('filter-tabs');
const orderSearch = document.getElementById('order-search');

// Detail Panel Elements
const emptyDetails = document.getElementById('empty-details');
const detailsCard = document.getElementById('details-card');
const detailsOrderDate = document.getElementById('details-order-date');
const detailsOrderId = document.getElementById('details-order-id');
const detailsStatusBadge = document.getElementById('details-status-badge');
const detailsCustomerName = document.getElementById('details-customer-name');
const detailsCustomerEmail = document.getElementById('details-customer-email');
const detailsShippingAddress = document.getElementById('details-shipping-address');
const detailsItemsList = document.getElementById('details-items-list');
const detailsSubtotal = document.getElementById('details-subtotal');
const detailsShipping = document.getElementById('details-shipping');
const detailsDiscount = document.getElementById('details-discount');
const detailsFeeRow = document.getElementById('details-fee-row');
const detailsFee = document.getElementById('details-fee');
const detailsTotal = document.getElementById('details-total');
const detailsTimeline = document.getElementById('details-timeline');

// Admin Actions Elements
const btnFastForward = document.getElementById('btn-fast-forward');
const fastForwardMinutes = document.getElementById('fast-forward-minutes');

// Stats Elements
const statTotalOrders = document.getElementById('stat-total-orders');
const statPendingOrders = document.getElementById('stat-pending-orders');
const statDeliveredOrders = document.getElementById('stat-delivered-orders');
const statRevenue = document.getElementById('stat-revenue');

// ─── Socket.IO Listeners & Dashboard Bootstrapper ───────────

function startDashboard() {
  if (typeof io !== 'undefined') {
    // Initialize Socket.IO connection forcing WebSocket transport directly
    socket = io(API_URL, { transports: ['websocket'] });
    let pingIntervalId = null;

    socket.on('connect', () => {
      console.log('⚡ Connected to live order feed server.');
      connectionStatus.innerHTML = `
        <span class="status-dot dot-online"></span>
        <span class="status-text">Connected to Live Feed</span>
      `;

      // Start real-time ping latency check every 3 seconds
      if (pingIntervalId) clearInterval(pingIntervalId);
      pingIntervalId = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit('ping_latency', Date.now());
        }
      }, 3000);
    });

    // Listen for latency pong responses
    socket.on('pong_latency', (sentTime) => {
      const latency = Date.now() - sentTime;
      const textEl = connectionStatus.querySelector('.status-text');
      if (textEl) {
        textEl.innerText = `Connected to Live Feed (${latency}ms)`;
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server.');
      connectionStatus.innerHTML = `
        <span class="status-dot dot-offline"></span>
        <span class="status-text">Connection Offline</span>
      `;
      if (pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
      }
    });

    // Listen for global order updates emitted by the server
    socket.on('order_update', (data) => {
      console.log('🔔 Received Live Order Update:', data);
      
      // Find the updated order in our local list and update its status
      const order = orders.find(o => o.id === data.orderId);
      if (order) {
        order.status = data.status;
        
        // Play a soft notification chime or visual effect if desired
        console.log(`Order ${data.orderId} updated to ${data.status}`);
      }
      
      // Refresh data from database to get full event history and updated totals
      fetchOrders(false);
    });
  } else {
    console.warn('⚠️ Socket.IO library is not loaded. Dashboard running in polling fallback mode.');
    connectionStatus.innerHTML = `
      <span class="status-dot dot-offline" style="background-color: var(--color-pending);"></span>
      <span class="status-text">Live Feed Offline (Polling Mode)</span>
    `;
  }

  // Fetch orders immediately
  fetchOrders();

  // Poll in background every 15 seconds as a fallback
  setInterval(() => fetchOrders(true), 15000);
}

// ─── API Integrations ──────────────────────────────────────────

async function fetchOrders(updateSelected = true) {
  try {
    const res = await fetch(`${API_URL}/api/orders/all-admin`);
    const data = await res.json();
    orders = data.orders || [];
    
    updateStats();
    renderOrdersList();
    
    if (selectedOrderId && updateSelected) {
      renderDetails(selectedOrderId);
    }
  } catch (err) {
    console.error('Error fetching orders:', err);
    ordersList.innerHTML = `
      <div class="no-orders-state">
        <i class="fa-solid fa-triangle-exclamation text-danger"></i>
        <p>Failed to load orders. Make sure the backend API server is running.</p>
      </div>
    `;
  }
}



async function fastForwardOrder(orderId, minutes) {
  try {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/fast-forward`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes })
    });
    const result = await res.json();
    if (result.success) {
      console.log(`Order fast forwarded successfully:`, result);
      // Wait a moment for scheduler database updates to write before refreshing
      setTimeout(() => fetchOrders(true), 500);
    } else {
      alert(`Error during fast forward: ${result.error}`);
    }
  } catch (err) {
    console.error('Error during fast forward:', err);
  }
}

// ─── UI Rendering Logic ────────────────────────────────────────

function updateStats() {
  statTotalOrders.innerText = orders.length;
  
  const pendingCount = orders.filter(o => 
    ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery'].includes(o.status)
  ).length;
  statPendingOrders.innerText = pendingCount;
  
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  statDeliveredOrders.innerText = deliveredCount;
  
  // Calculate total revenue from non-cancelled orders
  const revenueTotal = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  
  statRevenue.innerText = `₹${revenueTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function renderOrdersList() {
  ordersList.innerHTML = '';
  
  const searchVal = orderSearch.value.toLowerCase().trim();
  
  const filtered = orders.filter(o => {
    // Filter by Tab
    if (currentFilter !== 'all') {
      if (currentFilter === 'pending') {
        // Pending tab handles both 'pending' and 'confirmed' states
        if (o.status !== 'pending' && o.status !== 'confirmed') return false;
      } else {
        if (o.status !== currentFilter) return false;
      }
    }
    
    // Filter by Search Query
    if (searchVal) {
      const matchId = o.id.toLowerCase().includes(searchVal);
      const matchName = o.user_name && o.user_name.toLowerCase().includes(searchVal);
      const matchEmail = o.user_email && o.user_email.toLowerCase().includes(searchVal);
      return matchId || matchName || matchEmail;
    }
    
    return true;
  });

  if (filtered.length === 0) {
    ordersList.innerHTML = `
      <div class="no-orders-state">
        <i class="fa-solid fa-box-open"></i>
        <p>No matching orders found.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(o => {
    const card = document.createElement('div');
    card.className = `order-card ${selectedOrderId === o.id ? 'selected' : ''}`;
    card.setAttribute('data-id', o.id);
    
    const formattedDate = new Date(o.created_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsSummary = o.items ? o.items.map(item => `${item.quantity}x ${item.product_name}`).join(', ') : 'No items';

    card.innerHTML = `
      <div class="order-card-header">
        <div>
          <div class="order-card-id">#${o.id.substring(0, 8)}...</div>
          <div class="order-card-date">${formattedDate}</div>
        </div>
        <span class="status-badge status-${o.status}">${o.status.replace(/_/g, ' ')}</span>
      </div>
      <div class="order-card-customer">
        <i class="fa-solid fa-user"></i> ${o.user_name || 'Guest Customer'}
      </div>
      <div class="order-card-items-summary" title="${itemsSummary}">
        <i class="fa-solid fa-bag-shopping"></i> ${itemsSummary.length > 40 ? itemsSummary.substring(0, 40) + '...' : itemsSummary}
      </div>
      <div class="order-card-footer">
        <div>
          <span class="order-card-price-label">Grand Total</span>
          <div class="order-card-price">₹${parseFloat(o.total).toFixed(2)}</div>
        </div>
        <i class="fa-solid fa-chevron-right text-muted"></i>
      </div>
    `;

    card.addEventListener('click', () => {
      // Manage CSS select classes
      document.querySelectorAll('.order-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      
      // Join Room and view details
      joinOrderRoom(o.id);
    });

    ordersList.appendChild(card);
  });
}

function joinOrderRoom(orderId) {
  if (socket) {
    if (selectedOrderId && selectedOrderId !== orderId) {
      socket.emit('leave_order', selectedOrderId);
    }
    socket.emit('join_order', orderId);
  }
  selectedOrderId = orderId;
  renderDetails(orderId);
}

function renderDetails(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    emptyDetails.classList.remove('hidden');
    detailsCard.classList.add('hidden');
    return;
  }

  emptyDetails.classList.add('hidden');
  detailsCard.classList.remove('hidden');

  // Basic Info
  const formattedDate = new Date(order.created_at).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  detailsOrderDate.innerText = formattedDate;
  detailsOrderId.innerText = `#${order.id}`;
  
  // Status Badge
  detailsStatusBadge.className = `status-badge status-${order.status}`;
  detailsStatusBadge.innerText = order.status.replace(/_/g, ' ');

  // Customer Details
  detailsCustomerName.innerText = order.user_name || 'Guest Customer';
  detailsCustomerEmail.innerText = order.user_email || 'N/A';
  detailsShippingAddress.innerText = order.line1 
    ? `${order.line1}, ${order.city}, ${order.state} - ${order.pincode}` 
    : 'No address provided';

  // Items
  detailsItemsList.innerHTML = '';
  if (order.items && order.items.length > 0) {
    order.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <img class="item-img" src="${item.product_image || 'https://picsum.photos/seed/shoe/100/100'}" alt="product">
        <div class="item-details">
          <div class="item-name">${item.product_name}</div>
          <div class="item-meta">Size: ${item.size || 'N/A'} | Qty: ${item.quantity}</div>
        </div>
        <div class="item-price">₹${parseFloat(item.total_price).toFixed(2)}</div>
      `;
      detailsItemsList.appendChild(row);
    });
  } else {
    detailsItemsList.innerHTML = '<p class="text-muted">No items in this order.</p>';
  }

  // Price Breakdown
  detailsSubtotal.innerText = `₹${parseFloat(order.subtotal || 0).toFixed(2)}`;
  detailsShipping.innerText = `₹${parseFloat(order.shipping || 0).toFixed(2)}`;
  detailsDiscount.innerText = `-₹${parseFloat(order.discount || 0).toFixed(2)}`;
  
  const cancellationFee = parseFloat(order.cancellation_fee || 0);
  if (cancellationFee > 0) {
    detailsFeeRow.classList.remove('hidden');
    detailsFee.innerText = `₹${cancellationFee.toFixed(2)}`;
  } else {
    detailsFeeRow.classList.add('hidden');
  }
  
  detailsTotal.innerText = `₹${parseFloat(order.total || 0).toFixed(2)}`;

  // Timeline
  detailsTimeline.innerHTML = '';
  
  // Standard stages
  const trackingStages = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
  
  if (order.status === 'cancelled') {
    // Show cancellation event block
    const cancelEvent = order.events ? order.events.find(e => e.status === 'cancelled') : null;
    const cancelTime = cancelEvent ? new Date(cancelEvent.created_at).toLocaleString() : 'N/A';
    const cancelDesc = cancelEvent ? cancelEvent.description : 'Order was cancelled.';
    
    detailsTimeline.innerHTML = `
      <div class="timeline-node active cancelled-node">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-status text-danger">Cancelled</span>
          <span class="timeline-desc">${cancelDesc}</span>
          <span class="timeline-time">${cancelTime}</span>
        </div>
      </div>
    `;
    
    // Add other event logs if any
    if (order.events) {
      order.events.filter(e => e.status !== 'cancelled').forEach(e => {
        addTimelineEventNode(e);
      });
    }
  } else {
    // Show progressive stages
    trackingStages.forEach(stage => {
      const event = order.events ? order.events.find(e => e.status === stage) : null;
      const isCompleted = !!event;
      const isActive = order.status === stage;
      
      const node = document.createElement('div');
      node.className = `timeline-node ${isCompleted ? 'active' : ''} ${stage === 'delivered' && isCompleted ? 'delivered-node' : ''}`;
      
      let timeStr = '';
      let descStr = '';
      
      if (event) {
        timeStr = new Date(event.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        descStr = event.description || '';
        if (event.location && event.location !== 'null') {
          descStr += ` (${event.location})`;
        }
      } else {
        // Placeholder text for pending stages
        if (stage === 'packed') descStr = 'Awaiting packaging';
        else if (stage === 'shipped') descStr = 'Awaiting carrier pick-up';
        else if (stage === 'out_for_delivery') descStr = 'Awaiting local delivery hub dispatch';
        else if (stage === 'delivered') descStr = 'Awaiting doorstep delivery';
      }

      node.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <span class="timeline-status" style="color: ${isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'}">${stage.replace(/_/g, ' ')}</span>
          <span class="timeline-desc" style="color: ${isCompleted ? 'var(--text-secondary)' : 'var(--text-muted)'}">${descStr}</span>
          <span class="timeline-time">${timeStr}</span>
        </div>
      `;
      detailsTimeline.appendChild(node);
    });
  }

  // Manage Action buttons display
  if (order.status === 'cancelled' || order.status === 'delivered') {
    // Disable buttons
    btnFastForward.setAttribute('disabled', 'true');
    btnFastForward.classList.add('btn-secondary');
    btnFastForward.classList.remove('btn-action');
  } else {
    btnFastForward.removeAttribute('disabled');
    btnFastForward.classList.remove('btn-secondary');
    btnFastForward.classList.add('btn-action');
  }
}

function addTimelineEventNode(e) {
  const node = document.createElement('div');
  node.className = 'timeline-node active';
  const timeStr = new Date(e.created_at).toLocaleString();
  node.innerHTML = `
    <div class="timeline-dot"></div>
    <div class="timeline-content">
      <span class="timeline-status" style="color: var(--text-muted)">${e.status.replace(/_/g, ' ')}</span>
      <span class="timeline-desc">${e.description} ${e.location && e.location !== 'null' ? '(' + e.location + ')' : ''}</span>
      <span class="timeline-time">${timeStr}</span>
    </div>
  `;
  detailsTimeline.appendChild(node);
}

// ─── Event Handlers ───────────────────────────────────────────

// Filter Tabs Click
filterTabs.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab-btn')) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-filter');
    renderOrdersList();
  }
});

// Search Input
orderSearch.addEventListener('input', () => {
  renderOrdersList();
});

// Fast Forward click
btnFastForward.addEventListener('click', () => {
  if (!selectedOrderId) return;
  const minutes = parseInt(fastForwardMinutes.value);
  
  // Disable button while shifting
  btnFastForward.setAttribute('disabled', 'true');
  btnFastForward.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Shifting...`;
  
  fastForwardOrder(selectedOrderId, minutes).finally(() => {
    btnFastForward.removeAttribute('disabled');
    btnFastForward.innerHTML = `<i class="fa-solid fa-forward"></i> Shift Time`;
  });
});


// ─── Security Verification & Initializer ──────────────────────

function checkAuthentication() {
  const isAuth = sessionStorage.getItem('modysole_merchant_authenticated') === 'true';
  const overlay = document.getElementById('security-overlay');
  
  if (isAuth) {
    overlay.classList.add('hidden');
    startDashboard();
    setupLockEvent();
  } else {
    overlay.classList.remove('hidden');
    setupSecurityEvents();
  }
}

function setupLockEvent() {
  const btnLockTerminal = document.getElementById('btn-lock-terminal');
  if (btnLockTerminal) {
    btnLockTerminal.addEventListener('click', () => {
      // Clear session storage
      sessionStorage.removeItem('modysole_merchant_authenticated');
      // Reload page to display security passcode screen immediately
      window.location.reload();
    });
  }
}

function setupSecurityEvents() {
  const passcodeField = document.getElementById('security-passcode');
  const toggleBtn = document.getElementById('toggle-password-btn');
  const eyeIcon = document.getElementById('eye-icon');
  const errorMsg = document.getElementById('security-error-msg');
  const submitBtn = document.getElementById('btn-security-submit');
  
  // Toggle password visibility
  toggleBtn.addEventListener('click', () => {
    if (passcodeField.type === 'password') {
      passcodeField.type = 'text';
      eyeIcon.className = 'fa-solid fa-eye-slash';
    } else {
      passcodeField.type = 'password';
      eyeIcon.className = 'fa-solid fa-eye';
    }
  });
  
  // Verify passcode
  const verifyCode = () => {
    const enteredVal = passcodeField.value.trim().toUpperCase();
    if (SECURITY_CODES.includes(enteredVal)) {
      sessionStorage.setItem('modysole_merchant_authenticated', 'true');
      document.getElementById('security-overlay').classList.add('hidden');
      startDashboard();
      setupLockEvent();
    } else {
      errorMsg.classList.remove('hidden');
      passcodeField.classList.add('error-state');
      
      // Shake animation for visual error feedback
      const box = document.querySelector('.security-box');
      box.classList.add('shake');
      setTimeout(() => box.classList.remove('shake'), 400);
    }
  };
  
  submitBtn.addEventListener('click', verifyCode);
  passcodeField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyCode();
    }
  });
  
  // Clear error state on typing
  passcodeField.addEventListener('input', () => {
    errorMsg.classList.add('hidden');
    passcodeField.classList.remove('error-state');
  });
}

// Trigger check on script execution
checkAuthentication();
