/**
 * S Tech Store - Human Khmer Error & Status Translator
 * Translates technical error codes (Firebase, Backend, Network) into friendly, natural Khmer language prose.
 */

export function toHumanKhmerError(err: any): string {
  if (!err) return "មានបញ្ហាបន្តិចបន្តួច សូមសាកល្បងម្ដងទៀត";

  // If already a string
  const rawMsg = typeof err === "string" ? err : err?.response?.data?.message || err?.response?.data?.error || err?.message || "";

  // Check if rawMsg already contains Khmer characters and doesn't look like technical raw code
  const hasKhmer = /[\u1780-\u17FF]/.test(rawMsg);
  if (hasKhmer && !rawMsg.includes("Error:") && !rawMsg.includes("ERR_") && !rawMsg.includes("Account Disabled")) {
    return rawMsg;
  }

  // Account disabled / suspended
  if (
    /disabled|suspended|account.*disabled/i.test(rawMsg) ||
    err?.code === "auth/user-disabled" ||
    err?.response?.status === 403
  ) {
    return "គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ក្រុមការងារ Admin តាមរយៈ Telegram ឬទូរស័ព្ទដើម្បីបើកដំណើរការឡើងវិញ។";
  }

  // Firebase Auth Error Codes
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ សូមពិនិត្យមើលឡើងវិញ";
    case "auth/email-already-in-use":
      return "អ៊ីមែលនេះមានគណនីរួចហើយ សូមចូលគណនី ឬប្រើប្រាស់អ៊ីមែលផ្សេងទៀត";
    case "auth/weak-password":
      return "ពាក្យសម្ងាត់ខ្លីពេក សូមដាក់យ៉ាងតិច ៦ ខ្ទង់ឡើងទៅ";
    case "auth/invalid-email":
      return "ទម្រង់អ៊ីមែលមិនត្រឹមត្រូវទេ សូមពិនិត្យមើលឡើងវិញ";
    case "auth/too-many-requests":
      return "អ្នកបានព្យាយាមចូលគណនីច្រើនដងពេកហើយ សូមរង់ចាំមួយភ្លែត រួចសាកល្បងម្ដងទៀត";
    case "auth/network-request-failed":
      return "មានបញ្ហាតភ្ជាប់អ៊ីនធឺណិត សូមពិនិត្យមើលបណ្តាញរបស់អ្នកឡើងវិញ";
    case "auth/popup-closed-by-user":
      return "ការចូលគណនីត្រូវបានបោះបង់ដោយអ្នកប្រើប្រាស់";
    case "auth/popup-blocked":
      return "កម្មវិធីរុករកបានទប់ស្កាត់ផ្ទាំង Popup សូមអនុញ្ញាត Popup ដើម្បីចូលគណនី";
    case "auth/operation-not-allowed":
      return "វិធីសាស្ត្រចូលគណនីនេះមិនទាន់ត្រូវបានបើកដំណើរការទេ";
    default:
      break;
  }

  // Common Network / Server Errors
  if (/network|offline|failed to fetch/i.test(rawMsg)) {
    return "មិនអាចតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេបានទេ សូមពិនិត្យមើលអ៊ីនធឺណិតរបស់អ្នក";
  }

  if (/timeout|timed out/i.test(rawMsg)) {
    return "ការឆ្លើយតបយឺតពេល សូមសាកល្បងម្ដងទៀត";
  }

  if (/404|not found/i.test(rawMsg)) {
    return "រកមិនឃើញព័ត៌មានដែលអ្នកស្នើសុំឡើយ";
  }

  if (/500|internal server/i.test(rawMsg)) {
    return "ប្រព័ន្ធកំពុងរវល់បន្តិច សូមសាកល្បងម្ដងទៀតក្នុងពេលបន្តិចទៀត";
  }

  // If there's Khmer text inside, strip technical prefixes
  if (hasKhmer) {
    return rawMsg.replace(/\(Account.*?disabled\)/gi, "").replace(/Error:?\s*/gi, "").trim();
  }

  return "មានបញ្ហាមិនរំពឹងទុក សូមសាកល្បងម្ដងទៀត";
}
