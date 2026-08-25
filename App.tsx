import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { 
  SparklesIcon, 
  KeyIcon, 
  BookOpenIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  InformationCircleIcon 
} from './components/icons';
import { CustomVoiceModal } from './components/CustomVoiceModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PronunciationModal, type PronunciationRule } from './components/PronunciationModal';
import { TutorialModal } from './components/TutorialModal';
import { decode, pcmToWavBlob, concatenateBuffers } from './utils/audio';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    electronAPI?: {
      showInFolder: (path: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      saveFile: (options: any) => Promise<boolean>;
      openFile: (options: any) => Promise<string | null>;
      platform: string;
    };
    aistudio?: AIStudio;
  }
}

interface CustomVoice {
  id: string;
  name: string;
  instruction: string;
  baseVoice: string;
}

const AppLogo = () => (
  <div className="relative w-10 h-10 group cursor-pointer">
    <div className="absolute inset-0 bg-teal-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
    <svg viewBox="0 0 100 100" className="relative w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#2dd4bf', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0891b2', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="80" height="80" rx="20" fill="url(#logoGrad)" />
      <path d="M35 70 L50 30 L65 70 M42 55 L55 55" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 30 Q50 90 70 30" fill="none" stroke="white" strokeWidth="4" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  </div>
);

const splitTextIntoChunks = (text: string, maxChars: number = 800): string[] => {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let currentPos = 0;
  while (currentPos < text.length) {
    let endPos = currentPos + maxChars;
    if (endPos > text.length) endPos = text.length;
    if (endPos < text.length) {
      const lastPeriod = text.lastIndexOf('. ', endPos);
      const lastNewline = text.lastIndexOf('\n', endPos);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > currentPos) endPos = breakPoint + 1;
      else {
        const lastSpace = text.lastIndexOf(' ', endPos);
        if (lastSpace > currentPos) endPos = lastSpace;
      }
    }
    const chunk = text.substring(currentPos, endPos).trim();
    if (chunk.length > 0) chunks.push(chunk);
    currentPos = endPos;
  }
  return chunks;
};

type SvgProvider = 'gemini-tts' | 'elevenlabs' | 'resemble';

const narrationPrebuiltVoices: { [key: string]: { description: string; voiceName: string, instruction?: string } } = {
  'Sacred Text Reader': { 
    description: 'Brahmanic/Vedic specialist for Pali and Sanskrit Romanized diacritics.', 
    voiceName: 'Charon', 
    instruction: 'Use an Unambiguously MALE Indian Hindu Male baritone voice with perfect pronunciation of Pali and Sanskrit and Romanized diacritics, and Hindu Mantras.' 
  },
  'Charon (Deep Male)': { description: 'A very deep, resonant, and authoritative male voice.', voiceName: 'Charon' },
  'Zephyr (Warm Female)': { description: 'A warm and friendly female voice.', voiceName: 'Zephyr' },
  'Hyperion (Authoritative Male)': { description: 'Authoritative deep voice for documentary-style narration.', voiceName: 'Charon' },
  'Puck (Friendly Male)': { description: 'A friendly and engaging male voice.', voiceName: 'Puck' },
  'Fenrir (Serious Male)': { description: 'A serious, mature voice for formal narration.', voiceName: 'Fenrir' },
  'Kore (Clear Female)': { description: 'Clear neutral female voice.', voiceName: 'Kore' },
  'Aura (Calm Female)': { description: 'A calm, clear, and reassuring female voice.', voiceName: 'Kore' }
};

const LANGUAGES = [
  'Arabic (AR)', 'Aymara', 'Catalan', 'Cherokee', 'Chinese (ZH)', 'Danish', 'Dutch (NL)',
  'English (UK)', 'English (US)', 'Flemish', 'French (FR)', 'Georgian', 'German (DE)',
  'Guarani', 'Hindi (IN)', 'Indonesian (ID)', 'Italian (IT)', 'Japanese (JP)', 'Kannada',
  'Khmer', 'Korean (KR)', 'Lao', 'Latin', 'Latvian', 'Maltese', 'Maya (Yucatec)', 'Nahuatl',
  'Navajo', 'Nepali', 'Norwegian', 'Polish (PL)', 'Portuguese (BR)', 'Quechua', 'Russian (RU)',
  'Sanskrit (SA)', 'Sinhala', 'Spanish (ES)', 'Swedish (SE)', 'Tamil', 'Thai (TH)', 'Thai Pali (TH-PI)', 'Turkish (TR)', 'Vietnamese (VN)'
];

