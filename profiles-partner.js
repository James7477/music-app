'use strict';
// V5 uses only this device's browser storage for singers and audio.
// No external API keys, paid generations, affiliate tracking, or automatic voice cloning.
let singerProfiles = [];
let activeSingerId = null;
let duetMode = false;
let duetPartnerId = null;
let profileRecorder = null;
let profileStream = null;
let profileAudioURL = null;
const demoMap = { Country:'country', Rock:'rock', 'Southern Rock':'rock', Blues:'blues', Pop:'pop' };
const validAudio = f => !!(f && (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|webm|ogg|opus|flac)$/i.test(f.name)));
const selectedSinger = () => singerProfiles.find(x => x.id === activeSingerId) || null;
window.getActiveSingerInfo = () => {
  const x = selectedSinger();
  const partner=singerProfiles.find(p=>p.id===duetPartnerId);
  if(duetMode && x && partner && x.id!==partner.id) return {singerId:'duet_'+x.id+'_'+partner.id, singerName:x.name+' + '+partner.name};
  return x ? { singerId:x.id, singerName:x.name } : { singerId:null, singerName:'Guest' };
};
function singerLabel() {
  const s = selectedSinger();
  const duetMate=duetMode ? singerProfiles.find(x=>x.id===duetPartnerId && x.id!==activeSingerId) : null;
  $('activeSingerName').textContent = s ? (duetMate ? s.name+' + '+duetMate.name : s.name) : 'Guest (no voice profile)';
  $('activeSingerStatus').textContent = s
    ? (duetMate ? 'Live duet selected • record together on one mic' : (s.blob ? 'Voice sample saved on this phone ✓' : 'No voice sample recorded yet'))
    : 'Choose or add a singer to save a sample.';
  if (s?.blob) {
    if (profileAudioURL) URL.revokeObjectURL(profileAudioURL);
    profileAudioURL = URL.createObjectURL(s.blob);
    $('profileAudio').src = profileAudioURL;
    $('profileAudio').hidden = false;
  } else {
    if (profileAudioURL) URL.revokeObjectURL(profileAudioURL);
    profileAudioURL = null;
    $('profileAudio').pause();
    $('profileAudio').removeAttribute('src');
    $('profileAudio').hidden = true;
  }
  $('profileState').textContent = s ? (s.blob ? 'Saved voice recording ready. You can switch to another singer without losing it.' : 'Record once below to save this singer’s voice.') : 'Add and select a singer above to record a voice sample.';
  $('startProfileRecording').disabled = !s;
  $('profileFile').disabled = !s;
  $('deleteProfileSample').disabled = !s?.blob;
  $('downloadProfileSample').disabled = !s?.blob;
  const singers = $('singerList'); singers.replaceChildren();
  if (!singerProfiles.length) singers.append(textElem('div','No saved singers yet. Add one below to get started.','empty'));
  for (const profile of singerProfiles) {
    const wrapper = textElem('div','','singerlist-item' + (profile.id === activeSingerId ? ' current':''));
    const label = textElem('div','');
    label.append(textElem('strong',(profile.id === activeSingerId ? '🎤 ':'')+profile.name),textElem('small',profile.blob?'Voice sample saved ✓':'No voice sample'));
    const actions = textElem('div','','singerlist-actions');
    actions.append(pbtn(profile.id === activeSingerId?'Selected ✓':'Use Singer','secondary small', async () => {
      if(profileRecorder) { note('Stop recording before switching singers.',true);return; }
      await selectSinger(profile.id);
      tab('voices');
    }));
    actions.append(pbtn('Delete','ghost small danger',async()=>{
      if(profileRecorder){note('Stop recording before deleting a singer.',true);return;}
      if(!confirm(`Delete the saved profile and sample for ${profile.name}? Your finished songs stay in My Recordings.`))return;
      try{
        await op('profiles','delete',profile.id);
        singerProfiles = singerProfiles.filter(x=>x.id!==profile.id);
        if(activeSingerId===profile.id)await selectSinger(singerProfiles[0]?.id||null);
        else singerLabel();
        if(duetPartnerId===profile.id) {duetMode=false;duetPartnerId=null;await op('meta','put',{mode:'solo',partnerId:null},'duetSettings');}
        window.updateDuetHome?.();
        note('Singer profile removed. Existing saved recordings were kept.');
      }catch(e){note('Could not delete singer: '+e.message,true)}
    }));
    wrapper.append(label,actions);singers.append(wrapper);
  }
}
window.aiRenderProfiles=singerLabel;
async function selectSinger(id){
  activeSingerId=id;
  duetMode=false;duetPartnerId=null;
  await op('meta','put',{mode:'solo',partnerId:null},'duetSettings');
  await op('meta','put',activeSingerId,'activeSingerId');
  singerLabel();
  window.updateDuetHome?.();
}
async function addSinger(){
  const name=$('newSingerName').value.trim();
  if(!name){note('Type a name for this singer.',true);return}
  if(!$('profileConsent').checked){note('Get the singer’s permission before creating their voice profile.',true);return}
  const s={id:uid(),name:name.slice(0,50),blob:null,createdAt:Date.now(),consented:true};
  try{
    await op('profiles','put',s);singerProfiles.push(s);await selectSinger(s.id);
    $('newSingerName').value='';$('profileConsent').checked=false;
    note(name+' is now the active singer. Record a voice sample once and it stays with this profile.');
  }catch(e){note('Could not save voice profile: '+e.message,true)}
}
async function keepSample(blob){
  const s=selectedSinger(); if(!s||!blob?.size)throw Error('No singer or empty recording.');
  s.blob=blob;s.updatedAt=Date.now();
  await op('profiles','put',s);
  singerLabel();
  note('Saved '+s.name+'’s voice sample on this phone. You won’t have to record it again.');
}
async function startProfileRecording(){
  if(!selectedSinger()){note('Add or choose a singer first.',true);return}
  try{
    profileStream=await getStream();
    profileRecorder=createRecorder(profileStream);
    profileRecorder._finished=getBlobAfterStop(profileRecorder);
    profileRecorder.start(250);
    $('startProfileRecording').disabled=true;$('stopProfileRecording').disabled=false;
    $('profileState').textContent='Recording… speak normally for about 20–30 seconds.';
    note('Recording '+selectedSinger().name+'’s voice. Tap Stop & Save when finished.');
  }catch(e){profileStream?.getTracks().forEach(t=>t.stop());profileStream=null;profileRecorder=null;note('Microphone unavailable: '+e.message,true)}
}
async function stopProfileRecording(){
  if(!profileRecorder||profileRecorder.state!=='recording')return;
  const recorder=profileRecorder;recorder.stop();
  $('stopProfileRecording').disabled=true;
  try{
    const blob=await recorder._finished;
    await keepSample(blob);
  }catch(e){note('Could not save voice: '+e.message,true)}
  finally{
    profileStream?.getTracks().forEach(t=>t.stop());profileStream=null;profileRecorder=null;
    $('startProfileRecording').disabled=!selectedSinger();
  }
}
async function importProfile(e){
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  if(!selectedSinger()){note('Choose a singer first.',true);return}
  if(!validAudio(f)){note('Choose an MP3, M4A, WAV, or supported audio file.',true);return}
  try{await keepSample(f)}catch(err){note('Could not save voice file: '+err.message,true)}
}
async function deleteProfileSample(){
  const s=selectedSinger();if(!s?.blob)return;
  if(!confirm('Remove the saved voice sample for '+s.name+'?'))return;
  s.blob=null;s.updatedAt=Date.now();
  try{await op('profiles','put',s);singerLabel();note('Voice sample deleted from this device.')}catch(e){note('Could not remove voice: '+e.message,true)}
}
function selectGenre(){
  const genre=$('aiGenre').value;
  const file=demoMap[genre];
  if(!file){$('genrePreview').removeAttribute('src');$('genrePreview').load();note('That style is planned for future AI generation. Four original demo arrangements are available now.',true);return null}
  const src='demo/'+file+'.mp3';
  if($('genrePreview').getAttribute('src')!==src){$('genrePreview').src=src;$('genrePreview').load()}
  return file;
}
async function previewGenre(){
  const genre=selectGenre();if(!genre)return;
  try{await $('genrePreview').play()}catch(e){note('Tap the player control to play this original '+genre+' demo. '+e.message)}
}
const originalLyrics=`[Verse]\nThe road is long, the sky is wide\nA little song is by my side\nI keep the good times rolling on\nAnd find my own way with a song\n\n[Chorus]\nTurn it up and let it play\nLet the music lead the way\nCountry, rock, or blues tonight\nMake it ours and make it right`;
async function addDemoSong(){
  const existing=songs.find(s=>s.title==='Turn It Up (Original Demo)'&&s.artist==='My Voice Studio');
  if(existing){selectedSongId=existing.id;renderAll();tab('studio');note('Original demo song selected. Choose a genre to hear different arrangements.');return}
  try{
    const r=await fetch('demo/country.mp3');if(!r.ok)throw Error('Demo audio unavailable ('+r.status+')');
    const audio=await r.blob();
    const s=makeSong('Turn It Up (Original Demo)','My Voice Studio');
    s.instrumental=audio;s.lyrics=originalLyrics;s.playlist='Demo Songs';
    songs.unshift(s);await op('songs','put',s);selectedSongId=s.id;
    renderAll();tab('studio');note('Added an original demo song! Try Country, Rock, Blues, and Pop previews.');
  }catch(e){note('Could not load demo song. Open the app on GitHub Pages or a local web server. '+e.message,true)}
}
async function partnerImport(){
  const file=$('partnerFinishedAudio').files?.[0];
  if(!validAudio(file)){note('Choose a finished audio file from your phone first.',true);return}
  const title=$('partnerFinishedTitle').value.trim()||file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
  $('partnerSaveFinishedBtn').disabled=true;
  try{
    const song=makeSong(title,'AI Music Import',file);
    song.playlist='AI Creations';
    await op('songs','put',song);
    songs.unshift(song);selectedSongId=song.id;
    await saveTake({songId:song.id,blob:file,vocalBlob:null,type:'Imported AI Song',name:title+' — Finished Version'});
    $('partnerFinishedAudio').value='';$('partnerFinishedTitle').value='';
    $('partnerImportStatus').textContent='Saved to your AI Creations playlist and My Recordings.';
    tab('takes');note('Finished AI song saved on this device! Play it and download a backup any time.');
  }catch(e){note('Could not save your finished song. Storage may be full. '+e.message,true)}
  finally{$('partnerSaveFinishedBtn').disabled=false}
}
window.aiStudioInit=async()=>{
  try{
    singerProfiles=(await op('profiles','getAll')).sort((a,b)=>a.createdAt-b.createdAt);
    const duetSettings=await op('meta','get','duetSettings');
    duetMode=Boolean(duetSettings?.mode==='duet');
    duetPartnerId=duetSettings?.partnerId||null;
    const prior=await op('meta','get','activeSingerId');
    activeSingerId=singerProfiles.some(x=>x.id===prior)?prior:(singerProfiles[0]?.id||null);
    if(duetMode && (!duetPartnerId || duetPartnerId===activeSingerId || !singerProfiles.some(x=>x.id===duetPartnerId))){ duetMode=false; duetPartnerId=null; }
    singerLabel();
    window.updateDuetHome?.();
    if(activeSingerId!==prior)await op('meta','put',activeSingerId,'activeSingerId');
    selectGenre();
  }catch(e){note('Voice profiles could not load. '+e.message,true)}
};
function wireV5(){
  $('changeSingerBtn').addEventListener('click',()=>tab('voices'));
  $('addSingerBtn').addEventListener('click',addSinger);
  $('startProfileRecording').addEventListener('click',startProfileRecording);
  $('stopProfileRecording').addEventListener('click',stopProfileRecording);
  $('profileFile').addEventListener('change',importProfile);
  $('deleteProfileSample').addEventListener('click',deleteProfileSample);
  $('aiGenre').addEventListener('change',selectGenre);
  $('previewGenreBtn').addEventListener('click',previewGenre);
  $('loadDemoBtn').addEventListener('click',addDemoSong);
  $('partnerSingerBtn').addEventListener('click',()=>tab('voices'));
  $('partnerSaveFinishedBtn').addEventListener('click',partnerImport);
  $('downloadProfileSample').addEventListener('click',()=>{const s=selectedSinger();if(s?.blob)download(s.blob,s.name+'-voice-sample');});
  $('heroTryAiBtn').addEventListener('click',()=>tab('partner'));
  $('heroDemoBtn').addEventListener('click',addDemoSong);
  window.addEventListener('pagehide',()=>{
    if(profileAudioURL)URL.revokeObjectURL(profileAudioURL);
    profileStream?.getTracks().forEach(t=>t.stop());
  });
}
wireV5();
