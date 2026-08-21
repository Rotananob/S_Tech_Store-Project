const fs = require('fs');
let code = fs.readFileSync('app/[locale]/(shop)/checkout/page.tsx', 'utf8');

code = code.replace(/import \{ useRouter \} from "@\/i18n\/routing";/g, 'import { useRouter } from "@/i18n/routing";\nimport { useTranslations } from "next-intl";');

code = code.replace(/function StepBar\(\{ step \}: \{ step: number \}\) \{/g, 'function StepBar({ step }: { step: number }) {\n  const t = useTranslations("Checkout");');
code = code.replace(/const steps = \["Cart", "Delivery & Payment", "Done"\];/g, 'const steps = [t("stepCart"), t("stepDeliveryPayment"), t("stepDone")];');

code = code.replace(/export default function CheckoutPage\(\) \{/g, 'export default function CheckoutPage() {\n  const t = useTranslations("Checkout");');

code = code.replace(/"Please fill in all delivery fields\."/g, 't("alertFillFields")');
code = code.replace(/"Your cart is empty\."/g, 't("alertEmptyCart")');
code = code.replace(/"Failed to place order\. Please try again\."/g, 't("alertFailed")');

code = code.replace(/<h1>Checkout<\/h1>/g, '<h1>{t("title")}</h1>');
code = code.replace(/>Checkout</g, '>{t("title")}<');
code = code.replace(/>Order Confirmed!</g, '>{t("orderConfirmed")}<');
code = code.replace(/>Your order has been placed successfully\.</g, '>{t("orderPlacedSuccess")}<');
code = code.replace(/>We'll contact you at/g, '>{t("contactConfirm")}');
code = code.replace(/to confirm delivery\.</g, '{t("toConfirmDelivery")}<');
code = code.replace(/>Order Total</g, '>{t("orderTotal")}<');
code = code.replace(/>Payment</g, '>{t("payment")}<');
code = code.replace(/>Back to Home</g, '>{t("backToHome")}<');
code = code.replace(/>Delivery Details</g, '>{t("deliveryDetails")}<');
code = code.replace(/"Phnom Penh \(Same-Day\)"/g, 't("deliveryPhnomPenh")');
code = code.replace(/"Delivered within 2–4 hours"/g, 't("deliveryPhnomPenhSub")');
code = code.replace(/"Province Delivery"/g, 't("deliveryProvince")');
code = code.replace(/"Vireak Buntham \/ J&T \(1–2 Days\)"/g, 't("deliveryProvinceSub")');
code = code.replace(/>Full Name</g, '>{t("fullName")}<');
code = code.replace(/"Sok San"/g, '{t("fullName")}');
code = code.replace(/>Phone Number</g, '>{t("phoneNumber")}<');
code = code.replace(/"012 345 678"/g, '{t("phoneNumber")}');
code = code.replace(/>Detailed Address \/ Map Link</g, '>{t("addressMap")}<');
code = code.replace(/placeholder="Street number, house number, or paste Google Maps link\.\.\."/g, 'placeholder={t("addressPlaceholder")}');
code = code.replace(/>Payment Method</g, '>{t("paymentMethod")}<');
code = code.replace(/After confirming, you'll receive a QR code to complete payment via/g, '{t("qrHint")}');
code = code.replace(/>Order Summary</g, '>{t("orderSummary")}<');
code = code.replace(/Qty: /g, '{t("qty")} ');
code = code.replace(/>Subtotal</g, '>{t("subtotal")}<');
code = code.replace(/>Delivery Fee</g, '>{t("deliveryFee")}<');
code = code.replace(/>Total</g, '>{t("total")}<');
code = code.replace(/"Processing\.\.\."/g, 't("processing")');
code = code.replace(/"Confirm Order"/g, 't("confirmOrder")');
code = code.replace(/>Secure encrypted checkout</g, '>{t("secureCheckout")}<');

fs.writeFileSync('app/[locale]/(shop)/checkout/page.tsx', code);
console.log("checkout/page.tsx done");
