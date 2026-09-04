// ============================================================
// Brew & Bean Artisans — Store UI Interactions
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

  // 2. Shopping Bag Cart Counter
  let cartCount = 0;
  const countBadge = document.getElementById('cartCount');
  const addButtons = document.querySelectorAll('.btn-add-cart');

  addButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      cartCount++;
      if (countBadge) countBadge.textContent = cartCount;

      const itemName = btn.getAttribute('data-name') || 'Item';
      const originalText = btn.textContent;
      btn.textContent = '✓ Added!';
      btn.style.background = '#10B981';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 1400);
    });
  });

  // 3. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const qBtn = item.querySelector('.faq-question');
    if (qBtn) {
      qBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach((i) => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // 4. Cart Bag Click Feedback
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      alert(`Shopping Bag: ${cartCount} item(s) selected.\nYou can ask the live AI assistant for checkout help, grind preferences, or order tracking!`);
    });
  }
});

// Helper to open Xia Chat widget from any page element
window.openWidgetChat = function () {
  const root = document.getElementById('xia-chat-widget-root');
  if (root && root.shadowRoot) {
    const launcher = root.shadowRoot.querySelector('.xia-launcher');
    if (launcher) launcher.click();
  }
};
