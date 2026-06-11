const fs = require('fs')
const path = require('path')

const translations = {
  en: {
    addTotp: 'Add authenticator code',
    totpSection: 'Authenticator (2FA)',
    removeTotp: 'Remove 2FA',
    totpLiveCode: 'Live code — click to copy'
  },
  de: {
    addTotp: 'Authentifizierungscode hinzufügen',
    totpSection: 'Authentifikator (2FA)',
    removeTotp: '2FA entfernen',
    totpLiveCode: 'Live-Code – zum Kopieren klicken'
  },
  zh: {
    addTotp: '添加验证码',
    totpSection: '验证器（双重认证）',
    removeTotp: '移除双重认证',
    totpLiveCode: '实时验证码 — 点击复制'
  },
  hi: {
    addTotp: 'प्रमाणीकरण कोड जोड़ें',
    totpSection: 'प्रमाणक (2FA)',
    removeTotp: '2FA हटाएं',
    totpLiveCode: 'लाइव कोड — कॉपी करने के लिए क्लिक करें'
  },
  es: {
    addTotp: 'Agregar código autenticador',
    totpSection: 'Autenticador (2FA)',
    removeTotp: 'Eliminar 2FA',
    totpLiveCode: 'Código en vivo — clic para copiar'
  },
  fr: {
    addTotp: 'Ajouter un code d\'authentification',
    totpSection: 'Authentificateur (2FA)',
    removeTotp: 'Supprimer le 2FA',
    totpLiveCode: 'Code en direct — cliquer pour copier'
  },
  ar: {
    addTotp: 'إضافة رمز المصادقة',
    totpSection: 'المصادق (2FA)',
    removeTotp: 'إزالة 2FA',
    totpLiveCode: 'الرمز المباشر — انقر للنسخ'
  },
  bn: {
    addTotp: 'প্রমাণীকরণ কোড যোগ করুন',
    totpSection: 'অথেন্টিকেটর (2FA)',
    removeTotp: '2FA সরান',
    totpLiveCode: 'লাইভ কোড — কপি করতে ক্লিক করুন'
  },
  pt: {
    addTotp: 'Adicionar código autenticador',
    totpSection: 'Autenticador (2FA)',
    removeTotp: 'Remover 2FA',
    totpLiveCode: 'Código ao vivo — clique para copiar'
  },
  ru: {
    addTotp: 'Добавить код аутентификатора',
    totpSection: 'Аутентификатор (2FA)',
    removeTotp: 'Удалить 2FA',
    totpLiveCode: 'Живой код — нажмите для копирования'
  },
  ur: {
    addTotp: 'تصدیقی کوڈ شامل کریں',
    totpSection: 'تصدیق کار (2FA)',
    removeTotp: '2FA ہٹائیں',
    totpLiveCode: 'لائیو کوڈ — کاپی کرنے کے لیے کلک کریں'
  }
}

const localesDir = path.join(__dirname, '..', 'src', 'renderer', 'locales')

for (const [lang, t] of Object.entries(translations)) {
  const filePath = path.join(localesDir, lang, 'translation.json')
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  json.items.addTotp = t.addTotp
  json.items.totpSection = t.totpSection
  json.items.removeTotp = t.removeTotp
  json.items.totpLiveCode = t.totpLiveCode

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(`Updated ${lang}`)
}

console.log('Done.')
