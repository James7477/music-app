'use strict';
// V6: a functional solo/duet selector for local recordings, not AI duet synthesis.
let duetPickerOpen = false;
const duetEls = {
  solo:document.getElementById('modeSoloBtn'),
  duet:document.getElementById('modeDuetBtn'),
  soloPanel:document.getElementById('soloPanel'),
  duetPanel:document.getElementById('duetPanel'),
  s1:document.getElementById('duetSinger1'),
  s2:document.getElementById('duetSinger2'),
  homeStatus:document.getElementById('duetHomeStatus'),
  studioStatus:document.getElementById('studioDuetStatus'),
};
function updateDuetHome(){
  const isDuet=duetPickerOpen || duetMode;
  duetEls.solo.classList.toggle('is-selected',!isDuet);
  duetEls.duet.classList.toggle('is-selected',isDuet);
  duetEls.solo.setAttribute('aria-pressed',String(!isDuet));
  duetEls.duet.setAttribute('aria-pressed',String(isDuet));
  duetEls.soloPanel.hidden=isDuet;
  duetEls.duetPanel.hidden=!isDuet;
  const a = duetEls.s1.value || activeSingerId || '';
  const b = duetEls.s2.value || duetPartnerId || '';
  for(const [select,val] of [[duetEls.s1,a],[duetEls.s2,b]]){
    select.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='Choose singer';select.append(empty);
    for(const profile of singerProfiles){const el=document.createElement('option');el.value=profile.id;el.textContent=profile.name;select.append(el)}
    select.value=singerProfiles.some(x=>x.id===val)?val:'';
  }
  // After loading, suggest the saved pair; never silently assign a second singer.
  if(duetMode && singerProfiles.some(p=>p.id===duetPartnerId) && duetEls.s2.value!==duetPartnerId) duetEls.s2.value=duetPartnerId;
  const first = singerProfiles.find(p=>p.id===activeSingerId);
  const second = singerProfiles.find(p=>p.id===duetPartnerId);
  const ready=Boolean(duetMode&&first&&second&&first.id!==second.id);
  duetEls.homeStatus.textContent=ready ? '🎶 Duet saved: '+first.name+' + '+second.name+'. Both can sing together into one microphone in Studio.' : duetPickerOpen ? 'Add or choose two consenting voice profiles, then tap Save My Duet.' : first ? '🎙️ Solo singer: '+first.name : 'Add a singer to start recording.';
  duetEls.studioStatus.textContent=ready ? '🎤 Duet recording: '+first.name+' + '+second.name+'. Sing together into the phone microphone; AI duet generation is coming later.' : '🎙️ Solo recording selected. For a duet, choose two singers on Home first.';
}
window.updateDuetHome=updateDuetHome;
function setLineupMode(duet){
  duetPickerOpen=duet;
  if(!duet){
    duetMode=false;duetPartnerId=null;
    op('meta','put',{mode:'solo',partnerId:null},'duetSettings').catch(e=>note('Unable to save solo mode: '+e.message,true));
    singerLabel();
    duetPickerOpen=false;
    updateDuetHome();
    note('Solo recording selected.');
  }else{
    updateDuetHome();
    if(singerProfiles.length<2)note('For a duet, add two consenting singer profiles in Voice Profiles.',true);
  }
}
duetEls.solo.addEventListener('click',()=>setLineupMode(false));
duetEls.duet.addEventListener('click',()=>setLineupMode(true));
document.getElementById('saveDuetBtn').addEventListener('click',async()=>{
  const a=duetEls.s1.value,b=duetEls.s2.value;
  if(!a||!b){note('Choose both singers for your duet.',true);return}
  if(a===b){note('Choose two different singers.',true);return}
  if(!singerProfiles.some(p=>p.id===a && p.consented) || !singerProfiles.some(p=>p.id===b && p.consented)){note('Both singers need consenting voice profiles first.',true);return}
  if(profileRecorder?.state==='recording' || karaoke?.rec?.state==='recording'){note('Finish the current recording before changing your duet.',true);return}
  try{
    activeSingerId=a;duetPartnerId=b;duetMode=true;duetPickerOpen=false;
    await op('meta','put',activeSingerId,'activeSingerId');
    await op('meta','put',{mode:'duet',partnerId:duetPartnerId},'duetSettings');
    singerLabel();updateDuetHome();note('Duet saved! Open Studio and record both singers together on one microphone.');
  }catch(e){note('Could not save duet: '+e.message,true)}
});
for(const button of document.querySelectorAll('[data-go-tab]')) button.addEventListener('click',()=>tab(button.dataset.goTab));
for(const button of document.querySelectorAll('[data-pick-genre]')) button.addEventListener('click',()=>{
  document.getElementById('aiGenre').value=button.dataset.pickGenre;
  selectGenre();
  tab('studio');
  note(button.dataset.pickGenre+' selected. Tap Preview This Genre to play the original instrumental demo.');
});
updateDuetHome();