const MASTER_NARRATION_DEMO = `<speak>
Sāsanika-Vivarana-Katha
Ayaṃ dhammadesanā pītiyā sukhaṃ upasaṅkamantassa yogino bhāvanā-vīthiṃ pakāseti. Samādhi-bhāvanāyaṃ pīti nāma kāyiciko cetasiko ca uḷāro pharaṇasabhāvo hoti. Sukhaṃ pana santataraṃ paṇītatarañca. Yathā hi pathavī-kantāre kilanto puriso uyyānaṃ disvā pītijāto hoti, taṃ pana uyyānaṃ pavisitvā udakaṃ pivitvā sukhaṃ vindati, evameva pīti-sukha-vibhāgo veditabboti. Paṭhamaṃ tāva pīti-pharaṇā nāma hotu. Uppannāya pītiyā yogī na ghaṭeti, aññadatthu taṃ sabba-kāyaṃ pharaṇa-vasena parigaṇhāti. Yadā hi pīti thāmagatā hoti, tadā passaddhiyā vūpasammati. Kaṃsa-tāḷana-sadiso hi pīti-vego, tadanu-sañcaritā pana santatā pasannatā va sukhaṃ nāma. 

Idha pana vitakka-vicārānaṃ vūpasamo sace hoti, cittaṃ ekodhibhāvaṃ pāpuṇāti. Pīti pana saṅkhārakkhandha-pariyāpannā uḷārā, sukhaṃ pana vedanākkhandha-pariyāpannaṃ santaṃ. Tatiye jhāne pītiyā virāgā upekkhako ca viharati, sati-sampajaññena ca sukhaṃ paṭisaṃvedeti. Pītiyo pana bījāni viya, sukhaṃ pana phalaṃ viya. Pīti-khale vūpasante, yogī kevalaṃ santaṃ sukha-rasaṃ anubhavati. Ayam-ettha saṅkhepoti: pīti nāma sampahaṃsana-lakkhaṇā, sukhaṃ nāma anubhavana-lakkhaṇaṃ. Yo pītiṃ vūpasametuṃ sakkoti, so va sukha-sampadaṃ paṭilabhati. Sabbe saṅkhārā aniccā, samādhi-sukhaṃ pana nibbuti-patha-paṭipadaṃ sampādeti.
</speak>`;

