// --- Globals ---
const LANG_DEFAULT = "en-US";
let availableVoices = [];
let chosenVoice = null;
let isSpeaking = false;
let currentUtterance = null;
let showingHistory = false;
let lastSummaryContent = "";
// Speech recognition globals
let recognition = null;
let isRecognizing = false;
let currentFontSize = 16;
// current selected language for UI/TTS/recognition
let CURRENT_LANG = LANG_DEFAULT;

// Simple translations for UI strings and spoken confirmations.
// Keys used in this file must be present here. Add new keys as needed.
const TRANSLATIONS = {
  en: {
    voice: 'Voice',
    listening: 'Listening...',
    speaker: 'Speaker',
    stop: 'Stop',
    copied: 'Copied!',
    reading_summary_aloud: 'Reading summary aloud',
    generating_brief_summary: 'Generating brief summary',
    generating_detailed_summary: 'Generating detailed summary',
    generating_bullet_summary: 'Generating bullet point summary',
    generating_summary: 'Generating summary',
    stopped_listening: 'Stopped listening',
    stopped_playback: 'Stopped playback',
    showing_history: 'Showing history',
    history_cleared: 'History cleared',
    downloading_pdf: 'Downloading PDF',
    toggled_download_menu: 'Toggled download menu',
    text_size_increased: 'Text size increased',
    text_size_decreased: 'Text size decreased',
    opening_updates: 'Opening updates',
    closing_popup: 'Closing popup',
    going_back: 'Going back',
    sorry_not_recognized: "Sorry, command not recognized",
    no_result_to_share: 'No result to share!',
    no_content_to_save: 'No content to save!',
    default_result_message: "🎥 Open a YouTube video and click 'Summarize' to get its AI summary.",
    no_saved_summaries: '<i>No saved summaries yet.</i>',
    language_set_to: 'Language set to',
    api_key_missing: 'API key not found. Please set it in the extension options.',
    please_open_youtube: '⚠️ Please open a YouTube video page to summarize.',
    transcript_retrieval_failed: '❌ Could not retrieve transcript. Open the transcript panel on the YouTube video and try again.',
    summary_unavailable: 'No summary available.',
    opened_whatsapp: 'Opened WhatsApp share',
    opened_twitter: 'Opened Twitter share',
    opened_facebook: 'Opened Facebook share',
    opened_linkedin: 'Opened LinkedIn share',
    share_link_copied: 'Share link copied'
  },
  hi: {
    voice: 'वॉइस',
    listening: 'सुन रहा है...',
    speaker: 'स्पीकर',
    stop: 'रोकें',
    copied: 'कॉपि किया गया!',
    reading_summary_aloud: 'सार पढ़ रहा है',
    generating_brief_summary: 'संक्षेप सार तैयार किया जा रहा है',
    generating_detailed_summary: 'विस्तृत सार तैयार किया जा रहा है',
    generating_bullet_summary: 'बुलेट बिंदु सार तैयार किया जा रहा है',
    generating_summary: 'सार तैयार किया जा रहा है',
    stopped_listening: 'सुनना बंद किया गया',
    stopped_playback: 'प्लेबैक बंद किया गया',
    showing_history: 'इतिहास दिखा रहे हैं',
    history_cleared: 'इतिहास साफ़ किया गया',
    downloading_pdf: 'PDF डाउनलोड कर रहा है',
    toggled_download_menu: 'डाउनलोड मेन्यू टॉगल हुआ',
    text_size_increased: 'पाठ आकार बढ़ गया',
    text_size_decreased: 'पाठ आकार कम हुआ',
    opening_updates: 'अपडेट खोल रहे हैं',
    closing_popup: 'पॉपअप बंद कर रहा है',
    going_back: 'वापस जा रहे हैं',
    sorry_not_recognized: 'क्षमा करें, कमांड मान्यता प्राप्त नहीं हुआ',
    no_result_to_share: 'साझा करने के लिए परिणाम नहीं!',
    no_content_to_save: 'सहेजने के लिए कोई सामग्री नहीं!',
    default_result_message: "🎥 YouTube वीडियो खोलें और इसकी AI सारांश प्राप्त करने के लिए 'Summarize' पर क्लिक करें।",
    no_saved_summaries: '<i>अभी तक कोई सहेजा गया सारांश नहीं।</i>',
    language_set_to: 'भाषा सेट की गई',
    api_key_missing: 'API कुंजी नहीं मिली। कृपया एक्सटेंशन विकल्पों में सेट करें।',
    please_open_youtube: '⚠️ कृपया सारांश बनाने के लिए एक YouTube वीडियो पेज खोलें।',
    transcript_retrieval_failed: '❌ ट्रांसक्रिप्ट प्राप्त नहीं कर सका। YouTube वीडियो पर ट्रांसक्रिप्ट पैनल खोलें और पुन: प्रयास करें।',
    summary_unavailable: 'कोई सार उपलब्ध नहीं।',
    opened_whatsapp: 'WhatsApp साझा खोला',
    opened_twitter: 'Twitter साझा खोला',
    opened_facebook: 'Facebook साझा खोला',
    opened_linkedin: 'LinkedIn साझा खोला',
    share_link_copied: 'साझा लिंक कॉपी हुआ'
  },
  es: {
    voice: 'Voz',
    listening: 'Escuchando...',
    speaker: 'Altavoz',
    stop: 'Detener',
    copied: '¡Copiado!',
    reading_summary_aloud: 'Leyendo el resumen',
    generating_brief_summary: 'Generando resumen breve',
    generating_detailed_summary: 'Generando resumen detallado',
    generating_bullet_summary: 'Generando resumen en viñetas',
    generating_summary: 'Generando resumen',
    stopped_listening: 'Dejó de escuchar',
    stopped_playback: 'Reproducción detenida',
    showing_history: 'Mostrando historial',
    history_cleared: 'Historial borrado',
    downloading_pdf: 'Descargando PDF',
    toggled_download_menu: 'Menú de descarga alternado',
    text_size_increased: 'Tamaño de texto aumentado',
    text_size_decreased: 'Tamaño de texto reducido',
    opening_updates: 'Abriendo actualizaciones',
    closing_popup: 'Cerrando ventana',
    going_back: 'Regresando',
    sorry_not_recognized: 'Lo siento, comando no reconocido',
    no_result_to_share: '¡No hay resultado para compartir!',
    no_content_to_save: '¡No hay contenido para guardar!',
    default_result_message: "🎥 Abra un video de YouTube y haga clic en 'Summarize' para obtener su resumen de IA.",
    no_saved_summaries: '<i>No hay resúmenes guardados todavía.</i>',
    language_set_to: 'Idioma establecido en',
    api_key_missing: 'Clave de API no encontrada. Por favor configúrela en las opciones de la extensión.',
    please_open_youtube: '⚠️ Abra una página de video de YouTube para resumir.',
    transcript_retrieval_failed: '❌ No se pudo obtener la transcripción. Abra el panel de transcripción en el video de YouTube e intente de nuevo.',
    summary_unavailable: 'No hay resumen disponible.',
    opened_whatsapp: 'Compartir en WhatsApp abierto',
    opened_twitter: 'Compartir en Twitter abierto',
    opened_facebook: 'Compartir en Facebook abierto',
    opened_linkedin: 'Compartir en LinkedIn abierto',
    share_link_copied: 'Enlace para compartir copiado'
  }
  // Add more languages as needed
};

