// --- Globals ---
const LANG_DEFAULT = "en-US";
let availableVoices = [];
let chosenVoice = null;
let isSpeaking = false;
let currentUtterance = null;
let showingHistory = false;
let lastSummaryContent = "";

// Wait for DOM
window.addEventListener("DOMContentLoaded", () => {
  initVoiceSystem();
  restoreBackgroundOnLoad();
  attachEventListeners();
  document.body.classList.add('page-loaded');
});

// -------------------- VOICE SYSTEM --------------------
function initVoiceSystem() {
  function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices() || [];
  }
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
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
      if(!resultText){alert("No result to share!");return;}
      switch(platform){
        case"whatsapp":window.open(`https://wa.me/?text=${encodedText}`,"_blank");break;
        case"twitter":window.open(`https://twitter.com/intent/tweet?text=${encodedText}`,"_blank");break;
        case"facebook":window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`,"_blank");break;
        case"linkedin":window.open(`https://www.linkedin.com/sharing/share-offsite/?summary=${encodedText}`,"_blank");break;
        case"copy":navigator.clipboard.writeText(resultText).then(()=>alert("Copied!"));break;
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
      resultDiv.innerText="API key not found. Please set it in the extension options.";
      return;
    }

    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab.url.includes("youtube.com/watch")){
      resultDiv.innerText="⚠️ Please open a YouTube video page to summarize.";
      return;
    }

    try{
      const [{result:transcript}] = await chrome.scripting.executeScript({
        target:{tabId:tab.id},
        func:getTranscriptFromPage
      });

      if(!transcript){
        resultDiv.innerHTML="<p style='color:orange;'>❌ Could not retrieve transcript.<br>Open the transcript panel on the YouTube video and try again.</p>";
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
    ?.replace(/(\r\n|\n|\r)/gm,"<br>") || "No summary available.";
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
    resultDiv.innerHTML=lastSummaryContent||"🎥 Open a YouTube video and click 'Summarize' to generate an AI summary.";
    showingHistory=false;
    return;
  }
  lastSummaryContent=resultDiv.innerHTML;
  chrome.storage.local.get(["summaryHistory"],(data)=>{
    const history=data.summaryHistory||[];
    if(history.length===0){
      resultDiv.innerHTML="<p><i>No saved summaries yet.</i></p>";
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
          resultDiv.innerHTML="<p><i>History cleared.</i></p>";
          lastSummaryContent="🎥 Open a YouTube video and click 'Summarize' to generate an AI summary.";
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
  btn.innerText="Copied!";
  setTimeout(()=>btn.innerText=old,2000);
}

function stopSpeaking(){
  window.speechSynthesis.cancel();
  isSpeaking=false;
  document.getElementById("speak-btn").innerHTML='<i class="fa-solid fa-volume-high" style="color:black;"></i> Speaker';
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
    btn.innerHTML='<i class="fa-solid fa-stop" style="color:black;"></i> Stop';
  }else{stopSpeaking();}
}

async function saveFile(type){
  const text=document.getElementById("result").innerText.trim();
  if(!text){alert("No content to save!");return;}
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
  navigator.clipboard.writeText(dummy).then(()=>alert("Link copied!"));
}

// -------------------- THEME & BACKGROUND --------------------
document.getElementById("close-btn").onclick=()=>window.close();
document.getElementById("back-btn").onclick=()=>window.history.back();
let currentBackground="";
const notch=document.getElementById("notch"),check=document.getElementById("check");

function applyBackground(bg){document.body.style.background=bg;document.body.style.height='350px';}
["white-black","black-blue","yellow-green","red-pink","black-red"].forEach(id=>{
  const el=document.getElementById(id);
  if(!el)return;
  el.onclick=()=>{
    const bg=window.getComputedStyle(el.querySelector("i")).backgroundImage;
    currentBackground=bg;applyBackground(bg);
  };
});
check.onclick=(e)=>{e.preventDefault();if(currentBackground){localStorage.setItem('customBackground',currentBackground);notch.style.display="none";check.style.opacity="1";}};
function restoreBackgroundOnLoad(){
  const saved=localStorage.getItem('customBackground');
  if(saved){currentBackground=saved;applyBackground(saved);}
}
document.getElementById("updates-btn").addEventListener("click",()=>chrome.windows.create({url:"updates.html",type:"popup",width:420,height:320}));

// -------------------- DEFAULT MESSAGE --------------------
document.getElementById("result").innerHTML="🎥 Open a YouTube video and click 'Summarize' to get its AI summary.";
