const fs = require('fs');
let code = fs.readFileSync('frontend/app/[locale]/(shop)/checkout/page.tsx', 'utf8');

code = code.replace(/import \{ useTranslations \} from "next-intl";\nimport \{ useTranslations \} from "next-intl";/g, 'import { useTranslations } from "next-intl";');

code = code.replace(/const t = useTranslations\("Checkout"\);\n  const t = useTranslations\("Checkout"\);/g, 'const t = useTranslations("Checkout");');

fs.writeFileSync('frontend/app/[locale]/(shop)/checkout/page.tsx', code);