function langKey(code){
  if(!code) return 'en';
  return code.split('-')[0].toLowerCase();
}

function t(key){
  const k = langKey(CURRENT_LANG || LANG_DEFAULT);
  if(TRANSLATIONS[k] && TRANSLATIONS[k][key]) return TRANSLATIONS[k][key];
  if(TRANSLATIONS.en && TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];
  return key;
}

// Wait for DOM
window.addEventListener("DOMContentLoaded", () => {
  initVoiceSystem();
  restoreBackgroundOnLoad();
  attachEventListeners();
  // initialize font controls after DOM is ready
  try{
    const resultDiv = document.getElementById('result');
    if(resultDiv){
      const computed = window.getComputedStyle(resultDiv).fontSize;
      currentFontSize = parseInt(computed,10) || 14;
      resultDiv.style.fontSize = currentFontSize + 'px';
    }
    const inc = document.getElementById('increase-font');
    const dec = document.getElementById('decrease-font');
    if(inc){ inc.addEventListener('click', ()=>{ currentFontSize = (currentFontSize||14) + 2; applyFontSize(); }); }
    if(dec){ dec.addEventListener('click', ()=>{ currentFontSize = Math.max(8,(currentFontSize||14) - 2); applyFontSize(); }); }
  }catch(e){console.warn('font init failed',e);}
  document.body.classList.add('page-loaded');
});

