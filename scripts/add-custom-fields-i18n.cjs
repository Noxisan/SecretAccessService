const fs = require('fs')
const path = require('path')

const translations = {
  en: {
    customFields: 'Custom fields',
    addField: 'Add field',
    deleteField: 'Delete field',
    fieldLabel: 'Label',
    fieldValue: 'Value',
    secretOn: 'Mark as hidden',
    secretOff: 'Mark as visible'
  },
  de: {
    customFields: 'Benutzerdefinierte Felder',
    addField: 'Feld hinzufügen',
    deleteField: 'Feld löschen',
    fieldLabel: 'Bezeichnung',
    fieldValue: 'Wert',
    secretOn: 'Als verborgen markieren',
    secretOff: 'Als sichtbar markieren'
  },
  zh: {
    customFields: '自定义字段',
    addField: '添加字段',
    deleteField: '删除字段',
    fieldLabel: '标签',
    fieldValue: '值',
    secretOn: '标记为隐藏',
    secretOff: '标记为可见'
  },
  hi: {
    customFields: 'कस्टम फ़ील्ड',
    addField: 'फ़ील्ड जोड़ें',
    deleteField: 'फ़ील्ड हटाएं',
    fieldLabel: 'लेबल',
    fieldValue: 'मान',
    secretOn: 'छिपे हुए के रूप में चिह्नित करें',
    secretOff: 'दृश्यमान के रूप में चिह्नित करें'
  },
  es: {
    customFields: 'Campos personalizados',
    addField: 'Agregar campo',
    deleteField: 'Eliminar campo',
    fieldLabel: 'Etiqueta',
    fieldValue: 'Valor',
    secretOn: 'Marcar como oculto',
    secretOff: 'Marcar como visible'
  },
  fr: {
    customFields: 'Champs personnalisés',
    addField: 'Ajouter un champ',
    deleteField: 'Supprimer le champ',
    fieldLabel: 'Libellé',
    fieldValue: 'Valeur',
    secretOn: 'Marquer comme masqué',
    secretOff: 'Marquer comme visible'
  },
  ar: {
    customFields: 'حقول مخصصة',
    addField: 'إضافة حقل',
    deleteField: 'حذف الحقل',
    fieldLabel: 'التسمية',
    fieldValue: 'القيمة',
    secretOn: 'وضع علامة مخفي',
    secretOff: 'وضع علامة مرئي'
  },
  bn: {
    customFields: 'কাস্টম ফিল্ড',
    addField: 'ফিল্ড যোগ করুন',
    deleteField: 'ফিল্ড মুছুন',
    fieldLabel: 'লেবেল',
    fieldValue: 'মান',
    secretOn: 'লুকানো হিসেবে চিহ্নিত করুন',
    secretOff: 'দৃশ্যমান হিসেবে চিহ্নিত করুন'
  },
  pt: {
    customFields: 'Campos personalizados',
    addField: 'Adicionar campo',
    deleteField: 'Excluir campo',
    fieldLabel: 'Rótulo',
    fieldValue: 'Valor',
    secretOn: 'Marcar como oculto',
    secretOff: 'Marcar como visível'
  },
  ru: {
    customFields: 'Настраиваемые поля',
    addField: 'Добавить поле',
    deleteField: 'Удалить поле',
    fieldLabel: 'Метка',
    fieldValue: 'Значение',
    secretOn: 'Отметить как скрытое',
    secretOff: 'Отметить как видимое'
  },
  ur: {
    customFields: 'حسب ضرورت فیلڈز',
    addField: 'فیلڈ شامل کریں',
    deleteField: 'فیلڈ حذف کریں',
    fieldLabel: 'لیبل',
    fieldValue: 'قدر',
    secretOn: 'پوشیدہ کے طور پر نشان زد کریں',
    secretOff: 'مرئی کے طور پر نشان زد کریں'
  }
}

const localesDir = path.join(__dirname, '..', 'src', 'renderer', 'locales')

for (const [lang, t] of Object.entries(translations)) {
  const filePath = path.join(localesDir, lang, 'translation.json')
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  json.items.customFields = t.customFields
  json.items.addField = t.addField
  json.items.deleteField = t.deleteField
  json.items.field.fieldLabel = t.fieldLabel
  json.items.field.fieldValue = t.fieldValue
  json.items.field.secretOn = t.secretOn
  json.items.field.secretOff = t.secretOff

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(`Updated ${lang}`)
}

console.log('Done.')
