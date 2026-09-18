import type { Language } from '@kagazready/contracts';

/**
 * Interface copy — the chrome around the findings.
 *
 * Finding titles, reasons, actions, document labels and status labels come from
 * `@kagazready/rules`, which is the single source of truth for them. Only strings that belong to
 * this interface live here. Hindi and Gujarati were drafted with AI assistance and read for tone;
 * native-speaker review is recorded as an open limitation.
 */
export interface UiStrings {
  tagline: string;
  intro: string;
  notThis: string;
  requirementsVary: string;

  addPhoto: string;
  replacePhoto: string;
  remove: string;
  fileHint: string;
  chooseFile: string;
  uploading: string;

  checkDocuments: string;
  trySample: string;
  sampleNote: string;
  sampleLoading: string;
  useCorrectedSample: string;

  processingHeading: string;
  processingReading: string;
  processingRules: string;
  processingHonest: string;

  resultHeading: string;
  yourDocuments: string;
  languageLabel: string;
  findingsHeading: string;
  markMissing: string;
  addPhotoFor: string;
  replacePhotoFor: string;
  archServices: string[];
  noFindingsBody: string;
  readingsHeading: string;
  readingsIntro: string;
  evidence: string;
  reason: string;
  suggestedAction: string;
  decidedBy: string;
  confidence: string;
  plainNote: string;
  plainNoteFallback: string;
  plainNoteUnavailable: string;

  deleteHeading: string;
  deleteBody: string;
  deleteAction: string;
  deleteConfirm: string;
  deleteCancel: string;
  deletedHeading: string;
  deletedBody: string;
  startAgain: string;
  expires: string;

  howItWorks: string;
  howItWorksClose: string;
  archIntro: string;
  archSteps: string[];
  archBoundary: string;

  errorFileType: string;
  errorFileSize: string;
  errorCapacity: string;
  errorExpired: string;
  errorNetwork: string;
  errorUnavailable: string;
  errorGeneric: string;
  dismiss: string;

  team: string;
}

const en: UiStrings = {
  tagline: 'Check the paperwork before the portal checks you.',
  intro:
    'Add photos of your Class XII marksheet, income certificate and bank proof. The text is read by Amazon Textract, then checked by fixed rules for missing, unreadable or mismatched details.',
  notThis:
    'KagazReady is a readiness check, not a government service and not part of the National Scholarship Portal. It does not judge eligibility, verify documents, or submit anything.',
  requirementsVary:
    'Requirements differ between scholarships. This checklist follows one general template — read your own scholarship notice as well.',

  addPhoto: 'Add photo',
  replacePhoto: 'Replace photo',
  remove: 'Remove',
  fileHint: 'A photo from your phone camera is fine. JPEG or PNG, up to 5 MB, one page.',
  chooseFile: 'Choose a file for',
  uploading: 'Uploading',

  checkDocuments: 'Check these documents',
  trySample: 'Try the sample set instead',
  sampleNote:
    'Sample documents are synthetic and marked as such. They go through the same upload and reading steps as your own would.',
  sampleLoading: 'Loading the sample set',
  useCorrectedSample: 'Use the corrected sample bank proof',

  processingHeading: 'Reading your documents',
  processingReading: 'Amazon Textract is reading the text',
  processingRules: 'then the readiness rules run',
  processingHonest:
    'This usually takes a few seconds. There is no percentage because none would be real.',

  resultHeading: 'Readiness',
  yourDocuments: 'Your documents',
  languageLabel: 'Language',
  findingsHeading: 'What to fix',
  markMissing: 'Missing',
  addPhotoFor: 'Add photo',
  replacePhotoFor: 'Replace photo',
  archServices: [
    'Amazon S3',
    'AWS Lambda',
    'Amazon Textract',
    'Deterministic rules',
    'Amazon Bedrock',
    'Amazon DynamoDB',
  ],
  noFindingsBody: 'Nothing in these documents needed a mark.',
  readingsHeading: 'What was read',
  readingsIntro: 'The values the rules worked from. Account numbers are shown masked.',
  evidence: 'Read as',
  reason: 'Why',
  suggestedAction: 'What to do',
  decidedBy: 'Decided by rule',
  confidence: 'Textract confidence',
  plainNote: 'In plain words',
  plainNoteFallback: 'In plain words (reviewed English)',
  plainNoteUnavailable:
    'A simplified note in this language is not available right now; the reviewed English one is shown.',

  deleteHeading: 'Finished?',
  deleteBody:
    'Delete the uploaded photos and this result now. They are removed automatically within a day or two either way.',
  deleteAction: 'Delete everything',
  deleteConfirm: 'Yes, delete',
  deleteCancel: 'Keep for now',
  deletedHeading: 'Deleted',
  deletedBody: 'The uploaded photos and the result are gone.',
  startAgain: 'Start a new check',
  expires: 'This result is kept until',

  howItWorks: 'How AWS powers this',
  howItWorksClose: 'Close',
  archIntro: 'Every check follows the same path. No document is kept beyond it.',
  archSteps: [
    'Your browser uploads each photo straight to a private Amazon S3 bucket using a short-lived, size-limited signed request.',
    'An AWS Lambda function confirms each upload is really there, within size and of the right type, and counts the check against a daily cap — before anything is read.',
    'Amazon Textract reads the text line by line and reports a confidence score for each line. The account number is masked the moment it is read.',
    'Deterministic rules — ordinary code, tested and readable — compare names, check formats and thresholds, and decide the status. This step decides everything.',
    'Amazon Bedrock is asked only to restate each finding in plain words in your language. It cannot change a finding or a status; if it fails, reviewed English is used.',
    'The result is stored in Amazon DynamoDB with an expiry, and the photos expire from S3 within a day or two. Delete removes both immediately.',
  ],
  archBoundary:
    'Nothing here judges eligibility or authenticity. Status comes from rules you could read; the language model only rephrases.',

  errorFileType: 'Please choose a JPEG or PNG image.',
  errorFileSize: 'Each photo must be smaller than 5 MB.',
  errorCapacity: 'This demo has reached its limit of checks for today. Please try again tomorrow.',
  errorExpired: 'That check has expired. Start a new one.',
  errorNetwork: 'Could not reach the checking service. Check your connection and try again.',
  errorUnavailable: 'The reading service is briefly unavailable. Please try again in a moment.',
  errorGeneric: 'Something went wrong. Please try again.',
  dismiss: 'Dismiss',

  team: 'Team DiuDaman',
};