function applyFontSize(){
  const resultDiv = document.getElementById('result');
  if(!resultDiv || !currentFontSize) return;
  resultDiv.style.fontSize = currentFontSize + 'px';
  // apply to children for consistency
  resultDiv.querySelectorAll('*').forEach(el=>{ el.style.fontSize = currentFontSize + 'px'; });
}

// -------------------- VOICE SYSTEM --------------------
function initVoiceSystem() {
  function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices() || [];
  }
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  // Initialize speech recognition (if available)
  initSpeechRecognition();
}

function initSpeechRecognition(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    // No recognition available; voice button will notify user on click
    recognition = null;
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = CURRENT_LANG;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isRecognizing = true;
    const btn = document.getElementById("voice-btn");
    if(btn) btn.innerHTML = '<i class="fa-solid fa-microphone-slash" style="color:black;"></i> ' + t('listening');
  };

  recognition.onend = () => {
    isRecognizing = false;
    const btn = document.getElementById("voice-btn");
    if(btn) btn.innerHTML = '<i class="fa-solid fa-microphone" style="color:black;"></i> ' + t('voice');
  };

  recognition.onerror = (ev) => {
    console.warn('Speech recognition error', ev.error);
    isRecognizing = false;
    const btn = document.getElementById("voice-btn");
    if(btn) btn.innerHTML = '<i class="fa-solid fa-microphone" style="color:black;"></i> ' + t('voice');
    if(ev.error==='not-allowed' || ev.error==='service-not-allowed'){
      alert('Speech recognition permission denied or not available in this context. Please allow microphone access for the extension in Chrome settings.');
    } else {
      // generic error
      // console.warn(ev);
    }
  };

  recognition.onresult = (ev) => {
    const transcript = Array.from(ev.results).map(r=>r[0].transcript).join(' ').trim();
    // Do NOT display the transcript in the result area (privacy / UX requirement)
    try{
      const feedback = handleVoiceCommand(transcript.toLowerCase());
      if(feedback){
        const lang = document.getElementById('language-select')?.value || LANG_DEFAULT;
        // feedback can be a string or an object with {message, pitch, rate}
        if(typeof feedback === 'string'){
          speakFeedback(feedback, typeof lang === 'string' ? (lang==='auto'?LANG_DEFAULT:lang) : LANG_DEFAULT);
        }else if(typeof feedback === 'object' && feedback.message){
          speakFeedbackWithOptions(feedback.message, typeof lang === 'string' ? (lang==='auto'?LANG_DEFAULT:lang) : LANG_DEFAULT, { pitch: feedback.pitch, rate: feedback.rate });
        }
      }
    }catch(err){
      console.error('Error handling voice command', err);
    }
  };
}

// speak a short TTS confirmation
function speakFeedback(message, lang = "en-US"){
  if(!message || !window.speechSynthesis) return;
  try{
    const ut = new SpeechSynthesisUtterance(message);
    ut.lang = lang;
    // allow optional audio options passed as third argument via global variable hack (caller now always passes opts in new signature)
    // but keep compatibility by checking a local variable 'speakFeedback.lastOpts' if present.
    const opts = speakFeedback._lastOpts || {};
    if(opts.pitch) ut.pitch = opts.pitch;
    if(opts.rate) ut.rate = opts.rate;
    if(opts.volume) ut.volume = opts.volume;
    window.speechSynthesis.speak(ut);
    // clear last opts after speaking
    speakFeedback._lastOpts = null;
  }catch(e){
    console.warn('speakFeedback failed', e);
  }
}

// helper wrapper to call speakFeedback with options
function speakFeedbackWithOptions(message, lang = 'en-US', opts = {}){
  speakFeedback._lastOpts = opts || {};
  speakFeedback(message, lang);
}

function toggleRecognition(){
  if(!recognition){
    alert('Speech recognition is not available in this browser/extension context. Use Chrome on desktop and ensure mic permission is allowed.');
    return;
  }
  try{
    if(!isRecognizing){
      recognition.start();
    }else{
      recognition.stop();
    }
  }catch(e){
    console.warn('toggleRecognition error', e);
  }
}

