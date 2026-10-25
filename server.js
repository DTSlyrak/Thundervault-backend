const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
// UPDATE: Render requires process.env.PORT to assign an internet port dynamically
const PORT = process.env.PORT || 5000;

// UPDATE: Explicitly allow your Netlify URL to communicate with this backend
app.use(cors({
  origin: [
    'https://thundervault-bd.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
}));
app.use(express.json());

const ordersPath = path.join(__dirname, 'orders.json');
const txtLogPath = path.join(__dirname, 'orders_readable.txt'); // New human-readable file

const readOrders = () => {
    if (!fs.existsSync(ordersPath)) return [];
    return JSON.parse(fs.readFileSync(ordersPath));
};

const saveOrders = (data) => {
    fs.writeFileSync(ordersPath, JSON.stringify(data, null, 2));
};

app.post('/api/orders', (req, res) => {
    const { customerInfo, transactionId, cart, itemTotal, deliveryCharge, grandTotal } = req.body;
    
    if (customerInfo && cart && cart.length > 0) {
        const orders = readOrders();
        const orderId = "TV-" + Date.now();
        const date = new Date().toLocaleString();
        
        const newOrder = {
            orderId: orderId, date: date, customer: customerInfo,
            transactionId: transactionId, items: cart,
            itemTotal: itemTotal, deliveryCharge: deliveryCharge, grandTotal: grandTotal
        };
        
        orders.push(newOrder);
        saveOrders(orders);
        
        let itemsText = cart.map(item => `  🛒 ${item.quantity}x ${item.name} (${item.price})`).join('\n');
        
        let humanReadableOrder = `
======================================================
📦 NEW ORDER: ${orderId}
📅 DATE: ${date}

👤 CUSTOMER DETAILS:
   Name:    ${customerInfo.name}
   Phone:   ${customerInfo.contact}
   Address: ${customerInfo.address}
   Zone:    ${customerInfo.deliveryZone}
   Note:    ${customerInfo.note || 'None'}

🛍️ ITEMS ORDERED:
${itemsText}

💰 BILLING:
   Items Total:   ${itemTotal}
   Delivery:      ${deliveryCharge}
   GRAND TOTAL:   ${grandTotal}
   
💳 Transaction ID: ${transactionId}
======================================================
`;
        fs.appendFileSync(txtLogPath, humanReadableOrder);
        
        // NEW: Instantly print to Render Logs for free viewing
        console.log(humanReadableOrder);
        
        res.json({ success: true, message: "Order securely saved!" });
    } else {
        res.status(400).json({ success: false, message: "Missing order details." });
    }
});

// NEW: Create a secret, free web link to view your text file
app.get('/admin/view-orders', (req, res) => {
    if (fs.existsSync(txtLogPath)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.sendFile(txtLogPath);
    } else {
        res.send("No orders have been placed yet.");
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});