require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'https://thundervault-bd.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ]
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB!"))
  .catch(err => console.error("MongoDB connection error:", err));

const orderSchema = new mongoose.Schema({
    orderId: String,
    date: String,
    customer: Object,
    transactionId: String,
    items: Array,
    itemTotal: String,
    deliveryCharge: Number,
    grandTotal: String
});

const Order = mongoose.model('Order', orderSchema);

app.post('/api/orders', async (req, res) => {
    const { customerInfo, transactionId, cart, itemTotal, deliveryCharge, grandTotal } = req.body;
    
    if (customerInfo && cart && cart.length > 0) {
        const orderId = "TV-" + Date.now();
        const date = new Date().toLocaleString();
        
        const newOrder = new Order({
            orderId: orderId,
            date: date,
            customer: customerInfo,
            transactionId: transactionId,
            items: cart,
            itemTotal: itemTotal,
            deliveryCharge: deliveryCharge,
            grandTotal: grandTotal
        });
        
        try {
            await newOrder.save();
            
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
            // Print beautifully to Render Logs
            console.log(humanReadableOrder);
            
            res.json({ success: true, message: "Order securely saved to database!" });
        } catch (error) {
            console.error("Database error:", error);
            res.status(500).json({ success: false, message: "Database error." });
        }
    } else {
        res.status(400).json({ success: false, message: "Missing order details." });
    }
});

// Fetch from MongoDB but display as readable text on your secret link
app.get('/admin/view-orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ _id: -1 }); // Newest first
        
        if (orders.length === 0) {
            return res.send("No orders have been placed yet.");
        }

        let allOrdersText = orders.map(order => {
            let itemsText = order.items.map(item => `  🛒 ${item.quantity}x ${item.name} (${item.price})`).join('\n');
            return `
======================================================
📦 NEW ORDER: ${order.orderId}
📅 DATE: ${order.date}

👤 CUSTOMER DETAILS:
   Name:    ${order.customer.name}
   Phone:   ${order.customer.contact}
   Address: ${order.customer.address}
   Zone:    ${order.customer.deliveryZone}
   Note:    ${order.customer.note || 'None'}

🛍️ ITEMS ORDERED:
${itemsText}

💰 BILLING:
   Items Total:   ${order.itemTotal}
   Delivery:      ${order.deliveryCharge}
   GRAND TOTAL:   ${order.grandTotal}
   
💳 Transaction ID: ${order.transactionId}
======================================================
`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(allOrdersText);
    } catch (error) {
        res.status(500).send("Error fetching orders from database");
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});