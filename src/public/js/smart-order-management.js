class SmartOrderManager {
  constructor(orderId) {
    this.orderId = orderId;
    this.init();
  }

  init() {
    this.loadStatusSummary();
    this.bindEvents();
  }

  async loadStatusSummary() {
    try {
      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/status-summary`);
      const result = await response.json();
      
      if (result.success) {
        this.updateStatusDisplay(result.data);
      }
    } catch (error) {
      console.error('Failed to load status summary:', error);
    }
  }

  updateStatusDisplay(summary) {
    // Update status counts display
    const statusDisplay = document.getElementById('status-summary');
    if (statusDisplay) {
      statusDisplay.innerHTML = `
        <div class="grid grid-cols-5 gap-2 text-xs">
          <div class="text-center">
            <div class="font-semibold text-yellow-600">${summary.pending}</div>
            <div>Pending</div>
          </div>
          <div class="text-center">
            <div class="font-semibold text-blue-600">${summary.processing}</div>
            <div>Processing</div>
          </div>
          <div class="text-center">
            <div class="font-semibold text-purple-600">${summary.shipped}</div>
            <div>Shipped</div>
          </div>
          <div class="text-center">
            <div class="font-semibold text-green-600">${summary.delivered}</div>
            <div>Delivered</div>
          </div>
          <div class="text-center">
            <div class="font-semibold text-red-600">${summary.cancelled}</div>
            <div>Cancelled</div>
          </div>
        </div>
      `;
    }

    // Show status mismatch warning
    if (summary.statusMismatch) {
      this.showStatusMismatchWarning(summary.currentStatus, summary.suggestedOrderStatus);
    }

    // Update order actions based on status
    this.updateOrderActions(summary);
  }

  showStatusMismatchWarning(currentStatus, suggestedStatus) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'mb-4 p-3 bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-lg';
    warningDiv.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <strong>Status Mismatch:</strong> Order is "${currentStatus}" but should be "${suggestedStatus}" based on item statuses.
        </div>
        <button onclick="smartOrderManager.fixOrderStatus('${suggestedStatus}')" 
                class="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
          Fix Status
        </button>
      </div>
    `;
    
    const container = document.querySelector('.max-w-4xl');
    if (container) {
      container.insertBefore(warningDiv, container.firstChild.nextSibling);
    }
  }

  updateOrderActions(summary) {
    const bulkActions = document.querySelectorAll('[data-bulk-action]');
    bulkActions.forEach(button => {
      const action = button.dataset.bulkAction;
      let disabled = false;
      let title = '';

      switch (action) {
        case 'processing':
          disabled = summary.pending === 0;
          title = disabled ? 'No pending items to process' : 'Process all pending items';
          break;
        case 'shipped':
          disabled = summary.processing === 0 && summary.pending === 0;
          title = disabled ? 'No items ready for shipping' : 'Ship all processable items';
          break;
        case 'delivered':
          disabled = summary.shipped === 0 && summary.processing === 0 && summary.pending === 0;
          title = disabled ? 'No items ready for delivery' : 'Mark all shippable items as delivered';
          break;
      }

      button.disabled = disabled;
      button.title = title;
      if (disabled) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }

  bindEvents() {
    // Individual item actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('.item-action')) {
        e.preventDefault();
        const index = e.target.dataset.index;
        const action = e.target.dataset.action;
        this.updateItemStatus(index, action);
      }

      if (e.target.matches('.item-cancel')) {
        e.preventDefault();
        const index = e.target.dataset.index;
        this.cancelItem(index);
      }
    });

    // Bulk actions
    window.bulkAction = (action) => this.bulkAction(action);
    window.cancelOrder = () => this.cancelOrder();
  }

  async updateItemStatus(itemIndex, status) {
    try {
      const statusMessage = prompt(`Enter a message for this ${status} update (optional):`);
      
      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/items/${itemIndex}/smart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          statusMessage,
          sendEmail: confirm('Send email notification to customer?')
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess(`Item ${status} successfully`);
        setTimeout(() => location.reload(), 1000);
      } else {
        this.showError(result.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Update item error:', error);
      this.showError('Failed to update item status');
    }
  }

  async cancelItem(itemIndex) {
    if (!confirm('Are you sure you want to cancel this item? This will restore its stock.')) {
      return;
    }

    try {
      const reason = prompt('Enter cancellation reason (optional):');
      
      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/items/${itemIndex}/smart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          statusMessage: reason || 'Item cancelled',
          sendEmail: confirm('Send cancellation email to customer?')
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('Item cancelled successfully');
        setTimeout(() => location.reload(), 1000);
      } else {
        this.showError(result.message || 'Failed to cancel item');
      }
    } catch (error) {
      console.error('Cancel item error:', error);
      this.showError('Failed to cancel item');
    }
  }

  async bulkAction(action) {
    const items = this.getEligibleItems(action);
    
    if (items.length === 0) {
      this.showError(`No items eligible for ${action}`);
      return;
    }

    if (!confirm(`${action.toUpperCase()} ${items.length} eligible items?`)) {
      return;
    }

    try {
      const statusMessage = prompt(`Enter a message for this bulk ${action} (optional):`);
      
      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/items/bulk-smart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            index: item.index,
            status: action,
            statusMessage: statusMessage || `Bulk ${action}`
          })),
          sendEmail: confirm('Send email notification to customer?')
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess(`Bulk ${action} completed successfully`);
        setTimeout(() => location.reload(), 1000);
      } else {
        this.showError(result.message || `Failed to ${action} items`);
        if (result.errors?.length > 0) {
          console.error('Bulk action errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      this.showError(`Failed to ${action} items`);
    }
  }

  getEligibleItems(action) {
    const items = [];
    const itemElements = document.querySelectorAll('[data-item-status]');
    
    itemElements.forEach((element, index) => {
      const currentStatus = element.dataset.itemStatus;
      let eligible = false;

      switch (action) {
        case 'processing':
          eligible = currentStatus === 'pending';
          break;
        case 'shipped':
          eligible = ['pending', 'processing'].includes(currentStatus);
          break;
        case 'delivered':
          eligible = ['pending', 'processing', 'shipped'].includes(currentStatus);
          break;
      }

      if (eligible) {
        items.push({ index, currentStatus });
      }
    });

    return items;
  }

  async cancelOrder() {
    if (!confirm('Are you sure you want to cancel the entire order? This will cancel all items and restore stock.')) {
      return;
    }

    try {
      const reason = prompt('Enter cancellation reason:');
      if (!reason) return;

      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/status/smart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          statusMessage: reason,
          sendEmail: confirm('Send cancellation email to customer?')
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('Order cancelled successfully');
        setTimeout(() => location.reload(), 1000);
      } else {
        this.showError(result.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      this.showError('Failed to cancel order');
    }
  }

  async fixOrderStatus(suggestedStatus) {
    try {
      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/status/smart`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: suggestedStatus,
          statusMessage: `Auto-corrected order status to match item statuses`,
          sendEmail: false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('Order status corrected');
        setTimeout(() => location.reload(), 1000);
      } else {
        this.showError(result.message || 'Failed to fix order status');
      }
    } catch (error) {
      console.error('Fix status error:', error);
      this.showError('Failed to fix order status');
    }
  }

  async autoCorrectStatus() {
    try {
      const response = await fetch(`/admin/v1/order/smart/${this.orderId}/status-summary`);
      const result = await response.json();
      
      if (result.success && result.data.suggestedOrderStatus) {
        const currentStatus = result.data.currentStatus;
        const suggestedStatus = result.data.suggestedOrderStatus;
        
        if (currentStatus !== suggestedStatus) {
          if (confirm(`Change order status from "${currentStatus}" to "${suggestedStatus}"?`)) {
            await this.fixOrderStatus(suggestedStatus);
          }
        } else {
          this.showSuccess('Order status is already correct');
        }
      }
    } catch (error) {
      console.error('Auto-correct error:', error);
      this.showError('Failed to auto-correct status');
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' 
        ? 'bg-green-100 border border-green-200 text-green-800' 
        : 'bg-red-100 border border-red-200 text-red-800'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const orderData = document.getElementById('order-data');
  if (orderData) {
    const orderId = orderData.dataset.orderId;
    window.smartOrderManager = new SmartOrderManager(orderId);
  }
});