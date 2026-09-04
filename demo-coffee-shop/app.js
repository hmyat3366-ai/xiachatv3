// ============================================================
// Velvet Roast Artisanal Coffee — Interactive Storefront Logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Menu Category Tabs Filtering
  const tabBtns = document.querySelectorAll('.tab-btn');
  const menuItems = document.querySelectorAll('.menu-item');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.getAttribute('data-category');
      menuItems.forEach((item) => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // 2. Shopping Cart Bag State & Drawer Management
  const cart = [];
  const cartBtn = document.getElementById('cartBtn');
  const cartCount = document.getElementById('cartCount');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const checkoutBtn = document.getElementById('checkoutBtn');

  function updateCartUI() {
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (cartCount) cartCount.textContent = totalItems;
    if (cartSubtotal) cartSubtotal.textContent = `$${totalPrice.toFixed(2)}`;

    if (cartItemsContainer) {
      if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty-text">Your bag is empty. Add a signature roast!</div>';
      } else {
        cartItemsContainer.innerHTML = cart
          .map(
            (item) => `
          <div class="cart-item">
            <div class="cart-item-info">
              <h5>${item.name}</h5>
              <p>Qty: ${item.quantity} • Whole Bean</p>
            </div>
            <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `
          )
          .join('');
      }
    }
  }

  function openCart() {
    if (cartDrawer) cartDrawer.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
  }

  function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Add to Bag buttons
  const addButtons = document.querySelectorAll('.btn-add-cart');
  addButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name') || 'Signature Velvet Reserve';
      const price = parseFloat(btn.getAttribute('data-price') || '18.50');

      const existing = cart.find((i) => i.name === name);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ name, price, quantity: 1 });
      }

      updateCartUI();

      const originalText = btn.textContent;
      btn.textContent = '✓ Added!';
      btn.style.background = '#10B981';
      btn.style.color = '#ffffff';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
      }, 1200);
    });
  });

  // 3. Checkout Demo & Modal
  const checkoutModal = document.getElementById('checkoutModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalTrackBtn = document.getElementById('modalTrackBtn');
  const modalOrderCode = document.getElementById('modalOrderCode');

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCart();
      const orderCode = '#ORD-84920';
      if (modalOrderCode) modalOrderCode.textContent = orderCode;
      if (checkoutModal) checkoutModal.classList.add('active');
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (checkoutModal) checkoutModal.classList.remove('active');
    });
  }

  if (modalTrackBtn) {
    modalTrackBtn.addEventListener('click', () => {
      if (checkoutModal) checkoutModal.classList.remove('active');
      if (window.XiaChat) {
        window.XiaChat.open();
        window.XiaChat.sendMessage('Where is my order #ORD-84920?');
      }
    });
  }

  // 4. Live Order Tracking Input Button
  const trackOrderBtn = document.getElementById('trackOrderBtn');
  const demoOrderInput = document.getElementById('demoOrderInput');

  if (trackOrderBtn && demoOrderInput) {
    trackOrderBtn.addEventListener('click', () => {
      const val = demoOrderInput.value.trim() || '#ORD-84920';
      if (window.XiaChat) {
        window.XiaChat.open();
        window.XiaChat.sendMessage(`Where is my order ${val}?`);
      }
    });
  }
});
