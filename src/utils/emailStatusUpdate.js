// utils/emailTemplates/statusUpdate.js
const sendMail = require('../config/mail');

/**
 * Sends an email to the user when the order status is updated.
 * @param {string} toEmail - Recipient's email address
 * @param {object} order - The updated order object
 */
const sendStatusUpdateEmail = async (toEmail, order) => {
  const orderId = order._id.toString();
  const status = (order.status || 'Updated').toLowerCase();
  const total = order.totalPrice?.toFixed(2) || '0.00';
  const placed = new Date(order.createdAt)
    .toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // Badge color map
  const map = {
    pending: '#fbbf24',    // amber
    completed: '#34d399',  // emerald
    cancelled: '#f87171',  // red
    shipped: '#60a5fa'     // sky
  };
  const badgeBg = map[status] || '#a1a1aa';

  const subject = `Order #${orderId} is now ${status.toUpperCase()}`;

  // Rows
  const rows = (order.items||[]).map(it=>{
    const name = it.product?.title||it.productTitle||'Unknown';
    const sku = it.variantSku||'-';
    const q = it.quantity;
    const up = (it.priceSnapshot||0).toFixed(2);
    const lt = (q*(it.priceSnapshot||0)).toFixed(2);
    return `<tr>
      <td>${name}</td><td>${sku}</td><td>${q}</td><td>Rs.${up}</td><td>Rs.${lt}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',sans-serif;}
    .container{max-width:700px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.1);transition:all .3s ease}
    .header{background:linear-gradient(120deg,#6366f1,#818cf8);padding:36px 24px;text-align:center;color:#fff}
    .header h1{margin:0;font-size:28px;font-weight:600}
    .header .badge{margin-top:16px;display:inline-block;padding:10px 24px;background:${badgeBg};border-radius:9999px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;}

    .details{padding:24px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:24px}
    .card{background:#f9fafb;padding:16px;border-radius:8px;text-align:center}
    .card label{font-size:12px;color:#6b7280}
    .card div{font-size:16px;color:#1f2937;margin-top:6px;}

    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{padding:12px;text-align:left}
    th{background:#e5e7eb;font-weight:600;color:#374151;border-bottom:2px solid #d1d5db}
    tr{border-bottom:1px solid #e5e7eb}

    td:nth-child(4),td:nth-child(5){text-align:right}

    .footer{text-align:center;padding:20px;background:#f9fafb;color:#6b7280;font-size:14px}
    .footer a{color:#6366f1;text-decoration:none}

    @media(max-width:600px){.grid{grid-template-columns:1fr}.header{padding:24px}.details{padding:16px}table,thead,tbody,tr,th,td{display:block}thead{display:none}tr{margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px}td{position:relative;padding:8px 12px;text-align:right}td:before{content:attr(data-label);position:absolute;left:12px;width:50%;font-weight:600;color:#374151;text-align:left}}  
  </style></head>
  <body>
  <div class="container">
    <div class="header">
      <h1>Order Update</h1>
      <div class="badge">${status}</div>
    </div>

    <div class="details">
      <div class="grid">
        <div class="card"><label>Order ID</label><div>${orderId}</div></div>
        <div class="card"><label>Placed On</label><div>${placed}</div></div>
        <div class="card"><label>Payment</label><div>${order.paymentMethod||'N/A'}</div></div>
        <div class="card"><label>Total</label><div>Rs.${total}</div></div>
      </div>

      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>
          ${rows.replace(/<td>/g,'<td data-label="">')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Need help? <a href="https://yourshop.example.com/support">Contact Support</a><br>&copy; ${new Date().getFullYear()} MultiTrade Nepal Pvt. Ltd.
    </div>
  </div>
  </body>
  </html>`;

  try { await sendMail(toEmail, subject, html) } catch(e){ console.error('Email error',e) }
};
module.exports = sendStatusUpdateEmail;