function handleVoiceCommand(text){
  if(!text) return;
  // helpful debug: log the raw transcript for diagnostics (not shown in UI)
  try{ console.debug('[voice] transcript:', text); }catch(e){}
  // map common words
  if(text.includes('stop listening') || text.includes('stop recognition')){
    if(recognition) recognition.stop();
    return t('stopped_listening');
  }

  // Stop speech output
  if(text.match(/\bstop\b/) && isSpeaking){
    stopSpeaking();
    return t('stopped_playback');
  }

  // Set summary type
  if(text.includes('brief summary') || text.includes('brief')){
    const sel = document.getElementById('summary-type'); if(sel) sel.value='brief';
    // trigger the same UI action as clicking Summarize
    document.getElementById('summarize')?.click();
    return t('generating_brief_summary');
  }
  if(text.includes('detailed summary') || text.includes('detailed')){
    const sel = document.getElementById('summary-type'); if(sel) sel.value='detailed';
    document.getElementById('summarize')?.click();
    return t('generating_detailed_summary');
  }
  if(text.includes('bullet') || text.includes('bullets')){
    const sel = document.getElementById('summary-type'); if(sel) sel.value='bullets';
    document.getElementById('summarize')?.click();
    return t('generating_bullet_summary');
  }

  // Summarize (generic) — accept various spellings and partial matches
  if(text.includes('summar') || text.includes('summarize') || text.includes('summarise') || text.includes('summary')){
    document.getElementById('summarize')?.click();
    return t('generating_summary');
  }

  // Copy
  if(text.includes('copy') || text.includes('clipboard')){ onCopyClick(); return t('copied'); }

  // Speak / read out
  if(text.includes('read') || text.includes('speak') || text.includes('listen')){ onSpeakClick(); return t('reading_summary_aloud'); }

  // Show history or clear history
  if(text.includes('history')){ loadHistory(); return t('showing_history'); }
  if(text.includes('clear history')){
    chrome.storage.local.remove('summaryHistory',()=>{});
    return t('history_cleared');
  }

  // Download pdf
  if(text.includes('download') || text.includes('pdf')){ saveFile('PDF'); return t('downloading_pdf'); }

  // Set language by keyword
  const langMap = {
    'hindi':'hi-IN','english':'en-US','spanish':'es-ES','french':'fr-FR','german':'de-DE','portuguese':'pt-BR','chinese':'zh-CN','russian':'ru-RU','arabic':'ar-SA'
  };
  for(const name in langMap){ if(text.includes(name)){ const sel=document.getElementById('language-select'); if(sel){ sel.value = langMap[name]; } return t('language_set_to') + ' ' + name; } }

  // Share platform shortcuts (click the matching share button)
  if(text.includes('whatsapp')){ document.querySelector('.share-btn[data-platform="whatsapp"]')?.click(); return t('opened_whatsapp') || 'Opened WhatsApp share'; }
  if(text.includes('twitter')){ document.querySelector('.share-btn[data-platform="twitter"]')?.click(); return t('opened_twitter') || 'Opened Twitter share'; }
  if(text.includes('facebook')){ document.querySelector('.share-btn[data-platform="facebook"]')?.click(); return t('opened_facebook') || 'Opened Facebook share'; }
  if(text.includes('linkedin')){ document.querySelector('.share-btn[data-platform="linkedin"]')?.click(); return t('opened_linkedin') || 'Opened LinkedIn share'; }
  if(text.includes('copy link') || (text.includes('share link') && text.includes('copy'))){ copyLink(); return t('share_link_copied') || 'Share link copied'; }

  // Dropdown / menu actions
  if(text.includes('open dropdown') || text.includes('toggle download')){ document.getElementById('dropdownBtn')?.click(); return t('toggled_download_menu'); }
  if(text.includes('download pdf') || (text.includes('download') && text.includes('pdf'))){ document.getElementById('downloadPdfBtn')?.click(); return t('downloading_pdf'); }

  // Font controls
  if(text.includes('increase') || text.includes('bigger') || text.includes('zoom in')){
    document.getElementById('increase-font')?.click();
    // read the currentFontSize (updated synchronously by the click handler)
    const size = (typeof currentFontSize === 'number') ? currentFontSize : parseInt(window.getComputedStyle(document.getElementById('result')||document.body).fontSize,10) || 14;
    return { message: t('text_size_increased'), pitch: 1.25, rate: 1.05 };
  }
  if(text.includes('decrease') || text.includes('smaller') || text.includes('zoom out')){
    document.getElementById('decrease-font')?.click();
    const size = (typeof currentFontSize === 'number') ? currentFontSize : parseInt(window.getComputedStyle(document.getElementById('result')||document.body).fontSize,10) || 14;
    return { message: t('text_size_decreased'), pitch: 0.9, rate: 0.95 };
  }


  // Open updates page
  if(text.includes('updates') || text.includes('open updates')){ document.getElementById('updates-btn')?.click(); return t('opening_updates'); }

  // Close or go back
  if(text.includes('close') || text.includes('exit')){ document.getElementById('close-btn')?.click(); return t('closing_popup'); }
  if(text.includes('back') || text.includes('go back')){
    // Try to trigger the UI button, and also call history.back() directly to ensure the action happens
    document.getElementById('back-btn')?.click();
    try{ window.history.back(); }catch(e){/*ignore*/}
    return t('going_back');
  }

  // If nothing matched, return a small message (spoken) and do not modify result area
  return t('sorry_not_recognized');
}
function pickVoiceForLang(langCode) {
  if (!langCode || langCode === "auto") return null;
  const exact = availableVoices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
  if (exact) return exact;
  const prefix = langCode.split("-")[0];
  return availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix.toLowerCase())) || null;
}

