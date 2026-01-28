# Backend Implementation for Payment Proof & Packing Media

This document contains the backend code you need to add to support the payment proof upload and packing media features.

## Order Model Updates

Add/update these fields in your Order model (Mongoose schema):

```javascript
// models/Order.js

const orderSchema = new mongoose.Schema({
  // ... existing fields ...

  // Buyer proof section
  buyerProof: {
    paymentScreenshot: { type: String },  // Cloudinary URL
    openingVideoUrl: { type: String },    // Cloudinary URL
    uploadedAt: { type: Date }
  },

  // Shipping info section (update existing)
  shippingInfo: {
    trackingId: { type: String },
    carrier: { type: String },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    packingVideoUrl: { type: String },      // Cloudinary URL
    packingImages: [{ type: String }]       // Array of Cloudinary URLs
  },

  // ... rest of existing fields ...
});
```

## Routes

Add these routes to your orders router:

```javascript
// routes/orders.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const orderController = require('../controllers/orderController');

// Buyer routes
router.post('/:orderId/payment-proof', authenticate, orderController.uploadPaymentProof);
router.post('/:orderId/opening-video', authenticate, orderController.uploadOpeningVideo);

// Seller routes
router.post('/:orderId/ship', authenticate, orderController.markOrderShipped);
router.post('/:orderId/packing-media', authenticate, orderController.uploadPackingMedia);

module.exports = router;
```

## Controller Implementation

Add these controller methods:

```javascript
// controllers/orderController.js

const Order = require('../models/Order');

/**
 * Upload payment proof screenshot (Buyer)
 * POST /api/v1/orders/:orderId/payment-proof
 */
exports.uploadPaymentProof = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentScreenshot } = req.body;
    const userId = req.user._id;

    if (!paymentScreenshot) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot URL is required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the user is the buyer
    if (order.buyerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer can upload payment proof'
      });
    }

    // Check order status - only allow for certain statuses
    const allowedStatuses = ['payment_received', 'processing', 'shipped', 'delivered'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload payment proof for this order status'
      });
    }

    // Update buyer proof
    order.buyerProof = {
      ...order.buyerProof,
      paymentScreenshot,
      uploadedAt: new Date()
    };

    await order.save();

    // Populate and return
    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'fullName username profileImageUrl phoneNumber')
      .populate('sellerId', 'fullName username profileImageUrl phoneNumber')
      .populate('postId', 'media caption');

    res.status(200).json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Upload payment proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof'
    });
  }
};

/**
 * Upload opening video (Buyer)
 * POST /api/v1/orders/:orderId/opening-video
 */
exports.uploadOpeningVideo = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { openingVideoUrl } = req.body;
    const userId = req.user._id;

    if (!openingVideoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Opening video URL is required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the user is the buyer
    if (order.buyerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the buyer can upload opening video'
      });
    }

    // Check order status
    const allowedStatuses = ['shipped', 'delivered'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Can only upload opening video after shipment'
      });
    }

    // Update buyer proof
    order.buyerProof = {
      ...order.buyerProof,
      openingVideoUrl,
      uploadedAt: order.buyerProof?.uploadedAt || new Date()
    };

    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'fullName username profileImageUrl phoneNumber')
      .populate('sellerId', 'fullName username profileImageUrl phoneNumber')
      .populate('postId', 'media caption');

    res.status(200).json({
      success: true,
      message: 'Opening video uploaded successfully',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Upload opening video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload opening video'
    });
  }
};

/**
 * Mark order as shipped with tracking info and optional packing media (Seller)
 * POST /api/v1/orders/:orderId/ship
 */
exports.markOrderShipped = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingId, carrier, packingVideoUrl, packingImages } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the user is the seller
    if (order.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can mark order as shipped'
      });
    }

    // Check order status
    const allowedStatuses = ['payment_received', 'processing'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be shipped at this stage'
      });
    }

    // Update shipping info
    order.shippingInfo = {
      ...order.shippingInfo,
      trackingId: trackingId || order.shippingInfo?.trackingId,
      carrier: carrier || order.shippingInfo?.carrier,
      shippedAt: new Date(),
      packingVideoUrl: packingVideoUrl || order.shippingInfo?.packingVideoUrl,
      packingImages: packingImages && packingImages.length > 0
        ? [...(order.shippingInfo?.packingImages || []), ...packingImages]
        : order.shippingInfo?.packingImages
    };

    // Update order status
    order.orderStatus = 'shipped';

    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'fullName username profileImageUrl phoneNumber')
      .populate('sellerId', 'fullName username profileImageUrl phoneNumber')
      .populate('postId', 'media caption');

    // Optional: Send notification to buyer
    // await sendNotification(order.buyerId, 'Your order has been shipped!', { orderId });

    res.status(200).json({
      success: true,
      message: 'Order marked as shipped',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Mark order shipped error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark order as shipped'
    });
  }
};

/**
 * Upload additional packing media (Seller)
 * POST /api/v1/orders/:orderId/packing-media
 */
exports.uploadPackingMedia = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { packingVideoUrl, packingImages } = req.body;
    const userId = req.user._id;

    if (!packingVideoUrl && (!packingImages || packingImages.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one media file is required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify the user is the seller
    if (order.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller can upload packing media'
      });
    }

    // Check order status
    const allowedStatuses = ['payment_received', 'processing', 'shipped'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload packing media for this order status'
      });
    }

    // Initialize shippingInfo if it doesn't exist
    if (!order.shippingInfo) {
      order.shippingInfo = {};
    }

    // Update packing media
    if (packingVideoUrl) {
      order.shippingInfo.packingVideoUrl = packingVideoUrl;
    }

    if (packingImages && packingImages.length > 0) {
      // Append new images to existing ones (limit to 10 total)
      const existingImages = order.shippingInfo.packingImages || [];
      const allImages = [...existingImages, ...packingImages].slice(0, 10);
      order.shippingInfo.packingImages = allImages;
    }

    await order.save();

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'fullName username profileImageUrl phoneNumber')
      .populate('sellerId', 'fullName username profileImageUrl phoneNumber')
      .populate('postId', 'media caption');

    res.status(200).json({
      success: true,
      message: 'Packing media uploaded successfully',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Upload packing media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload packing media'
    });
  }
};
```

