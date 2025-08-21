// Order Edit JavaScript Functions
let ORDER_ID = '';
let ORDER_ITEMS = [];

document.addEventListener('DOMContentLoaded', function() {
  const orderData = document.getElementById('order-data');
  if (orderData) {
    ORDER_ID = orderData.dataset.orderId;
    ORDER_ITEMS = JSON.parse(orderData.dataset.orderItems);
    
    const statusSelect = document.querySelector('select[name="status"]');
    const paidSelect = document.querySelector('select[name="paid"]');
    
    if (statusSelect) statusSelect.value = orderData.dataset.orderStatus;
    if (paidSelect) paidSelect.value = orderData.dataset.paidStatus;
    
    // Add event listeners for item action buttons
    document.querySelectorAll('.item-action').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = this.dataset.index;
        const action = this.dataset.action;
        updateItem(index, action);
      });
    });
    
    document.querySelectorAll('.item-cancel').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = this.dataset.index;
        cancelItem(index);
      });
    });
  }
});

function initOrderEdit(orderId, orderItems) {
  // Legacy function for compatibility
  ORDER_ID = orderId;
  ORDER_ITEMS = orderItems;
}

function showNotification(message, type) {
  type = type || 'info';
  const div = document.createElement('div');
  let className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ';
  
  if (type === 'success') {
    className += 'bg-green-100 border border-green-200 text-green-800';
  } else if (type === 'error') {
    className += 'bg-red-100 border border-red-200 text-red-800';
  } else {
    className += 'bg-blue-100 border border-blue-200 text-blue-800';
  }
  
  div.className = className;
  div.innerHTML = '<div class="flex items-center gap-2"><span>' + message + '</span><button onclick="this.parentElement.parentElement.remove()" class="ml-auto"><i class="fas fa-times"></i></button></div>';
  document.body.appendChild(div);
  
  setTimeout(function() { 
    if (div.parentNode) {
      div.remove(); 
    }
  }, 5000);
}

function updateItem(index, status) {
  if (!confirm('Mark this item as ' + status + '?')) return;
  
  fetch('/admin/v1/order/' + ORDER_ID + '/items/' + index, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: status, sendEmail: true })
  })
  .then(function(response) { return response.json(); })
  .then(function(result) {
    if (result.success) {
      showNotification('Item ' + status + '! Email sent.', 'success');
      setTimeout(function() { location.reload(); }, 1500);
    } else {
      showNotification(result.message || 'Failed to update', 'error');
    }
  })
  .catch(function() {
    showNotification('Network error', 'error');
  });
}

function cancelItem(index) {
  const reason = prompt('Reason for cancellation:');
  if (!reason) return;
  
  if (!confirm('Cancel this item? Stock will be restored.')) return;
  
  fetch('/admin/v1/order/' + ORDER_ID + '/items/' + index, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled', statusMessage: reason, sendEmail: true })
  })
  .then(function(response) { return response.json(); })
  .then(function(result) {
    if (result.success) {
      showNotification('Item cancelled! Stock restored.', 'success');
      setTimeout(function() { location.reload(); }, 2000);
    } else {
      showNotification(result.message || 'Failed to cancel', 'error');
    }
  })
  .catch(function() {
    showNotification('Network error', 'error');
  });
}

function bulkAction(status) {
  const eligibleItems = [];
  for (let i = 0; i < ORDER_ITEMS.length; i++) {
    if (ORDER_ITEMS[i].status !== 'cancelled' && ORDER_ITEMS[i].status !== 'delivered') {
      eligibleItems.push({ index: i, status: status });
    }
  }
  
  if (eligibleItems.length === 0) {
    showNotification('No eligible items to update', 'info');
    return;
  }
  
  if (!confirm('Update ' + eligibleItems.length + ' items to ' + status + '?')) return;
  
  fetch('/admin/v1/order/' + ORDER_ID + '/items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: eligibleItems, sendEmail: true })
  })
  .then(function(response) { return response.json(); })
  .then(function(result) {
    if (result.success) {
      showNotification(eligibleItems.length + ' items updated!', 'success');
      setTimeout(function() { location.reload(); }, 2000);
    } else {
      showNotification('Bulk update failed', 'error');
    }
  })
  .catch(function() {
    showNotification('Network error', 'error');
  });
}

function cancelOrder() {
  const activeItems = ORDER_ITEMS.filter(item => item.status !== 'cancelled').length;
  
  if (activeItems === 0) {
    showNotification('All items are already cancelled', 'info');
    return;
  }
  
  const reason = prompt('Reason for order cancellation:');
  if (!reason) return;
  
  if (!confirm('Cancel ENTIRE order? This will restore all stock.')) return;
  
  fetch('/admin/v1/order/' + ORDER_ID + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled', statusMessage: reason, sendEmail: true })
  })
  .then(function(response) { return response.json(); })
  .then(function(result) {
    if (result.success) {
      showNotification('Order cancelled! Stock restored.', 'success');
      setTimeout(function() { location.href = '/admin/v1/order'; }, 2500);
    } else {
      showNotification('Failed to cancel order', 'error');
    }
  })
  .catch(function() {
    showNotification('Network error', 'error');
  });
}