// -------------------- EVENT HANDLERS --------------------
function attachEventListeners() {
  document.getElementById("summarize").addEventListener("click", onSummarizeClick);
  document.getElementById("speak-btn").addEventListener("click", onSpeakClick);
  document.getElementById("copy-btn").addEventListener("click", onCopyClick);
  document.getElementById("history-btn").addEventListener("click", loadHistory);

  ["options","summarize","copy-btn","share-btn","summary-type","history-btn"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.addEventListener("click",()=>{if(isSpeaking)stopSpeaking();});}
  });
  // Voice button: toggle speech recognition and also stop speaking on other UI clicks
  const voiceBtn = document.getElementById("voice-btn");
  if(voiceBtn){
    voiceBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(isSpeaking) stopSpeaking();
      toggleRecognition();
    });
  }

  // share / dropdown / download buttons remain unchanged
  const shareBtn=document.getElementById("share-btn");
  const shareMenu=document.getElementById("share-menu");
  shareBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    shareMenu.style.display=shareMenu.style.display==="block"?"none":"block";
  });
  document.addEventListener("click",()=>shareMenu.style.display="none");
  document.querySelectorAll(".share-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const platform=btn.dataset.platform;
      const resultText=document.getElementById("result")?.innerText?.trim()||"";
      const encodedText=encodeURIComponent(resultText);
  if(!resultText){alert(t('no_result_to_share'));return;}
      switch(platform){
        case"whatsapp":window.open(`https://wa.me/?text=${encodedText}`,"_blank");break;
        case"twitter":window.open(`https://twitter.com/intent/tweet?text=${encodedText}`,"_blank");break;
        case"facebook":window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`,"_blank");break;
        case"linkedin":window.open(`https://www.linkedin.com/sharing/share-offsite/?summary=${encodedText}`,"_blank");break;
  case"copy":navigator.clipboard.writeText(resultText).then(()=>alert(t('copied')));break;
      }
      shareMenu.style.display="none";
    });
  });

  const dropdownBtn=document.getElementById("dropdownBtn");
  const dropdownMenu=document.getElementById("dropdownMenu");
  const angleIcon=document.getElementById("angleIcon");
  dropdownBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
    angleIcon.classList.toggle("fa-angle-up");
    angleIcon.classList.toggle("fa-angle-down");
  });
  document.addEventListener("click",(event)=>{
    if(!dropdownMenu.contains(event.target)&&!dropdownBtn.contains(event.target)){
      dropdownMenu.classList.remove("show");
      angleIcon.classList.remove("fa-angle-up");
      angleIcon.classList.add("fa-angle-down");
    }
  });
  document.getElementById("downloadPdfBtn")?.addEventListener("click",()=>saveFile("PDF"));
  document.getElementById("copyLinkBtn")?.addEventListener("click",copyLink);

  // Language select: when changed, update CURRENT_LANG, recognition lang, and UI labels
  const langSel = document.getElementById('language-select');
  if(langSel){
    // initialize CURRENT_LANG from the control
    CURRENT_LANG = (langSel.value && langSel.value !== 'auto') ? langSel.value : LANG_DEFAULT;
    langSel.addEventListener('change', onLanguageChange);
  }

  // initialize UI labels according to CURRENT_LANG
  updateTextLabels();
}