## API Endpoints Summary

| Method | Endpoint | Description | User |
|--------|----------|-------------|------|
| POST | `/api/v1/orders/:orderId/payment-proof` | Upload payment screenshot | Buyer |
| POST | `/api/v1/orders/:orderId/opening-video` | Upload package opening video | Buyer |
| POST | `/api/v1/orders/:orderId/ship` | Mark shipped with tracking & packing media | Seller |
| POST | `/api/v1/orders/:orderId/packing-media` | Upload additional packing media | Seller |

## Request/Response Examples

### Upload Payment Proof

**Request:**
```json
POST /api/v1/orders/64abc123.../payment-proof
{
  "paymentScreenshot": "https://res.cloudinary.com/.../payment-proof.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment proof uploaded successfully",
  "data": {
    "order": {
      "_id": "64abc123...",
      "buyerProof": {
        "paymentScreenshot": "https://res.cloudinary.com/.../payment-proof.jpg",
        "uploadedAt": "2024-01-15T10:30:00.000Z"
      }
      // ... other order fields
    }
  }
}
```

### Mark Order Shipped

**Request:**
```json
POST /api/v1/orders/64abc123.../ship
{
  "trackingId": "AWB123456789",
  "carrier": "BlueDart",
  "packingVideoUrl": "https://res.cloudinary.com/.../packing-video.mp4",
  "packingImages": [
    "https://res.cloudinary.com/.../packing-1.jpg",
    "https://res.cloudinary.com/.../packing-2.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order marked as shipped",
  "data": {
    "order": {
      "_id": "64abc123...",
      "orderStatus": "shipped",
      "shippingInfo": {
        "trackingId": "AWB123456789",
        "carrier": "BlueDart",
        "shippedAt": "2024-01-15T10:30:00.000Z",
        "packingVideoUrl": "https://res.cloudinary.com/.../packing-video.mp4",
        "packingImages": ["https://...", "https://..."]
      }
      // ... other order fields
    }
  }
}
```

### Upload Additional Packing Media

**Request:**
```json
POST /api/v1/orders/64abc123.../packing-media
{
  "packingVideoUrl": "https://res.cloudinary.com/.../new-packing-video.mp4",
  "packingImages": [
    "https://res.cloudinary.com/.../additional-image.jpg"
  ]
}
```

## Notes

1. **File uploads are handled client-side**: Files are uploaded directly to Cloudinary from the frontend, and only the resulting URLs are sent to the backend.

2. **Image limits**: Packing images are limited to 10 total per order.

3. **Status checks**: Each endpoint validates the order status to ensure uploads are only allowed at appropriate stages.

4. **Authorization**: All endpoints require authentication and verify that the user is either the buyer or seller as appropriate.

5. **Notifications**: Consider adding push notifications when media is uploaded (commented out in the code).
