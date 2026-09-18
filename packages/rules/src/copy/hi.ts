import type { LanguageCopy } from './types.js';

/**
 * Hindi interface copy.
 *
 * Drafted with AI assistance and read for tone and accuracy, but not yet reviewed by a native
 * Hindi speaker. That limitation is recorded in `docs/limitations.md`.
 */
export const HI: LanguageCopy = {
  listSeparator: ', ',
  listConjunction: ' और ',

  documentTypes: {
    class_xii_marksheet: 'कक्षा 12 की अंकतालिका',
    income_certificate: 'आय प्रमाण पत्र',
    bank_proof: 'बैंक प्रमाण',
  },

  fields: {
    marksheet_candidate_name: 'विद्यार्थी का नाम',
    marksheet_board: 'बोर्ड का नाम',
    marksheet_exam_year: 'परीक्षा वर्ष',
    marksheet_roll_number: 'रोल नंबर',
    income_applicant_name: 'आवेदक का नाम',
    income_annual_income: 'वार्षिक आय',
    income_issue_date: 'जारी होने की तिथि',
    income_issuing_authority: 'जारी करने वाला कार्यालय',
    bank_account_holder_name: 'खाताधारक का नाम',
    bank_account_number: 'खाता संख्या',
    bank_ifsc: 'IFSC कोड',
    bank_name: 'बैंक का नाम',
  },

  statuses: {
    incomplete: {
      label: 'अपूर्ण',
      summary:
        'कोई ज़रूरी दस्तावेज़ या जानकारी नहीं मिली, इसलिए यह सेट अभी जमा करने के लिए तैयार नहीं है।',
    },
    needs_review: {
      label: 'ध्यान देने की ज़रूरत',
      summary: 'सभी ज़रूरी दस्तावेज़ मौजूद हैं, लेकिन कुछ जानकारियों पर पहले आपका ध्यान चाहिए।',
    },
    no_issues_found: {
      label: 'कोई समस्या नहीं मिली',
      summary:
        'इन जाँचों में सुधार के लिए कुछ नहीं मिला। हर छात्रवृत्ति की शर्तें अलग होती हैं, इसलिए जमा करने से पहले अपनी छात्रवृत्ति की सूचना ज़रूर पढ़ें।',
    },
  },

  rules: {
    required_document_missing: {
      title: 'अपलोड नहीं हुआ: {documentType}',
      reason: 'इस जाँच के लिए {documentType} ज़रूरी है, लेकिन इसके लिए कोई फ़ाइल अपलोड नहीं हुई।',
      suggestedAction: 'अपने {documentType} की साफ़ फ़ोटो या स्कैन अपलोड करें, फिर दोबारा जाँचें।',
    },

    required_field_missing: {
      title: 'नहीं मिला: {fieldId}',
      reason: 'आपके {documentType} से पढ़े गए टेक्स्ट में {fieldId} कहीं नहीं मिला।',
      suggestedAction:
        'देखें कि {fieldId} फ़ोटो के अंदर है और किनारे से कटा नहीं है, फिर {documentType} दोबारा अपलोड करें।',
    },

    field_unclear_low_confidence: {
      title: 'पढ़ने में मुश्किल: {fieldId}',
      reason:
        'Amazon Textract ने आपके {documentType} पर {fieldId} को {confidence}% भरोसे के साथ पढ़ा, जो इस जाँच के लिए ज़रूरी {threshold}% से कम है। आपका आवेदन देखने वाले व्यक्ति को भी इसे पढ़ने में दिक्कत हो सकती है।',
      suggestedAction:
        '{documentType} की फ़ोटो एक समान रोशनी में, पेज को सीधा रखकर और पूरा हिस्सा फ़ोकस में लेकर दोबारा लें, फिर अपलोड करें।',
    },

    name_minor_difference: {
      title: 'दस्तावेज़ों में नाम का छोटा अंतर',
      reason:
        'आपके {outlierDocumentTypes} पर नाम "{outlierName}" लिखा है, जबकि {referenceDocumentTypes} पर "{referenceName}"। अंतर छोटा है — जैसे कोई आद्याक्षर, वर्तनी का फ़र्क़, या बीच का नाम जो किसी एक दस्तावेज़ में छूट गया हो।',
      suggestedAction:
        'तय करें कि आपके आवेदन में कौन सी वर्तनी रहेगी, और जमा करने वाले दस्तावेज़ों में वही रखें। अगर कोई दस्तावेज़ सचमुच ग़लत है, तो उसे जारी करने वाले कार्यालय से ठीक करवाएँ।',
    },

    name_material_difference: {
      title: 'दस्तावेज़ों में नाम मेल नहीं खाता',
      reason:
        'आपके {outlierDocumentTypes} पर नाम "{outlierName}" है, जबकि {referenceDocumentTypes} पर "{referenceName}"। पोर्टल की जाँच इन्हें दो अलग व्यक्तियों के नाम मान सकती है।',
      suggestedAction:
        'ऐसा {outlierDocumentTypes} जमा करें जिसका नाम आपके बाक़ी दस्तावेज़ों से मेल खाता हो, या आवेदन से पहले जारी करने वाले कार्यालय से नाम ठीक करवाएँ।',
    },

    bank_ifsc_invalid_format: {
      title: 'IFSC कोड अपेक्षित रूप में नहीं है',
      reason:
        '"{value}" IFSC की बनावट से मेल नहीं खाता — चार अक्षर, फिर अंक 0, फिर छह अक्षर या अंक।',
      suggestedAction:
        'अपनी पासबुक पर छपा IFSC देखें और साफ़ फ़ोटो अपलोड करें। यह जाँच सिर्फ़ कोड की बनावट देखती है; यह शाखा के होने की पुष्टि नहीं कर सकती।',
    },

    bank_account_number_implausible: {
      title: 'खाता संख्या अधूरी लगती है',
      reason:
        '{digitCount} अंक पढ़े गए ({value})। भारतीय बैंक खाता संख्या में आम तौर पर 9 से 18 अंक होते हैं, इसलिए इसका कुछ हिस्सा कटा या अस्पष्ट हो सकता है।',
      suggestedAction: 'ऐसी फ़ोटो अपलोड करें जिसमें पूरी खाता संख्या दिखे और फ़ोकस में हो।',
    },

    date_ambiguous: {
      title: 'तिथि दो तरह से पढ़ी जा सकती है',
      reason:
        'आपके {documentType} पर "{value}" का मतलब {dayFirst} या {monthFirst} हो सकता है। यह जाँच इनमें से अंदाज़ा नहीं लगाती।',
      suggestedAction:
        'दस्तावेज़ पर लिखी तिथि ख़ुद पढ़कर पक्का करें कि कौन सी है। जिस प्रमाण पत्र में महीना शब्दों में लिखा हो, उसमें यह दिक्कत नहीं आती।',
    },

    date_in_future: {
      title: 'तिथि भविष्य की है',
      reason:
        'आपके {documentType} पर {fieldId} को {iso} के रूप में पढ़ा गया, और यह तिथि अभी आई नहीं है। आम तौर पर यह दस्तावेज़ पर टाइपिंग की ग़लती या अंक ग़लत पढ़े जाने से होता है।',
      suggestedAction:
        '{documentType} पर छपी तिथि जाँचें। अगर फ़ोटो ग़लत पढ़ी गई तो साफ़ फ़ोटो अपलोड करें; अगर दस्तावेज़ में ही ग़लती है तो जारी करने वाले कार्यालय से ठीक करवाएँ।',
    },

    date_unparseable: {
      title: 'तिथि पढ़ी नहीं जा सकी',
      reason:
        'आपके {documentType} पर "{value}" ऐसी तिथि के रूप में नहीं है जिसे यह जाँच पहचान सके।',
      suggestedAction:
        'ऐसी फ़ोटो अपलोड करें जिसमें तिथि पूरी दिखे और फ़ोकस में हो, फिर दोबारा जाँचें।',
    },
  },
};
