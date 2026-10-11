"use client";

import { useRef, useState } from "react";
import { 
  CheckCircle2, Printer, X, Download, ShieldCheck, 
  ExternalLink, Smartphone, MapPin, Phone, Calendar,
  CreditCard, Package, ArrowRight, Share2
} from "lucide-react";

const USD_TO_KHR = 4060;
const fmtUSD = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtKHR = (n: number) => `~ ${(Math.round(Number(n || 0) * USD_TO_KHR / 1000) * 1000).toLocaleString()} KHR`;

export interface ReceiptItem {
  id?: number | string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface ReceiptData {
  orderId: string;
  transactionId?: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  deliveryType?: string;
  paymentMethod: string;
  paymentStatus?: "paid" | "pending" | "cod" | string;
  items: ReceiptItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  promoCode?: string;
  total: number;
  paidAt?: string;
}

interface OrderReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  onTrackOrder?: () => void;
  onContinueShopping?: () => void;
}

export default function OrderReceiptModal({
  isOpen,
  onClose,
  receipt,
  onTrackOrder,
  onContinueShopping,
}: OrderReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const verifyUrl = `https://www.s-tech-store.tech/orders?verify=${encodeURIComponent(receipt.orderId)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(verifyUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  const isCOD = receipt.paymentMethod === "cod";
  const paymentMethodLabel = (() => {
    switch (receipt.paymentMethod) {
      case "bakong":
        return "Bakong KHQR (Universal QR)";
      case "aba":
        return "ABA PAY (Direct Deeplink)";
      case "visa":
        return "Visa & Mastercard Gateway";
      case "cod":
        return "Cash on Delivery (ទូទាត់ពេលទំនិញដល់)";
      default:
        return receipt.paymentMethod.toUpperCase();
    }
  })();

  const deliveryLabel =
    receipt.deliveryType === "pnompenh"
      ? "Express Same-Day Delivery (Phnom Penh)"
      : "Logistics Delivery (24 Provinces)";

  return (
    <>
      {/* ── Print Stylesheet ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #stech-print-receipt, #stech-print-receipt * {
            visibility: visible !important;
          }
          #stech-print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 99999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Action Bar (Top Floating on Mobile & Desktop) */}
          <div className="no-print flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-white text-xs font-bold tracking-wide uppercase">
                Payment Success • Receipt Ready
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer size={14} />
                <span>Print / PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Official Invoice Container ── */}
          <div
            id="stech-print-receipt"
            ref={receiptRef}
            className="bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-200 overflow-hidden relative"
          >
            {/* Top Security Banner */}
            <div className="bg-gradient-to-r from-[#8B1A1A] via-[#a32222] to-[#8B1A1A] px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white text-[#8B1A1A] font-black text-xl flex items-center justify-center shadow-inner tracking-tight">
                  S
                </div>
                <div>
                  <h3 className="font-black text-base tracking-wider uppercase leading-none">
                    S TECH STORE CAMBODIA
                  </h3>
                  <p className="text-[11px] text-red-100 font-khmer mt-0.5">
                    វិក្កយបត្រអេឡិចត្រូនិច • Official E-Receipt & Tax Invoice
                  </p>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 px-3 py-1 rounded-full text-xs font-black tracking-wide">
                <ShieldCheck size={14} className="text-emerald-300" />
                <span>{isCOD ? "COD CONFIRMED" : "PAID & VERIFIED"}</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Receipt Header Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-gray-200 text-xs">
                <div>
                  <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-1">
                    Invoice Number
                  </p>
                  <p className="font-mono text-base font-black text-[#8B1A1A]">
                    {receipt.orderId}
                  </p>
                  <p className="text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" />
                    <span>{receipt.paidAt || new Date().toLocaleString()}</span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-1">
                    Store Contact & Location
                  </p>
                  <p className="font-bold text-gray-800">S Tech Store Official</p>
                  <p className="text-gray-600 flex items-center sm:justify-end gap-1 mt-0.5">
                    <Phone size={12} className="text-gray-400" />
                    <span>+855 88 565 6750</span>
                  </p>
                  <p className="text-gray-500 flex items-center sm:justify-end gap-1 text-[11px]">
                    <MapPin size={12} className="text-gray-400" />
                    <span>Phnom Penh, Cambodia</span>
                  </p>
                </div>
              </div>

              {/* Customer & Payment Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                <div>
                  <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-1.5">
                    Billed To / អ្នកទទួល
                  </p>
                  <p className="font-bold text-sm text-gray-900">{receipt.customerName}</p>
                  <p className="text-gray-600 font-mono mt-0.5">{receipt.customerPhone}</p>
                  <p className="text-gray-500 mt-1 leading-relaxed">{receipt.shippingAddress}</p>
                  <p className="text-gray-500 font-semibold mt-1 text-[11px] text-[#8B1A1A]">
                    {deliveryLabel}
                  </p>
                </div>

                <div className="space-y-1.5 sm:border-l sm:border-gray-200 sm:pl-4">
                  <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-1.5">
                    Payment Verification / ការទូទាត់
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Method:</span>
                    <span className="font-bold text-gray-900 text-right">{paymentMethodLabel}</span>
                  </div>
                  {receipt.transactionId && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Ref / Txn:</span>
                      <span className="font-mono text-[11px] text-gray-700 font-semibold">{receipt.transactionId}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      {isCOD ? "Pending Doorstep" : "Success (Cleared)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="text-gray-400 font-semibold uppercase tracking-wider text-[10px] mb-2">
                  Order Items / បញ្ជីទំនិញ
                </p>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 uppercase font-black text-[10px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {receipt.items.length > 0 ? (
                        receipt.items.map((item, idx) => {
                          const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-3 px-4 font-semibold text-gray-900">
                                {item.name}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-gray-600">
                                {item.quantity}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-gray-600">
                                {fmtUSD(item.price)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                {fmtUSD(lineTotal)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-400">
                            Custom Tech Package
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation & QR Seal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200 items-center">
                {/* QR Code Verification */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Verify Invoice QR"
                      className="w-18 h-18 rounded-lg bg-white p-1 border border-gray-200 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                      QR
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500">
                    <p className="font-bold text-gray-800 text-xs">Official Digital Seal</p>
                    <p className="mt-0.5 leading-snug">
                      Scan to verify authenticity & track live shipping on S Tech Store.
                    </p>
                    <p className="font-khmer text-gray-400 text-[10px] mt-0.5">
                      ស្កេនដើម្បីពិនិត្យស្ថានភាព
                    </p>
                  </div>
                </div>

                {/* Subtotals & Grand Total */}
                <div className="space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-gray-800">{fmtUSD(receipt.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee:</span>
                    <span className="font-mono font-semibold text-gray-800">{fmtUSD(receipt.deliveryFee)}</span>
                  </div>
                  {Boolean(receipt.discountAmount && receipt.discountAmount > 0) && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount ({receipt.promoCode || "PROMO"}):</span>
                      <span className="font-mono">-{fmtUSD(receipt.discountAmount || 0)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                    <span className="text-sm font-black text-gray-900">Total Amount:</span>
                    <div className="text-right">
                      <span className="text-xl font-black font-mono text-[#8B1A1A]">
                        {fmtUSD(receipt.total)}
                      </span>
                      <p className="text-[11px] text-gray-500 font-mono font-semibold">
                        {fmtKHR(receipt.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Footer Note */}
              <div className="pt-3 border-t border-dashed border-gray-200 text-center text-[10px] text-gray-400 space-y-1">
                <p>
                  Thank you for shopping at S Tech Store! Please present this invoice for warranty and return service.
                </p>
                <p className="font-khmer text-gray-400">
                  សូមអរគុណសម្រាប់ការគាំទ្រហាង S Tech Store! សូមរក្សាទុកវិក្កយបត្រនេះសម្រាប់សេវាធានា និងការប្តូរទំនិញ។
                </p>
              </div>

              {/* ── Action Buttons (No-print) ── */}
              <div className="no-print pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full sm:flex-1 py-3 px-4 bg-[#8B1A1A] hover:bg-[#6e1313] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>បោះពុម្ពវិក្កយបត្រ (Print / Save PDF)</span>
                </button>

                {onTrackOrder && (
                  <button
                    type="button"
                    onClick={onTrackOrder}
                    className="w-full sm:w-auto py-3 px-5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Package size={15} />
                    <span>តាមដានការដឹក (Track)</span>
                  </button>
                )}

                {onContinueShopping && (
                  <button
                    type="button"
                    onClick={onContinueShopping}
                    className="w-full sm:w-auto py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>ទិញបន្ត (Home)</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
