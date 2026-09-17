import type { LanguageCopy } from './types.js';

/**
 * Gujarati interface copy.
 *
 * Drafted with AI assistance and read for tone and accuracy, but not yet reviewed by a native
 * Gujarati speaker. That limitation is recorded in `docs/limitations.md`.
 */
export const GU: LanguageCopy = {
  listSeparator: ', ',
  listConjunction: ' અને ',

  documentTypes: {
    class_xii_marksheet: 'ધોરણ 12 ની માર્કશીટ',
    income_certificate: 'આવક પ્રમાણપત્ર',
    bank_proof: 'બેંક પુરાવો',
  },

  fields: {
    marksheet_candidate_name: 'વિદ્યાર્થીનું નામ',
    marksheet_board: 'બોર્ડનું નામ',
    marksheet_exam_year: 'પરીક્ષા વર્ષ',
    marksheet_roll_number: 'રોલ નંબર',
    income_applicant_name: 'અરજદારનું નામ',
    income_annual_income: 'વાર્ષિક આવક',
    income_issue_date: 'જારી કરવાની તારીખ',
    income_issuing_authority: 'જારી કરનાર કચેરી',
    bank_account_holder_name: 'ખાતાધારકનું નામ',
    bank_account_number: 'ખાતા નંબર',
    bank_ifsc: 'IFSC કોડ',
    bank_name: 'બેંકનું નામ',
  },

  statuses: {
    incomplete: {
      label: 'અપૂર્ણ',
      summary: 'કોઈ જરૂરી દસ્તાવેજ અથવા માહિતી મળી નથી, તેથી આ સેટ હજી સબમિટ કરવા માટે તૈયાર નથી.',
    },
    needs_review: {
      label: 'ધ્યાન આપવાની જરૂર',
      summary: 'બધા જરૂરી દસ્તાવેજો હાજર છે, પણ કેટલીક માહિતી પર પહેલાં તમારું ધ્યાન જોઈએ.',
    },
    no_issues_found: {
      label: 'કોઈ સમસ્યા મળી નથી',
      summary:
        'આ તપાસમાં સુધારવા જેવું કંઈ મળ્યું નથી. દરેક શિષ્યવૃત્તિની શરતો અલગ હોય છે, તેથી સબમિટ કરતાં પહેલાં તમારી શિષ્યવૃત્તિની સૂચના અવશ્ય વાંચો.',
    },
  },

  rules: {
    required_document_missing: {
      title: 'અપલોડ થયું નથી: {documentType}',
      reason: 'આ તપાસ માટે {documentType} જરૂરી છે, પણ તેના માટે કોઈ ફાઇલ અપલોડ થઈ નથી.',
      suggestedAction: 'તમારા {documentType} નો સ્પષ્ટ ફોટો અથવા સ્કેન અપલોડ કરો, પછી ફરીથી તપાસો.',
    },

    required_field_missing: {
      title: 'મળ્યું નથી: {fieldId}',
      reason: 'તમારા {documentType} માંથી વાંચેલા લખાણમાં {fieldId} ક્યાંય મળ્યું નથી.',
      suggestedAction:
        'ખાતરી કરો કે {fieldId} ફોટાની અંદર છે અને કિનારેથી કપાયું નથી, પછી {documentType} ફરીથી અપલોડ કરો.',
    },

    field_unclear_low_confidence: {
      title: 'વાંચવું મુશ્કેલ: {fieldId}',
      reason:
        'Amazon Textract એ તમારા {documentType} પરનું {fieldId} {confidence}% ભરોસા સાથે વાંચ્યું, જે આ તપાસ માટે જરૂરી {threshold}% થી ઓછું છે. તમારી અરજી જોનાર વ્યક્તિને પણ તે વાંચવામાં મુશ્કેલી પડી શકે.',
      suggestedAction:
        '{documentType} નો ફોટો સરખા પ્રકાશમાં, પાનું સીધું રાખીને અને પૂરો ભાગ ફોકસમાં લઈને ફરીથી લો, પછી અપલોડ કરો.',
    },

    name_minor_difference: {
      title: 'દસ્તાવેજો વચ્ચે નામમાં નાનો ફરક',
      reason:
        'તમારા {outlierDocumentTypes} પર નામ "{outlierName}" લખ્યું છે, જ્યારે {referenceDocumentTypes} પર "{referenceName}". ફરક નાનો છે — જેમ કે કોઈ આદ્યાક્ષર અથવા જોડણીનો ફેર.',
      suggestedAction:
        'નક્કી કરો કે તમારી અરજીમાં કઈ જોડણી રહેશે, અને સબમિટ કરનારા દસ્તાવેજોમાં એ જ રાખો. જો કોઈ દસ્તાવેજ ખરેખર ખોટો હોય, તો તે જારી કરનાર કચેરીથી સુધારાવો.',
    },

    name_material_difference: {
      title: 'દસ્તાવેજો વચ્ચે નામ મેળ ખાતું નથી',
      reason:
        'તમારા {outlierDocumentTypes} પર નામ "{outlierName}" છે, જ્યારે {referenceDocumentTypes} પર "{referenceName}". પોર્ટલની તપાસ આને બે અલગ વ્યક્તિઓના નામ ગણી શકે છે.',
      suggestedAction:
        'એવું {outlierDocumentTypes} સબમિટ કરો જેનું નામ તમારા બાકીના દસ્તાવેજો સાથે મેળ ખાય, અથવા અરજી પહેલાં જારી કરનાર કચેરીથી નામ સુધારાવો.',
    },

    bank_ifsc_invalid_format: {
      title: 'IFSC કોડ અપેક્ષિત રૂપમાં નથી',
      reason:
        '"{value}" IFSC ની રચના સાથે મેળ ખાતું નથી — ચાર અક્ષર, પછી અંક 0, પછી છ અક્ષર અથવા અંક.',
      suggestedAction:
        'તમારી પાસબુક પર છપાયેલો IFSC જુઓ અને સ્પષ્ટ ફોટો અપલોડ કરો. આ તપાસ ફક્ત કોડની રચના જુએ છે; તે શાખા હોવાની ખાતરી કરી શકતી નથી.',
    },

    bank_account_number_implausible: {
      title: 'ખાતા નંબર અધૂરો લાગે છે',
      reason:
        '{digitCount} અંક વંચાયા ({value}). ભારતીય બેંક ખાતા નંબરમાં સામાન્ય રીતે 9 થી 18 અંક હોય છે, તેથી તેનો કોઈ ભાગ કપાયેલો અથવા અસ્પષ્ટ હોઈ શકે.',
      suggestedAction: 'એવો ફોટો અપલોડ કરો જેમાં પૂરો ખાતા નંબર દેખાય અને ફોકસમાં હોય.',
    },

    date_ambiguous: {
      title: 'તારીખ બે રીતે વાંચી શકાય છે',
      reason:
        'તમારા {documentType} પર "{value}" નો અર્થ {dayFirst} અથવા {monthFirst} થઈ શકે. આ તપાસ તેમાંથી અનુમાન કરતી નથી.',
      suggestedAction:
        'દસ્તાવેજ પર લખેલી તારીખ જાતે વાંચીને ખાતરી કરો કે કઈ છે. જે પ્રમાણપત્રમાં મહિનો શબ્દોમાં લખ્યો હોય, તેમાં આ મુશ્કેલી આવતી નથી.',
    },

    date_in_future: {
      title: 'તારીખ ભવિષ્યની છે',
      reason:
        'તમારા {documentType} પરનું {fieldId} {iso} તરીકે વંચાયું, અને આ તારીખ હજી આવી નથી. સામાન્ય રીતે આ દસ્તાવેજ પરની ટાઇપિંગ ભૂલ અથવા અંક ખોટા વંચાવાથી થાય છે.',
      suggestedAction:
        '{documentType} પર છપાયેલી તારીખ તપાસો. જો ફોટો ખોટો વંચાયો હોય તો સ્પષ્ટ ફોટો અપલોડ કરો; જો દસ્તાવેજમાં જ ભૂલ હોય તો જારી કરનાર કચેરીથી સુધારાવો.',
    },

    date_unparseable: {
      title: 'તારીખ વાંચી શકાઈ નથી',
      reason: 'તમારા {documentType} પર "{value}" એવી તારીખના રૂપમાં નથી જેને આ તપાસ ઓળખી શકે.',
      suggestedAction:
        'એવો ફોટો અપલોડ કરો જેમાં તારીખ પૂરી દેખાય અને ફોકસમાં હોય, પછી ફરીથી તપાસો.',
    },
  },
};