const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState<string>('Sacred Text Reader');
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [isCustomVoiceModalOpen, setIsCustomVoiceModalOpen] = useState(false);
  
  const [narrationProvider, setNarrationProvider] = useState<SvgProvider>('gemini-tts');
  const [voiceStyle, setVoiceStyle] = useState<string>('');
  
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [resembleKey, setResembleKey] = useState<string>('');
  const [resembleProjectId, setResembleProjectId] = useState<string>('');
  const [elevenLabsKey, setElevenLabsKey] = useState<string>('');
  const [isAmnesiac, setIsAmnesiac] = useState<boolean>(true);
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState<boolean>(false);

  const [narrationText, setNarrationText] = useState<string>(MASTER_NARRATION_DEMO);
  const [narrationLanguage, setNarrationLanguage] = useState<string>('English (US)');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pronunciationRules, setPronunciationRules] = useState<PronunciationRule[]>([]);
  const [isPronunciationModalOpen, setIsPronunciationModalOpen] = useState(false);

  useEffect(() => {
    const storedAmnesiac = localStorage.getItem('amnesiac_mode');
    const amnesiacStatus = storedAmnesiac === 'false' ? false : true;
    setIsAmnesiac(amnesiacStatus);
    const storedVoices = localStorage.getItem('custom_voice_profiles');
    const storedRules = localStorage.getItem('pronunciation_rules');
    if (storedVoices) try { setCustomVoices(JSON.parse(storedVoices)); } catch (e) {}
    if (storedRules) try { setPronunciationRules(JSON.parse(storedRules)); } catch (e) {}
    if (!amnesiacStatus) {
      setResembleKey(localStorage.getItem('resemble_api_key') || '');
      setResembleProjectId(localStorage.getItem('resemble_project_id') || '');
      setElevenLabsKey(localStorage.getItem('elevenlabs_api_key') || '');
    }
  }, []);

  const handleExport = async (content: string, filename: string, type: string) => {
    if (window.electronAPI?.saveFile) {
      await window.electronAPI.saveFile({ content, defaultPath: filename });
    } else {
      const dataUri = `data:${type};charset=utf-8,` + encodeURIComponent(content);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', filename);
      link.click();
    }
  };

  const handleImport = async (accept: string): Promise<string | null> => {
    if (window.electronAPI?.openFile) {
      const ext = accept === 'application/json' ? ['json'] : ['txt'];
      return await window.electronAPI.openFile({ filters: [{ name: 'File', extensions: ext }] });
    } else {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = (event: any) => resolve(event.target.result as string);
          reader.readAsText(file);
        };
        input.click();
      });
    }
  };

  const exportVoices = () => {
    handleExport(JSON.stringify(customVoices, null, 2), 'custom_voices.json', 'application/json');
  };

  const importVoices = async () => {
    try {
      const content = await handleImport('application/json');
      if (!content) return;
      const imported = JSON.parse(content);
      if (Array.isArray(imported)) {
        const updated = [...customVoices, ...imported.filter(v => !customVoices.find(cv => cv.id === v.id))];
        setCustomVoices(updated);
        localStorage.setItem('custom_voice_profiles', JSON.stringify(updated));
      }
    } catch (err) { setError("Import failed: Invalid JSON"); }
  };

  const exportScript = () => {
    handleExport(narrationText, 'narrative_script.txt', 'text/plain');
  };

  const importScript = async () => {
    const content = await handleImport('text/plain');
    if (content) setNarrationText(content);
  };

  const exportStyling = () => {
    if (!voiceStyle) return;
    handleExport(voiceStyle, 'vocal_style_directive.txt', 'text/plain');
  };

  const importStyling = async () => {
    const content = await handleImport('text/plain');
    if (content) setVoiceStyle(content);
  };

  const handleSaveApiKey = (google: string, resemble: string, resembleId: string, eleven: string, amnesiac: boolean) => {
    setIsAmnesiac(amnesiac); 
    localStorage.setItem('amnesiac_mode', amnesiac ? 'true' : 'false');
    if (google) setGeminiApiKey(google);
    if (!amnesiac) {
      if(google) localStorage.setItem('gemini_api_key', google);
      if(resemble) localStorage.setItem('resemble_api_key', resemble);
      if(resembleId) localStorage.setItem('resemble_project_id', resembleId);
      if(eleven) localStorage.setItem('elevenlabs_api_key', eleven);
    }
    setResembleKey(resemble); 
    setResembleProjectId(resembleId); 
    setElevenLabsKey(eleven);
  };

  const shredVault = () => {
    localStorage.clear(); 
    sessionStorage.clear();
    setGeminiApiKey(''); 
    setResembleKey(''); 
    setResembleProjectId(''); 
    setElevenLabsKey(''); 
    setIsAmnesiac(true); 
    setCustomVoices([]); 
    setPronunciationRules([]);
    window.location.reload();
  };

  const getEffectiveApiKey = () => {
    if (geminiApiKey) return geminiApiKey;
    try {
      const local = localStorage.getItem('gemini_api_key');
      if (local) return local;
    } catch (e) {
      console.warn("localStorage access denied");
    }
    
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.API_KEY) return process.env.API_KEY;
      if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    }

    return undefined;
  };

  const ensureApiKey = async (): Promise<boolean> => {
    try {
      if (typeof window.aistudio !== 'undefined') {
         const hasKey = await window.aistudio.hasSelectedApiKey();
         if (!hasKey) { 
           console.log("No API key selected in AI Studio, opening selector...");
           await window.aistudio.openSelectKey(); 
           return false;
         }
         return true;
      }
      const existingKey = getEffectiveApiKey();
      if (!existingKey) { 
        console.log("No API key found, opening modal...");
        setIsApiKeyModalOpen(true); 
        return false; 
      }
      return true;
    } catch (err) {
      console.error("ensureApiKey error:", err);
      const existingKey = getEffectiveApiKey();
      if (!existingKey) { 
        setIsApiKeyModalOpen(true); 
        return false; 
      }
      return true;
    }
  };

  const generateNarration = async () => {
    console.log("Executing Production Pipeline...");
    setError(null);
    if (!await ensureApiKey()) {
      console.log("API Key verification failed/pending.");
      return;
    }
    console.log("API Key verified successfully.");
    setIsGenerating(true); 
    setGenerationStatus('Calibrating Neural Synthesis...'); 
    setAudioUrl(null);
    try {
      const apiKey = getEffectiveApiKey();
      if (!apiKey) throw new Error("API Key was not obtained after verification. Please try selecting it again.");
      
      console.log("Initializing Gemini AI Engine...");
      const ai = new GoogleGenAI({ apiKey });
      console.log("GoogleGenAI initialized");
      let script = narrationText;
      pronunciationRules.forEach(r => script = script.replace(new RegExp(`\\b${r.word}\\b`, 'gi'), r.alias));

      const isSsmlInput = script.includes('<speak>');
      const chunks = splitTextIntoChunks(script, 800); 
      const audioParts: Uint8Array[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setGenerationStatus(`Segment ${i + 1}/${chunks.length}...`);
        let chunk = chunks[i];

        const isDiacriticLanguage = ['Sanskrit (SA)', 'Thai Pali (TH-PI)'].includes(narrationLanguage);

        if (narrationLanguage !== 'English (US)') {
             setGenerationStatus(`Translating Segment ${i + 1} to ${narrationLanguage}...`);
             const promptText = isDiacriticLanguage
                ? `Orthographic Optimization: Preserve the following ${narrationLanguage} text exactly, but optimize its Romanized diacritics for phonetic clarity when read by a Brahmanic/Vedic AI narrator. Return ONLY the script.\n\nScript:\n${chunk}`
                : `Translate the following script/narration into ${narrationLanguage}. Translate ALL English or foreign text (including text inside <speak> or SSML tags) into natural, written ${narrationLanguage} script. Preserve any SSML/XML tags like <speak>, <break>, <p>, <s> around the translated text. Do NOT leave text in English. Return ONLY the translated script in ${narrationLanguage}.\n\nScript:\n${chunk}`;

             try {
                let transAttempts = 0;
                let translatedText = '';
                while (transAttempts < 3 && !translatedText) {
                    try {
                        const transRes = await Promise.race([
                            ai.models.generateContent({ 
                                model: 'gemini-2.5-flash',
                                contents: [{ parts: [{ text: promptText }] }] 
                            }),
                            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Translation API Timeout")), 30000))
                        ]);
                        if (transRes.text) translatedText = transRes.text.trim();
                    } catch (tErr: any) {
                        transAttempts++;
                        if (tErr?.message?.includes('RESOURCE_EXHAUSTED') || tErr?.message?.includes('429')) {
                            await new Promise(r => setTimeout(r, 2000 * transAttempts));
                        } else {
                            break;
                        }
                    }
                }
                if (translatedText) chunk = translatedText;
             } catch (tErr) { console.warn("Translation optimization failed", tErr); }
        }

        if (isSsmlInput) {
            if (!chunk.trim().startsWith('<speak>')) chunk = '<speak>' + chunk;
            if (!chunk.trim().endsWith('</speak>')) chunk = chunk + '</speak>';
        }

        try {
          const customProfile = customVoices.find(v => v.id === selectedVoiceKey);
          const preset = narrationPrebuiltVoices[selectedVoiceKey];
          const baseVoice = customProfile ? customProfile.baseVoice : (preset?.voiceName || 'Charon');
          
          const instructions = [
              narrationLanguage !== 'English (US)' ? `Fluent native ${narrationLanguage} pronunciation` : '',
              voiceStyle ? `${voiceStyle} tone` : '',
              customProfile ? customProfile.instruction : (preset?.instruction || "")
          ].filter(Boolean).join(", ");

          if (narrationProvider === 'elevenlabs') {
            if (!elevenLabsKey) throw new Error("ElevenLabs API Key Required");
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${baseVoice}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'xi-api-key': elevenLabsKey },
              body: JSON.stringify({ text: chunk, model_id: 'eleven_multilingual_v2' })
            });
            if (!response.ok) throw new Error(`ElevenLabs Error: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            audioParts.push(new Uint8Array(arrayBuffer));
          } else if (narrationProvider === 'resemble') {
            if (!resembleKey) throw new Error("Resemble API Key Required");
            if (!resembleProjectId) throw new Error("Resemble Project ID Required");
            const response = await fetch(`https://api.resemble.ai/v2/projects/${resembleProjectId}/clips`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Token token=${resembleKey}` },
              body: JSON.stringify({ body: chunk, voice_uuid: baseVoice, is_public: false, is_archived: false })
            });
            if (!response.ok) throw new Error(`Resemble Error: ${response.statusText}`);
            const data = await response.json();
            const audioRes = await fetch(data.item.link);
            const arrayBuffer = await audioRes.arrayBuffer();
            audioParts.push(new Uint8Array(arrayBuffer));
          } else {
            const ttsPrompt = instructions ? `Phonetic Directive: ${instructions}\n\nNarrative Text:\n${chunk}\n\n(Note: You support granular neural control tags like [whispers], [laughs], [slow], [fast], [excited]. Embed them directly in the text to modulate delivery.)` : chunk;

            let res: any;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
              try {
                res = await Promise.race([
                    ai.models.generateContent({
                        model: 'gemini-3.1-flash-tts-preview',
                        contents: [{ parts: [{ text: ttsPrompt }] }],
                        config: {
                            responseModalities: [Modality.AUDIO], 
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: baseVoice as any } } },
                            safetySettings: [
                                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                                { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                            ]
                        }
                    }),
                    new Promise<any>((_, reject) => setTimeout(() => reject(new Error("TTS API Timeout")), 90000))
                ]);
                break;
              } catch (ttsErr: any) {
                attempts++;
                const isRateLimit = ttsErr?.message?.includes('RESOURCE_EXHAUSTED') || ttsErr?.message?.includes('429') || ttsErr?.status === 429;
                if (attempts >= maxAttempts) {
                    if (isRateLimit) {
                        throw new Error(`API Rate Limit / Quota Exhausted on segment ${i + 1}. If using a free tier key, please wait a minute or switch to a paid API key in settings.`);
                    }
                    throw ttsErr;
                }
                const backoffMs = isRateLimit ? 5000 * attempts : 2500;
                setGenerationStatus(`Segment ${i + 1} Recovery (${attempts}/${maxAttempts}) ${isRateLimit ? '[Rate Limit - Backing Off]' : ''}...`);
                await new Promise(r => setTimeout(r, backoffMs));
              }
            }

            if (res.candidates?.[0]?.finishReason === 'SAFETY') {
                setGenerationStatus(`Segment ${i + 1}: Safety Fallback...`);
                const stripped = chunk.replace(/<[^>]*>/g, '');
                const resRetry = await ai.models.generateContent({
                    model: 'gemini-3.1-flash-tts-preview',
                    contents: [{ parts: [{ text: `Directive: Narrate this text clearly.\n\nText:\n${stripped}` }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: baseVoice as any } } }
                    }
                });
                const base64Retry = resRetry.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
                if (base64Retry) audioParts.push(decode(base64Retry));
                else throw new Error(`Segment ${i+1} Blocked by Safety Filters.`);
            } else {
                let base64 = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
                
                // Emergency Clean Pass if no audio returned
                if (!base64) {
                    setGenerationStatus(`Segment ${i + 1}: Neural Recovery Pass...`);
                    const cleanText = chunk.replace(/<[^>]*>/g, '');
                    const resClean = await ai.models.generateContent({
                        model: 'gemini-3.1-flash-tts-preview',
                        contents: [{ parts: [{ text: cleanText }] }],
                        config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: baseVoice as any } } }
                        }
                    });
                    base64 = resClean.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

                    if (!base64) {
                        setGenerationStatus(`Segment ${i + 1}: Orthographic Normalization...`);
                        const normalizedText = cleanText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[āīūṃṅñṭḍṇḷ]/g, (m) => {
                            const map: any = { 'ā': 'a', 'ī': 'i', 'ū': 'u', 'ṃ': 'm', 'ṅ': 'n', 'ñ': 'n', 'ṭ': 't', 'ḍ': 'd', 'ṇ': 'n', 'ḷ': 'l' };
                            return map[m] || m;
                        });
                        const resNorm = await ai.models.generateContent({
                            model: 'gemini-3.1-flash-tts-preview',
                            contents: [{ parts: [{ text: normalizedText }] }],
                            config: {
                                responseModalities: [Modality.AUDIO],
                                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: baseVoice as any } } }
                            }
                        });
                        base64 = resNorm.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
                    }

                    if (!base64) {
                        setGenerationStatus(`Segment ${i + 1}: Neural Phoneticization...`);
                        try {
                            const phonRes = await ai.models.generateContent({
                                model: 'gemini-2.5-flash',
                                contents: [{ parts: [{ text: `Phonetic Transliteration: Convert the following text into a phonetic spelling that is easy for a standard English TTS engine to read correctly. Use hyphens for syllables if needed. Return ONLY the phonetic text.\n\nText:\n${chunk.replace(/<[^>]*>/g, '')}` }] }]
                            });
                            const phonText = phonRes.text;
                            if (phonText) {
                                const resPhon = await ai.models.generateContent({
                                    model: 'gemini-3.1-flash-tts-preview',
                                    contents: [{ parts: [{ text: phonText.trim() }] }],
                                    config: {
                                        responseModalities: [Modality.AUDIO],
                                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: baseVoice as any } } }
                                    }
                                });
                                base64 = resPhon.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
                            }
                        } catch (pErr) { console.warn("Phoneticization failed", pErr); }
                    }

                    if (!base64) {
                        setGenerationStatus(`Segment ${i + 1}: Voice Foundation Swap...`);
                        const fallbackVoice = baseVoice === 'Charon' ? 'Fenrir' : 'Charon';
                        const resSwap = await ai.models.generateContent({
                            model: 'gemini-3.1-flash-tts-preview',
                            contents: [{ parts: [{ text: chunk.replace(/<[^>]*>/g, '') }] }],
                            config: {
                                responseModalities: [Modality.AUDIO],
                                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: fallbackVoice as any } } }
                            }
                        });
                        base64 = resSwap.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
                    }
                }

                if (base64) {
                    audioParts.push(decode(base64));
                } else {
                    const textPart = res.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
                    const finishReason = res.candidates?.[0]?.finishReason;
                    if (textPart) throw new Error(`Segment ${i+1} returned text instead of audio. Reason: ${finishReason}. Response: ${textPart.substring(0, 100)}...`);
                    throw new Error(`Segment ${i+1} failed to generate audio (Reason: ${finishReason}). This can happen with complex diacritics or unrecognized scripts in the current voice profile. Try simplifying the text or changing the voice.`);
                }
            }
          }
          await new Promise(r => setTimeout(r, 200));
        } catch (err: any) { throw new Error(`Segment ${i+1} Failed: ${err.message}`); }
      }
      
      if (audioParts.length === 0) throw new Error("No audio generated. Check script safety.");
      const concatenated = concatenateBuffers(audioParts);
      setAudioUrl(URL.createObjectURL(pcmToWavBlob(concatenated, 24000, 1)));
    } catch (err: any) { 
      console.error("generateNarration error:", err);
      setError(err?.message || String(err) || "An unknown error occurred."); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const renderGeminiVoiceSelector = () => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Voice Selection &amp; Blueprints</label>
        <div className="flex gap-2">
           <button onClick={exportVoices} className="text-[8px] text-gray-500 hover:text-teal-400 font-black uppercase flex items-center gap-1 transition-colors"><ArrowDownTrayIcon className="w-3 h-3" /> Export Profiles</button>
           <button onClick={importVoices} className="text-[8px] text-gray-500 hover:text-teal-400 font-black uppercase flex items-center gap-1 transition-colors"><ArrowUpTrayIcon className="w-3 h-3" /> Import Profiles</button>
        </div>
      </div>
      <div className="flex gap-2">
        <select value={selectedVoiceKey} onChange={(e) => setSelectedVoiceKey(e.target.value)} className="flex-grow bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500/50">
          <optgroup label="Core Presets" className="bg-gray-900">
            {Object.keys(narrationPrebuiltVoices).map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
          {customVoices.length > 0 && (
            <optgroup label="Polyglot Voice Blueprints" className="bg-gray-900">
              {customVoices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </optgroup>
          )}
        </select>
        <button onClick={() => setIsCustomVoiceModalOpen(true)} className="px-4 bg-teal-600/20 border border-teal-500/40 rounded-lg text-teal-400 hover:bg-teal-600/30 flex items-center gap-2 transition-all">
          <SparklesIcon className="w-4 h-4" />
          <span className="text-[8px] font-black uppercase tracking-tighter">New Voice</span>
        </button>
      </div>
    </div>
  );

  return (
    <main className="fixed inset-0 bg-gray-900 text-white flex flex-col font-sans overflow-x-hidden overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-gray-800/95 backdrop-blur-md border-b border-gray-700 p-3 flex flex-col items-center gap-2 shrink-0 shadow-2xl z-[100] transition-all">
        <div className="flex items-center gap-3 w-full max-w-5xl justify-between px-2">
          <div className="flex items-center gap-3">
            <AppLogo />
            <div className="flex flex-col text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-cyan-300 font-orbitron tracking-tighter leading-none">Text Narrator Polyglot Pro</h1>
              <div className="mt-1 hidden sm:block">
                <span className="text-[7px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-black uppercase tracking-[0.2em]">Professional AI Narrative Suite</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTutorialModalOpen(true)} 
              title="Academy & Prompting Guide"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-teal-500/50 rounded-lg text-gray-400 hover:text-teal-300 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <InformationCircleIcon className="w-4 h-4" />
              <span className="hidden md:inline">Academy</span>
            </button>
            <button 
              onClick={() => setIsPronunciationModalOpen(true)} 
              title="Pronunciation & Diacritics Lexicon"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-teal-500/50 rounded-lg text-gray-400 hover:text-teal-300 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <BookOpenIcon className="w-4 h-4" />
              <span className="hidden md:inline">Lexicon</span>
            </button>
            <button 
              onClick={() => setIsApiKeyModalOpen(true)} 
              title="API Key Vault & Security"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-700 hover:border-teal-500/50 rounded-lg text-gray-400 hover:text-teal-300 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              <KeyIcon className="w-4 h-4" />
              <span className="hidden md:inline">Keys</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-grow flex flex-col relative pt-4 pb-8 px-4 sm:px-6 w-full max-w-5xl mx-auto">
        <div className="flex-grow w-full flex flex-col gap-4">
          
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-800/40 p-5 rounded-3xl border border-gray-700/50">
              <div>
                  <label className="block text-[9px] font-black text-gray-500 mb-1 uppercase tracking-widest">Pipeline Engine</label>
                  <select value={narrationProvider} onChange={(e) => setNarrationProvider(e.target.value as SvgProvider)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white text-xs outline-none">
                    <option value="gemini-tts">Gemini Neural TTS (v3.1 Preview)</option>
                    <option value="elevenlabs">ElevenLabs Studio</option>
                    <option value="resemble">Resemble AI</option>
                  </select>
              </div>
              <div>
                  <label className="block text-[9px] font-black text-gray-500 mb-1 uppercase tracking-widest">Language Registry</label>
                  <select value={narrationLanguage} onChange={(e) => setNarrationLanguage(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white text-xs outline-none">
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
              </div>
              <div className="md:col-span-2">
                {renderGeminiVoiceSelector()}
              </div>
          </div>
          
          {/* Direction / Vocal Style */}
          <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/50">
             <div className="flex justify-between items-center mb-1">
               <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest">Neural Styling / Direction (Override Engine)</label>
               <div className="flex gap-2">
                  <button onClick={exportStyling} className="text-[8px] text-gray-500 hover:text-teal-400 font-black uppercase flex items-center gap-1 transition-colors"><ArrowDownTrayIcon className="w-3 h-3" /> Export Style</button>
                  <button onClick={importStyling} className="text-[8px] text-gray-500 hover:text-teal-400 font-black uppercase flex items-center gap-1 transition-colors"><ArrowUpTrayIcon className="w-3 h-3" /> Import Style</button>
               </div>
             </div>
             <input type="text" value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)} placeholder="e.g. Deep Baritone, Slow Meditative, Brahmanic Pronunciation, British Accent" className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-white text-xs outline-none focus:border-teal-500/50" />
          </div>

          {/* Narrative Script Area */}
          <div className="flex flex-col flex-grow min-h-[300px]">
               <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Narrative Manuscript (Prosody Stack Active)</label>
                  <div className="flex gap-3">
                     <button onClick={exportScript} className="text-[8px] text-gray-500 hover:text-teal-400 font-black uppercase flex items-center gap-1 transition-colors"><ArrowDownTrayIcon className="w-3 h-3" /> Export Script</button>
                     <button onClick={importScript} className="text-[8px] text-gray-500 hover:text-teal-400 font-black uppercase flex items-center gap-1 transition-colors"><ArrowUpTrayIcon className="w-3 h-3" /> Import Script</button>
                  </div>
               </div>
               <textarea value={narrationText} onChange={(e) => setNarrationText(e.target.value)} className="w-full min-h-[300px] bg-gray-800 border border-gray-700 rounded-3xl p-6 text-white font-mono text-xs leading-relaxed shadow-2xl outline-none resize-y focus:border-teal-500/50 transition-all" disabled={isGenerating} />
          </div>
          
          {/* Action Trigger */}
          <div className="flex justify-center my-4">
               <button onClick={generateNarration} disabled={isGenerating || !narrationText} className="px-20 py-5 rounded-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed font-black uppercase text-[11px] tracking-[0.2em] border border-teal-400/40 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {isGenerating ? generationStatus : "Execute Production Pipeline"}
              </button>
          </div>
          
          {/* Audio Output */}
          {audioUrl && (
              <div className="mb-6 p-6 bg-gray-800 rounded-3xl border border-teal-500/20 shadow-2xl flex flex-col gap-4 animate-in fade-in duration-300">
                  <div className="flex justify-between text-[9px] font-black uppercase text-teal-500 tracking-widest">
                    <span>Master Production Ready</span>
                    <span>24kHz PCM WAV</span>
                  </div>
                  <audio controls src={audioUrl} className="w-full rounded-full bg-gray-900 border border-gray-700"></audio>
                  <button onClick={async () => {
                    if (window.electronAPI?.saveFile && audioUrl) {
                      try {
                        const response = await fetch(audioUrl);
                        const buffer = await response.arrayBuffer();
                        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                        await window.electronAPI.saveFile({ 
                          content: base64, 
                          defaultPath: `master-narrator-${Date.now()}.wav`,
                          isBase64: true 
                        });
                      } catch (err) { console.error("Failed to save audio", err); }
                    } else if (audioUrl) {
                      const link = document.createElement('a');
                      link.href = audioUrl;
                      link.download = `master-narrator-${Date.now()}.wav`;
                      link.click();
                    }
                  }} className="block w-full text-center px-4 py-4 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-black uppercase text-xs tracking-widest transition-all shadow-lg hover:shadow-teal-500/20">
                    Download Master Production (.wav)
                  </button>
              </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 p-4 flex flex-col items-center px-4 sm:px-6 shrink-0 text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest gap-4 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between w-full items-center gap-6 lg:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span>System v1.7.0 • Production Architecture Active</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>© 2025 Text Narrator Polyglot Pro Master Suite</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-center">
            <span className="opacity-50">Developed by:</span>
            <a href="https://www.ajarnspencer.com" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-400 transition-colors">Ajarn Spencer Littlewood</a>
            <span className="opacity-30 hidden sm:inline">|</span>
            <a href="https://www.ajarnspencer.com" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-400 transition-colors">ajarnspencer.com</a>
            <span className="opacity-30 hidden sm:inline">|</span>
            <a href="https://www.github.com/AjarnSpencer" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-400 transition-colors">github.com/AjarnSpencer</a>
          </div>
        </div>
        <div className="text-center opacity-60 text-[9px] lowercase tracking-normal font-medium max-w-full px-4">
          created in collaboration with Gemini Unleashed Autonomous Agentic Workflow Protocol
        </div>
      </footer>

      {/* Alert Overlay */}
      {error && (
        <div className="fixed bottom-8 right-8 bg-red-950/95 border border-red-500 text-red-100 p-5 rounded-3xl shadow-2xl max-w-sm z-[300]">
          <p className="text-[10px] font-black uppercase mb-2 tracking-widest text-red-400 font-orbitron">Engine Alert</p>
          <p className="text-xs leading-relaxed">{error}</p>
          <button onClick={() => setError(null)} className="absolute top-4 right-4 text-red-400 text-xl hover:text-white transition-all">&times;</button>
        </div>
      )}

      {/* Modals */}
      <CustomVoiceModal 
        apiKey={getEffectiveApiKey()} 
        isOpen={isCustomVoiceModalOpen} 
        onClose={() => setIsCustomVoiceModalOpen(false)} 
        onSave={(v) => {  
          const newVoice: CustomVoice = { ...v, id: `custom-${Date.now()}` };
          const updated = [...customVoices, newVoice];
          setCustomVoices(updated);
          localStorage.setItem('custom_voice_profiles', JSON.stringify(updated));
          setSelectedVoiceKey(newVoice.id);
          setIsCustomVoiceModalOpen(false);
        }} 
      />
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
        onSave={handleSaveApiKey} 
        onShred={shredVault} 
        initialResembleKey={resembleKey}
        initialResembleProjectId={resembleProjectId}
        initialElevenLabsKey={elevenLabsKey}
        initialAmnesiac={isAmnesiac}
      />
      <PronunciationModal 
        isOpen={isPronunciationModalOpen} 
        onClose={() => setIsPronunciationModalOpen(false)} 
        rules={pronunciationRules} 
        onSave={(r) => { 
          setPronunciationRules(r); 
          localStorage.setItem('pronunciation_rules', JSON.stringify(r)); 
        }} 
      />
      <TutorialModal 
        isOpen={isTutorialModalOpen} 
        onClose={() => setIsTutorialModalOpen(false)} 
      />
    </main>
  );
};

export default App;