// Update prominent UI labels to match selected language
// ✅ Keep Voice and Speaker buttons always in English
function updateTextLabels() {
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn)
    voiceBtn.innerHTML = '<i class="fa-solid fa-microphone" style="color:black;"></i> Voice';
  
  const speakBtn = document.getElementById('speak-btn');
  if (speakBtn)
    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high" style="color:black;"></i> Speaker';
}


// --------------------
// PATCHED (Silent language change)
// --------------------
function onLanguageChange(e){
  try{
    const val = e.target.value || 'auto';
    CURRENT_LANG = (val === 'auto') ? LANG_DEFAULT : val;

    // Update recognition language (if available)
    if(recognition) {
      try { recognition.lang = CURRENT_LANG; } catch(_) { }
    }

    // Stop any speaking (keep this part — ensures ongoing speech stops cleanly)
    if(isSpeaking) stopSpeaking();

    // ✅ Removed voice feedback — now silent on manual change
    // const selText = e.target.selectedOptions && e.target.selectedOptions[0]
    //   ? e.target.selectedOptions[0].text : val;
    // speakFeedback(t('language_set_to') + ' ' + selText, CURRENT_LANG);

    // Optional: update only result area helper text if it shows the default message
    updateTextLabels();

  } catch(err){
    console.warn('language change handler failed', err);
  }
}





// -------------------- MAIN: YOUTUBE SUMMARIZATION --------------------
async function onSummarizeClick() {
  const resultDiv=document.getElementById("result");
  resultDiv.innerHTML='<div class="loading"><div class="loader"></div></div>';

  const summaryType=document.getElementById("summary-type").value;
  const language=document.getElementById("language-select")?.value||"auto";

  chrome.storage.sync.get(["geminiApiKey"],async (res)=>{
    const apiKey=res.geminiApiKey;
    if(!apiKey){
      resultDiv.innerText = t('api_key_missing');
      return;
    }

    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab.url.includes("youtube.com/watch")){
      resultDiv.innerText = t('please_open_youtube');
      return;
    }

    try{
      const [{result:transcript}] = await chrome.scripting.executeScript({
        target:{tabId:tab.id},
        func:getTranscriptFromPage
      });

      if(!transcript){
        resultDiv.innerHTML = '<p style="color:orange;">' + t('transcript_retrieval_failed') + '</p>';
        return;
      }

      const summary = await summarizeVideoTranscript(transcript, summaryType, apiKey, language);
      resultDiv.innerHTML=summary;
      saveSummaryToHistory(tab, summary, summaryType);

    }catch(err){
      console.error("Summarization error:",err);
      resultDiv.innerText=`Error: ${err.message||"Failed to summarize video."}`;
    }
  });
}

function getTranscriptFromPage(){
  const transcriptElements=document.querySelectorAll("ytd-transcript-segment-renderer yt-formatted-string");
  if(transcriptElements.length>0){
    return Array.from(transcriptElements).map(e=>e.textContent.trim()).join(" ");
  }
  return null;
}

async function summarizeVideoTranscript(transcript, summaryType, apiKey, language){
  const promptMap={
    brief:"Provide a concise and readable summary of the following YouTube video transcript in one short paragraph.",
    detailed:"Provide a detailed structured summary with bullet points highlighting all main topics and takeaways from this YouTube video transcript."
  };
  const prompt=`${promptMap[summaryType]||promptMap.brief}\n\nTranscript:\n${transcript}\n\nRespond in ${language==="auto"?"the same language as the transcript":language}.`;

  const res=await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
  });
  if(!res.ok){
    const data=await res.json();
    throw new Error(data.error?.message||"Gemini API request failed.");
  }
  const data=await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text
    ?.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    ?.replace(/\* (.*?)(?=\n|$)/g,"<li>$1</li>")
    ?.replace(/(\r\n|\n|\r)/gm,"<br>") || t('summary_unavailable');
}

