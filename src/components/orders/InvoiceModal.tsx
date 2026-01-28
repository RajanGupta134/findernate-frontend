'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Order } from '@/api/orders';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

const InvoiceModal = ({ order, onClose }: InvoiceModalProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the invoice');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #333;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #ffd65c; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #ffd65c; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 32px; color: #333; margin-bottom: 5px; }
            .invoice-title p { color: #666; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .info-box { width: 48%; }
            .info-box h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 10px; letter-spacing: 1px; }
            .info-box p { margin-bottom: 5px; color: #333; }
            .order-ref { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
            .order-ref p { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .order-ref p:last-child { margin-bottom: 0; }
            .order-ref strong { color: #333; }
            .order-ref span { color: #666; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
            td { padding: 15px 12px; border-bottom: 1px solid #eee; }
            .product-name { font-weight: 500; }
            .product-desc { font-size: 13px; color: #666; margin-top: 4px; }
            .text-right { text-align: right; }
            .summary { margin-left: auto; width: 300px; }
            .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .summary-row.total { border-bottom: none; border-top: 2px solid #333; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
            .status-confirmed { background: #d4edda; color: #155724; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-shipped { background: #cce5ff; color: #004085; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const getStatusClass = (status: string) => {
    if (['confirmed', 'delivered'].includes(status)) return 'status-confirmed';
    if (['shipped', 'processing'].includes(status)) return 'status-shipped';
    return 'status-pending';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoice</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#ffd65c] text-black rounded-lg hover:bg-[#e6c152] transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Download
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={invoiceRef} className="p-8">
          <div className="invoice-container">
            {/* Header */}
            <div className="flex justify-between items-start mb-10 border-b-2 border-[#ffd65c] pb-5">
              <div>
                <h2 className="text-3xl font-bold text-[#ffd65c]">FinderNate</h2>
                <p className="text-gray-500 text-sm mt-1">Marketplace</p>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                <p className="text-gray-500">#{order.orderNumber}</p>
              </div>
            </div>

            {/* Order Reference Box */}
            <div className="bg-gray-50 p-4 rounded-lg mb-8">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Reference ID:</span>
                  <span className="font-mono font-semibold">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Date:</span>
                  <span className="font-medium">{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.paymentStatus === 'released' ? 'bg-green-100 text-green-700' :
                    order.paymentStatus === 'held' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.paymentStatus.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(order.orderStatus)}`}>
                    {order.orderStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Seller & Buyer Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs uppercase text-gray-400 tracking-wider mb-3">Seller</h3>
                <p className="font-semibold text-gray-800">{order.sellerId?.fullName}</p>
                <p className="text-gray-600 text-sm">@{order.sellerId?.username}</p>
                {order.sellerId?.phoneNumber && (
                  <p className="text-gray-600 text-sm">{order.sellerId.phoneNumber}</p>
                )}
              </div>
              <div>
                <h3 className="text-xs uppercase text-gray-400 tracking-wider mb-3">Buyer / Bill To</h3>
                <p className="font-semibold text-gray-800">{order.buyerId?.fullName}</p>
                <p className="text-gray-600 text-sm">@{order.buyerId?.username}</p>
                {order.buyerId?.phoneNumber && (
                  <p className="text-gray-600 text-sm">{order.buyerId.phoneNumber}</p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-8">
              <h3 className="text-xs uppercase text-gray-400 tracking-wider mb-3">Shipping Address</h3>
              <div className="text-gray-700 text-sm">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
                <p>Phone: {order.shippingAddress.phoneNumber}</p>
              </div>
            </div>

            {/* Product Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 text-xs uppercase text-gray-500 tracking-wider">Product</th>
                  <th className="text-center p-3 text-xs uppercase text-gray-500 tracking-wider">Qty</th>
                  <th className="text-right p-3 text-xs uppercase text-gray-500 tracking-wider">Price</th>
                  <th className="text-right p-3 text-xs uppercase text-gray-500 tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {order.productDetails.images?.[0] && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={order.productDetails.images[0]}
                            alt={order.productDetails.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{order.productDetails.name}</p>
                        {order.productDetails.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{order.productDetails.description}</p>
                        )}
                        {order.productDetails.category && (
                          <p className="text-xs text-gray-400 mt-1">Category: {order.productDetails.category}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-700">1</td>
                  <td className="p-4 text-right text-gray-700">{formatCurrency(order.amount)}</td>
                  <td className="p-4 text-right font-medium text-gray-800">{formatCurrency(order.amount)}</td>
                </tr>
              </tbody>
            </table>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-72">
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-800">{formatCurrency(order.amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between py-2 border-b text-sm">
                  <span className="text-gray-500">Platform Fee</span>
                  <span className="text-gray-800">{formatCurrency(order.platformFee)}</span>
                </div>
                <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-800 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-[#d4a84a]">{formatCurrency(order.amount)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm text-gray-500">
                  <span>Seller Receives</span>
                  <span>{formatCurrency(order.sellerAmount)}</span>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            {order.shippingInfo && (order.shippingInfo.trackingId || order.shippingInfo.carrier) && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-xs uppercase text-gray-400 tracking-wider mb-3">Shipping Information</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  {order.shippingInfo.carrier && <p>Carrier: <strong>{order.shippingInfo.carrier}</strong></p>}
                  {order.shippingInfo.trackingId && <p>Tracking ID: <strong className="font-mono">{order.shippingInfo.trackingId}</strong></p>}
                  {order.shippingInfo.shippedAt && <p>Shipped: {formatDate(order.shippingInfo.shippedAt)}</p>}
                  {order.shippingInfo.deliveredAt && <p>Delivered: {formatDate(order.shippingInfo.deliveredAt)}</p>}
                </div>
              </div>
            )}

            {/* Payment Info */}
            {order.razorpayPaymentId && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-xs uppercase text-gray-400 tracking-wider mb-3">Payment Information</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Payment ID: <strong className="font-mono">{order.razorpayPaymentId}</strong></p>
                  {order.paymentReleasedAt && <p>Payment Released: {formatDate(order.paymentReleasedAt)}</p>}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t text-center text-gray-400 text-xs">
              <p>Thank you for your business!</p>
              <p className="mt-1">This is a computer-generated invoice and does not require a signature.</p>
              <p className="mt-2">FinderNate Marketplace - {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