const hi: UiStrings = {
  tagline: 'पोर्टल आपके काग़ज़ जाँचे, उससे पहले आप जाँच लें।',
  intro:
    'अपनी कक्षा 12 की अंकतालिका, आय प्रमाण पत्र और बैंक प्रमाण की फ़ोटो जोड़ें। Amazon Textract टेक्स्ट पढ़ता है, फिर तय नियम अधूरी, अस्पष्ट या मेल न खाने वाली जानकारी की जाँच करते हैं।',
  notThis:
    'KagazReady एक तैयारी-जाँच है — न सरकारी सेवा, न National Scholarship Portal का हिस्सा। यह पात्रता तय नहीं करता, दस्तावेज़ की सच्चाई नहीं परखता, और कुछ भी जमा नहीं करता।',
  requirementsVary:
    'हर छात्रवृत्ति की शर्तें अलग होती हैं। यह सूची एक सामान्य टेम्पलेट पर आधारित है — अपनी छात्रवृत्ति की सूचना भी ज़रूर पढ़ें।',

  addPhoto: 'फ़ोटो जोड़ें',
  replacePhoto: 'फ़ोटो बदलें',
  remove: 'हटाएँ',
  fileHint: 'फ़ोन कैमरे की फ़ोटो चलेगी। JPEG या PNG, 5 MB तक, एक पेज।',
  chooseFile: 'इसके लिए फ़ाइल चुनें:',
  uploading: 'अपलोड हो रहा है',

  checkDocuments: 'ये दस्तावेज़ जाँचें',
  trySample: 'इसके बजाय नमूना सेट आज़माएँ',
  sampleNote:
    'नमूना दस्तावेज़ कृत्रिम हैं और उन पर यह लिखा है। वे उसी अपलोड और पढ़ने की प्रक्रिया से गुज़रते हैं जिससे आपके दस्तावेज़ गुज़रेंगे।',
  sampleLoading: 'नमूना सेट लोड हो रहा है',
  useCorrectedSample: 'सुधारा हुआ नमूना बैंक प्रमाण इस्तेमाल करें',

  processingHeading: 'आपके दस्तावेज़ पढ़े जा रहे हैं',
  processingReading: 'Amazon Textract टेक्स्ट पढ़ रहा है',
  processingRules: 'फिर तैयारी के नियम चलेंगे',
  processingHonest:
    'इसमें आमतौर पर कुछ सेकंड लगते हैं। प्रतिशत इसलिए नहीं दिखाया गया क्योंकि वह सच्चा नहीं होता।',

  resultHeading: 'तैयारी',
  yourDocuments: 'आपके दस्तावेज़',
  languageLabel: 'भाषा',
  findingsHeading: 'क्या ठीक करें',
  markMissing: 'नहीं मिला',
  addPhotoFor: 'फ़ोटो जोड़ें',
  replacePhotoFor: 'फ़ोटो बदलें',
  archServices: [
    'Amazon S3',
    'AWS Lambda',
    'Amazon Textract',
    'तय नियम',
    'Amazon Bedrock',
    'Amazon DynamoDB',
  ],
  noFindingsBody: 'इन दस्तावेज़ों में किसी निशान की ज़रूरत नहीं पड़ी।',
  readingsHeading: 'क्या पढ़ा गया',
  readingsIntro: 'वे मान जिन पर नियम चले। खाता संख्या छिपाकर दिखाई गई है।',
  evidence: 'पढ़ा गया',
  reason: 'क्यों',
  suggestedAction: 'क्या करें',
  decidedBy: 'नियम से तय',
  confidence: 'Textract भरोसा',
  plainNote: 'सरल शब्दों में',
  plainNoteFallback: 'सरल शब्दों में (समीक्षित अंग्रेज़ी)',
  plainNoteUnavailable:
    'इस भाषा में सरल टिप्पणी अभी उपलब्ध नहीं है; समीक्षित अंग्रेज़ी टिप्पणी दिखाई गई है।',

  deleteHeading: 'हो गया?',
  deleteBody:
    'अपलोड की गई फ़ोटो और यह परिणाम अभी हटा दें। वैसे भी ये एक-दो दिन के भीतर अपने आप हट जाते हैं।',
  deleteAction: 'सब कुछ हटाएँ',
  deleteConfirm: 'हाँ, हटाएँ',
  deleteCancel: 'अभी रहने दें',
  deletedHeading: 'हटा दिया गया',
  deletedBody: 'अपलोड की गई फ़ोटो और परिणाम हट गए हैं।',
  startAgain: 'नई जाँच शुरू करें',
  expires: 'यह परिणाम तब तक रखा जाएगा:',

  howItWorks: 'AWS इसे कैसे चलाता है',
  howItWorksClose: 'बंद करें',
  archIntro: 'हर जाँच एक ही रास्ते से गुज़रती है। कोई दस्तावेज़ उसके बाद नहीं रखा जाता।',
  archSteps: [
    'आपका ब्राउज़र हर फ़ोटो सीधे एक निजी Amazon S3 बकेट में अपलोड करता है — थोड़े समय के लिए वैध, आकार-सीमित हस्ताक्षरित अनुरोध से।',
    'एक AWS Lambda फ़ंक्शन पुष्टि करता है कि हर अपलोड सचमुच मौजूद है, आकार-सीमा में है और सही प्रकार का है, और जाँच को दैनिक सीमा में गिनता है — कुछ भी पढ़े जाने से पहले।',
    'Amazon Textract टेक्स्ट पंक्ति-दर-पंक्ति पढ़ता है और हर पंक्ति के लिए भरोसे का अंक देता है। खाता संख्या पढ़ते ही छिपा दी जाती है।',
    'तय नियम — साधारण, परखा हुआ, पढ़ने योग्य कोड — नाम मिलाते हैं, प्रारूप और सीमाएँ जाँचते हैं, और स्थिति तय करते हैं। यही चरण सब कुछ तय करता है।',
    'Amazon Bedrock से सिर्फ़ इतना कहा जाता है कि हर निष्कर्ष को आपकी भाषा में सरल शब्दों में दोहराए। वह निष्कर्ष या स्थिति नहीं बदल सकता; विफल होने पर समीक्षित अंग्रेज़ी दिखती है।',
    'परिणाम Amazon DynamoDB में समय-सीमा के साथ रखा जाता है, और फ़ोटो एक-दो दिन के भीतर S3 से हट जाती हैं। हटाएँ दबाने पर दोनों तुरंत हटते हैं।',
  ],
  archBoundary:
    'यहाँ कुछ भी पात्रता या असलियत नहीं परखता। स्थिति ऐसे नियमों से आती है जिन्हें आप पढ़ सकते हैं; भाषा मॉडल सिर्फ़ शब्द बदलता है।',

  errorFileType: 'कृपया JPEG या PNG चित्र चुनें।',
  errorFileSize: 'हर फ़ोटो 5 MB से छोटी होनी चाहिए।',
  errorCapacity: 'इस डेमो की आज की जाँच-सीमा पूरी हो गई है। कृपया कल फिर कोशिश करें।',
  errorExpired: 'वह जाँच समाप्त हो गई है। नई जाँच शुरू करें।',
  errorNetwork: 'जाँच सेवा तक नहीं पहुँच सके। कनेक्शन जाँचकर दोबारा कोशिश करें।',
  errorUnavailable:
    'पढ़ने की सेवा थोड़ी देर के लिए उपलब्ध नहीं है। कृपया कुछ देर में फिर कोशिश करें।',
  errorGeneric: 'कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।',
  dismiss: 'ठीक है',

  team: 'टीम DiuDaman',
};