// -------------------- HISTORY --------------------
function saveSummaryToHistory(tab, summary, type){
  const entry={url:tab.url,title:tab.title,summary,type,timestamp:new Date().toISOString()};
  chrome.storage.local.get(["summaryHistory"],(data)=>{
    const history=data.summaryHistory||[];
    history.unshift(entry);
    if(history.length>20)history.pop();
    chrome.storage.local.set({summaryHistory:history});
  });
}
function loadHistory(){
  const resultDiv=document.getElementById("result");
  if(showingHistory){
    resultDiv.innerHTML=lastSummaryContent||t('default_result_message');
    showingHistory=false;
    return;
  }
  lastSummaryContent=resultDiv.innerHTML;
  chrome.storage.local.get(["summaryHistory"],(data)=>{
    const history=data.summaryHistory||[];
    if(history.length===0){
      resultDiv.innerHTML = t('no_saved_summaries');
    }else{
      resultDiv.innerHTML=`
        <button id="clear-history-btn" style="background:#b33a3a;color:white;padding:6px 10px;border:none;border-radius:6px;font-size:12px;margin-bottom:10px;cursor:pointer;">🗑️ Clear History</button>
        ${history.map(h=>`
          <div class="history-item" style="margin-bottom:10px;padding:10px;background:#2a2a2a;border-radius:8px;border:1px solid #444;">
            <b style="color:#ffd700;">${h.title}</b><br>
            <small style="color:#bbb;">${new Date(h.timestamp).toLocaleString()}</small>
            <div style="white-space:pre-wrap;margin-top:6px;">${h.summary}</div>
            <a href="${h.url}" target="_blank" style="color:#4da6ff;font-size:12px;">🔗 Open Video</a>
          </div>`).join("")}
      `;
      document.getElementById("clear-history-btn").addEventListener("click",()=>{
        chrome.storage.local.remove("summaryHistory",()=>{
          resultDiv.innerHTML = '<p>' + t('history_cleared') + '</p>';
          lastSummaryContent = t('default_result_message');
        });
      });
    }
    showingHistory=true;
  });
}

// -------------------- COPY / SPEAK / PDF --------------------
function onCopyClick(){
  const text=document.getElementById("result").innerText.trim();
  if(!text)return;
  navigator.clipboard.writeText(text);
  const btn=document.getElementById("copy-btn");
  const old=btn.innerText;
  btn.innerText = t('copied');
  setTimeout(()=>btn.innerText=old,2000);
}

function stopSpeaking(){
  window.speechSynthesis.cancel();
  isSpeaking=false;
  const sp = document.getElementById("speak-btn");
  if(sp) sp.innerHTML = '<i class="fa-solid fa-volume-high" style="color:black;"></i> ' + t('speaker');
}

async function onSpeakClick(){
  const btn=document.getElementById("speak-btn");
  const text=document.getElementById("result").innerText;
  if(!text)return;
  const lang=document.getElementById("language-select")?.value||LANG_DEFAULT;
  if(!isSpeaking){
    stopSpeaking();
    currentUtterance=new SpeechSynthesisUtterance(text);
    const v=pickVoiceForLang(lang);
    if(v)currentUtterance.voice=v;
    currentUtterance.lang=lang;
    currentUtterance.onend=()=>stopSpeaking();
    window.speechSynthesis.speak(currentUtterance);
    isSpeaking=true;
    btn.innerHTML='<i class="fa-solid fa-stop" style="color:black;"></i> ' + t('stop');
  }else{stopSpeaking();}
}

async function saveFile(type){
  const text=document.getElementById("result").innerText.trim();
  if(!text){alert(t('no_content_to_save'));return;}
  if(type==="PDF"){
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF();
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("YouTube Video Summary",10,15);
    doc.setFont("helvetica","normal");doc.setFontSize(12);
    const lines=doc.splitTextToSize(text,180);
    doc.text(lines,10,30);
    const pdfBlob=doc.output("blob");
    const pdfUrl=URL.createObjectURL(pdfBlob);
    chrome.runtime.sendMessage({action:"downloadPDF",url:pdfUrl});
  }
}
function copyLink(){
  const dummy="https://example.com/share";
  navigator.clipboard.writeText(dummy).then(()=>alert(t('copied')));
}

// -------------------- THEME & BACKGROUND --------------------
document.getElementById("close-btn").onclick = () => window.close();
document.getElementById("back-btn").onclick = () => window.history.back();

let currentBackground = "";

// --- Header Checkbox Toggle ---
const checkboxEl = document.getElementById("checkbox");
const notch = document.getElementById("notch");
const check = document.getElementById("check");

// Restore checkbox state from localStorage
(function initHeaderCheckbox(){
  const saved = localStorage.getItem('headerCheckboxChecked') === '1';
  if (saved) {
    checkboxEl?.classList.add('is-checked');
    checkboxEl?.setAttribute('aria-checked', 'true');
  } else {
    checkboxEl?.classList.remove('is-checked');
    checkboxEl?.setAttribute('aria-checked', 'false');
  }
})();

// Toggle helper
function toggleHeaderCheckbox(){
  if(!checkboxEl) return;
  const nowChecked = !checkboxEl.classList.contains('is-checked');
  checkboxEl.classList.toggle('is-checked', nowChecked);
  checkboxEl.setAttribute('aria-checked', nowChecked ? 'true' : 'false');
  localStorage.setItem('headerCheckboxChecked', nowChecked ? '1' : '0');

  // Optional: if you want this to trigger saving background/theme
  if (nowChecked && typeof currentBackground !== "undefined" && currentBackground) {
    localStorage.setItem('customBackground', currentBackground);
  }
}

// Click + keyboard toggle
if(checkboxEl){
  checkboxEl.addEventListener('click', (e) => {
    e.preventDefault();
    toggleHeaderCheckbox();
  });

  checkboxEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleHeaderCheckbox();
    }
  });
}

// Background swatches - assign handlers
function applyBackground(bg){
  document.body.style.background = bg;
  // keep height behavior as your original code used
  document.body.style.height = '350px';
}

["white-black","black-blue","yellow-green","red-pink","black-red"].forEach(id => {
  const el = document.getElementById(id);
  if(!el) return;
  el.onclick = () => {
    const icon = el.querySelector("i");
    const bg = icon ? window.getComputedStyle(icon).backgroundImage : "";
    currentBackground = bg;
    applyBackground(bg);
  };
});

// Restore custom background saved earlier
function restoreBackgroundOnLoad(){
  const saved = localStorage.getItem('customBackground');
  if(saved){ currentBackground = saved; applyBackground(saved); }
}
restoreBackgroundOnLoad();

// open updates popup
document.getElementById("updates-btn")?.addEventListener("click", () => {
  chrome.windows.create({ url: "updates.html", type: "popup", width: 420, height: 320 });
});


// -------------------- DEFAULT MESSAGE --------------------

document.getElementById("result").innerHTML="🎥 Open a YouTube video and click 'Summarize' to get its AI summary.";




// for Zoom in and zoom out option work correctly
// default or baseline

function applyFontSize() {
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.style.fontSize = currentFontSize + "px";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    const computedSize = window.getComputedStyle(resultDiv).fontSize;
    currentFontSize = parseInt(computedSize, 10); // set baseline
  }

  // Buttons
  const incBtn = document.getElementById("increase-font");
  const decBtn = document.getElementById("decrease-font");

  if (incBtn) {
    incBtn.addEventListener("click", () => {
      currentFontSize += 2;
      applyFontSize();
    });
  }

  if (decBtn) {
    decBtn.addEventListener("click", () => {
      if (currentFontSize > 8) {
        currentFontSize -= 2;
        applyFontSize();
      }
    });
  }
});


// Function to auto-detect and open the YouTube transcript
document.getElementById("summarize").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url.includes("youtube.com/watch")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: openYouTubeTranscript
    });
  } else {
    alert("Please open a YouTube video first!");
  }
});

function openYouTubeTranscript() {
  console.log("🟢 Trying to open transcript...");
  const findButton = () => {
    const button =
      document.querySelector('tp-yt-paper-button[aria-label="Show transcript"]') ||
      document.querySelector('ytd-button-renderer[aria-label="Show transcript"]') ||
      document.querySelector('button[aria-label="Show transcript"]') ||
      document.querySelector("#button-container button[aria-label='Show transcript']") ||
      document.querySelector(".yt-spec-touch-feedback-shape__fill");

    if (button) {
      button.click();
      console.log("✅ Transcript opened!");
    } else {
      console.log("❌ Transcript button not found, retrying...");
      setTimeout(findButton, 1000);
    }
  };
  findButton();
}

document.getElementById("result").innerHTML = t('default_result_message');