const gu: UiStrings = {
  tagline: 'પોર્ટલ તમારા કાગળ તપાસે તે પહેલાં તમે તપાસી લો.',
  intro:
    'તમારી ધોરણ 12 ની માર્કશીટ, આવક પ્રમાણપત્ર અને બેંક પુરાવાના ફોટા ઉમેરો. Amazon Textract લખાણ વાંચે છે, પછી નક્કી નિયમો ખૂટતી, અસ્પષ્ટ કે મેળ ન ખાતી માહિતી તપાસે છે.',
  notThis:
    'KagazReady એક તૈયારી-તપાસ છે — સરકારી સેવા નથી, National Scholarship Portal નો ભાગ નથી. તે પાત્રતા નક્કી કરતું નથી, દસ્તાવેજની સાચાઈ ચકાસતું નથી, અને કંઈ સબમિટ કરતું નથી.',
  requirementsVary:
    'દરેક શિષ્યવૃત્તિની શરતો અલગ હોય છે. આ યાદી એક સામાન્ય ટેમ્પલેટ પર આધારિત છે — તમારી શિષ્યવૃત્તિની સૂચના પણ અવશ્ય વાંચો.',

  addPhoto: 'ફોટો ઉમેરો',
  replacePhoto: 'ફોટો બદલો',
  remove: 'દૂર કરો',
  fileHint: 'ફોન કેમેરાનો ફોટો ચાલશે. JPEG અથવા PNG, 5 MB સુધી, એક પાનું.',
  chooseFile: 'આ માટે ફાઇલ પસંદ કરો:',
  uploading: 'અપલોડ થઈ રહ્યું છે',

  checkDocuments: 'આ દસ્તાવેજો તપાસો',
  trySample: 'તેના બદલે નમૂના સેટ અજમાવો',
  sampleNote:
    'નમૂના દસ્તાવેજો કૃત્રિમ છે અને તેના પર તેમ લખેલું છે. તે એ જ અપલોડ અને વાંચવાની પ્રક્રિયામાંથી પસાર થાય છે જેમાંથી તમારા દસ્તાવેજો પસાર થશે.',
  sampleLoading: 'નમૂના સેટ લોડ થઈ રહ્યો છે',
  useCorrectedSample: 'સુધારેલો નમૂના બેંક પુરાવો વાપરો',

  processingHeading: 'તમારા દસ્તાવેજો વંચાઈ રહ્યા છે',
  processingReading: 'Amazon Textract લખાણ વાંચી રહ્યું છે',
  processingRules: 'પછી તૈયારીના નિયમો ચાલશે',
  processingHonest:
    'આમાં સામાન્ય રીતે થોડી સેકંડ લાગે છે. ટકાવારી એટલા માટે નથી બતાવી કારણ કે તે સાચી ન હોત.',

  resultHeading: 'તૈયારી',
  yourDocuments: 'તમારા દસ્તાવેજો',
  languageLabel: 'ભાષા',
  findingsHeading: 'શું સુધારવું',
  markMissing: 'મળ્યું નથી',
  addPhotoFor: 'ફોટો ઉમેરો',
  replacePhotoFor: 'ફોટો બદલો',
  archServices: [
    'Amazon S3',
    'AWS Lambda',
    'Amazon Textract',
    'નક્કી નિયમો',
    'Amazon Bedrock',
    'Amazon DynamoDB',
  ],
  noFindingsBody: 'આ દસ્તાવેજોમાં કોઈ નિશાનની જરૂર પડી નથી.',
  readingsHeading: 'શું વંચાયું',
  readingsIntro: 'જે મૂલ્યો પર નિયમો ચાલ્યા. ખાતા નંબર છુપાવીને બતાવ્યો છે.',
  evidence: 'વંચાયું',
  reason: 'શા માટે',
  suggestedAction: 'શું કરવું',
  decidedBy: 'નિયમથી નક્કી',
  confidence: 'Textract ભરોસો',
  plainNote: 'સરળ શબ્દોમાં',
  plainNoteFallback: 'સરળ શબ્દોમાં (સમીક્ષિત અંગ્રેજી)',
  plainNoteUnavailable: 'આ ભાષામાં સરળ નોંધ હાલ ઉપલબ્ધ નથી; સમીક્ષિત અંગ્રેજી નોંધ બતાવી છે.',

  deleteHeading: 'પૂરું થયું?',
  deleteBody:
    'અપલોડ કરેલા ફોટા અને આ પરિણામ હમણાં જ કાઢી નાખો. એમ પણ તે એક-બે દિવસમાં આપોઆપ કાઢી નંખાય છે.',
  deleteAction: 'બધું કાઢી નાખો',
  deleteConfirm: 'હા, કાઢી નાખો',
  deleteCancel: 'હમણાં રહેવા દો',
  deletedHeading: 'કાઢી નાખ્યું',
  deletedBody: 'અપલોડ કરેલા ફોટા અને પરિણામ કાઢી નંખાયા છે.',
  startAgain: 'નવી તપાસ શરૂ કરો',
  expires: 'આ પરિણામ ત્યાં સુધી રખાશે:',

  howItWorks: 'AWS આને કેવી રીતે ચલાવે છે',
  howItWorksClose: 'બંધ કરો',
  archIntro: 'દરેક તપાસ એક જ માર્ગે થાય છે. કોઈ દસ્તાવેજ તે પછી રખાતો નથી.',
  archSteps: [
    'તમારું બ્રાઉઝર દરેક ફોટો સીધો ખાનગી Amazon S3 બકેટમાં અપલોડ કરે છે — ટૂંકા સમય માટે માન્ય, કદ-મર્યાદિત સહી કરેલી વિનંતીથી.',
    'એક AWS Lambda ફંક્શન ખાતરી કરે છે કે દરેક અપલોડ ખરેખર હાજર છે, કદ-મર્યાદામાં છે અને સાચા પ્રકારનો છે, અને તપાસને દૈનિક મર્યાદામાં ગણે છે — કંઈ પણ વંચાય તે પહેલાં.',
    'Amazon Textract લખાણ લીટી-દર-લીટી વાંચે છે અને દરેક લીટી માટે ભરોસાનો આંક આપે છે. ખાતા નંબર વંચાતાં જ ઢાંકી દેવાય છે.',
    'નક્કી નિયમો — સાદો, ચકાસેલો, વાંચી શકાય તેવો કોડ — નામ મેળવે છે, ફોર્મેટ અને મર્યાદા તપાસે છે, અને સ્થિતિ નક્કી કરે છે. આ પગલું જ બધું નક્કી કરે છે.',
    'Amazon Bedrock ને ફક્ત એટલું કહેવાય છે કે દરેક તારણ તમારી ભાષામાં સરળ શબ્દોમાં ફરી કહે. તે તારણ કે સ્થિતિ બદલી શકતું નથી; નિષ્ફળ જાય તો સમીક્ષિત અંગ્રેજી બતાવાય છે.',
    'પરિણામ Amazon DynamoDB માં સમય-મર્યાદા સાથે રખાય છે, અને ફોટા એક-બે દિવસમાં S3 માંથી નીકળી જાય છે. કાઢી નાખો દબાવતાં બંને તરત નીકળે છે.',
  ],
  archBoundary:
    'અહીં કંઈ પણ પાત્રતા કે અસલિયત ચકાસતું નથી. સ્થિતિ એવા નિયમોથી આવે છે જે તમે વાંચી શકો; ભાષા મોડેલ ફક્ત શબ્દો બદલે છે.',

  errorFileType: 'કૃપા કરીને JPEG અથવા PNG ચિત્ર પસંદ કરો.',
  errorFileSize: 'દરેક ફોટો 5 MB થી નાનો હોવો જોઈએ.',
  errorCapacity: 'આ ડેમોની આજની તપાસ-મર્યાદા પૂરી થઈ ગઈ છે. કૃપા કરીને કાલે ફરી પ્રયાસ કરો.',
  errorExpired: 'તે તપાસ સમાપ્ત થઈ ગઈ છે. નવી તપાસ શરૂ કરો.',
  errorNetwork: 'તપાસ સેવા સુધી પહોંચી શકાયું નથી. કનેક્શન તપાસીને ફરી પ્રયાસ કરો.',
  errorUnavailable:
    'વાંચવાની સેવા થોડી વાર માટે ઉપલબ્ધ નથી. કૃપા કરીને થોડી વારમાં ફરી પ્રયાસ કરો.',
  errorGeneric: 'કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયાસ કરો.',
  dismiss: 'બરાબર',

  team: 'ટીમ DiuDaman',
};

export const UI: Record<Language, UiStrings> = { en, hi, gu };

export const LANGUAGE_OPTIONS: { code: Language; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુ' },
];
