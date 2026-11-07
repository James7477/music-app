'use strict';
// V7 additions: these controls are connected to the existing V2/V6 IndexedDB song,
// singer-profile, and karaoke workflows. No paid AI calls or automatic genre conversion.
(() => {
  let playerUrl = null;
  let renderedForSong = null;
  let renderedBlob = null;
  let preferredSource = 'instrumental';
  const player = document.getElementById('v7AudioPlayer');
  const get = id => document.getElementById(id);
  const say = msg => note(msg);
  const small = (tag, text, cls) => { const e=document.createElement(tag); e.textContent=text; if(cls)e.className=cls; return e; };

  // Keep all extra navigation inside the same five-item mobile bottom navigation.
  document.querySelectorAll('[data-v7-tab]').forEach(btn => btn.addEventListener('click', () => tab(btn.dataset.v7Tab)));

  function showPlaylists() {
    const target=get('v7PlaylistCards');
    if(!target)return;
    target.replaceChildren();
    const names=listPlaylists();
    for(const [index,name] of names.entries()) {
      const count=songs.filter(s=>s.playlist===name).length;
      const b=document.createElement('button');
      b.type='button';b.className='v7-playlist'+(get('playlistFilter').value===name?' active':'');
      b.setAttribute('aria-label',`Open ${name}: ${count} songs`);
      b.append(small('span',['❤️','🎸','🎶','💿','🎤'][index%5],'v7-p-emoji'));
      b.append(small('strong',name),small('small',`${count} ${count===1?'song':'songs'}`));
      b.addEventListener('click',()=>{
        get('playlistFilter').value=name;
        renderLibrary();
        showPlaylists();
        get('songList').scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      target.append(b);
    }
    // A functional add option, never a fictitious playlist/song count.
    const add=document.createElement('button');add.type='button';add.className='v7-playlist v7-add-playlist';
    add.append(small('span','＋','v7-p-emoji'),small('strong','Create Playlist'),small('small','Add your own songs'));
    add.addEventListener('click',()=>get('newPlaylistBtn').click());
    target.append(add);
  }

  function drawPlayer() {
    const s=selected();
    const title=get('v7NowTitle'),artist=get('v7NowArtist');
    if(!s){
      title.textContent='Choose a song';artist.textContent='Your Music Library';
      player.pause();player.removeAttribute('src');player.load();
      if(playerUrl){URL.revokeObjectURL(playerUrl);playerUrl=null;}
      renderedForSong=null;renderedBlob=null;
      updateTransport();
      return;
    }
    title.textContent=s.title;artist.textContent=s.artist||'Your library';
    if(renderedForSong!==s.id){preferredSource=s.instrumental?'instrumental':'original';get('v7SongLyrics').hidden=true;}
    const available={instrumental:s.instrumental,original:s.original};
    if(!available[preferredSource] && available[preferredSource==='original'?'instrumental':'original'])
      preferredSource=preferredSource==='original'?'instrumental':'original';
    ['instrumental','original'].forEach(k=>{
      const btn=get(k==='original'?'v7SourceOriginal':'v7SourceInstrumental');
      btn.disabled=!available[k];btn.classList.toggle('active',preferredSource===k&&Boolean(available[k]));
      btn.setAttribute('aria-pressed',String(preferredSource===k&&Boolean(available[k])));
    });
    const blob=available[preferredSource]||null;
    if(renderedBlob!==blob||renderedForSong!==s.id){
      player.pause();player.removeAttribute('src');
      if(playerUrl){URL.revokeObjectURL(playerUrl);playerUrl=null;}
      if(blob){playerUrl=URL.createObjectURL(blob);player.src=playerUrl;}
      player.load();renderedBlob=blob;renderedForSong=s.id;
    }
    get('v7AudioInfo').textContent=blob ? (
      preferredSource==='instrumental'?'Instrumental / no vocals — press Play.':'Original audio — press Play.'
    ) : 'No audio attached yet. Import an audio or instrumental file in Song Settings below.';
    get('v7DownloadSelected').disabled=!blob;
    get('v7SongLyrics').textContent=s.lyrics||'No lyrics saved yet. Add lyrics in the Recording Studio.';
    updateTransport();
  }


  // V8: play local files in the current playlist. Nothing is uploaded.
  let shuffleOn=false;
  let repeatMode='off'; // off, all, one
  let shuffleHistory=[];
  let shuffleCursor=-1;
  const hasAudio=s=>Boolean(s&&(s.original||s.instrumental));
  function playableQueue(){
    const filter=get('playlistFilter').value||'all';
    return songs.filter(s=>hasAudio(s)&&(filter==='all'||s.playlist===filter));
  }
  function resetShuffle(id){
    shuffleHistory=id?[id]:[];
    shuffleCursor=id?0:-1;
  }
  function updateTransport(){
    const s=selected(),queue=playableQueue();
    const count=queue.length,index=queue.findIndex(x=>x.id===s?.id),ready=hasAudio(s);
    get('v7PlayPause').disabled=!ready;
    get('v7PlayPause').textContent=player.paused?'▶ Play':'⏸ Pause';
    get('v7Prev').disabled=count===0;
    get('v7Next').disabled=count===0;
    get('v7PlayPlaylist').disabled=count===0;
    get('v7Shuffle').setAttribute('aria-pressed',String(shuffleOn));
    get('v7Shuffle').textContent=shuffleOn?'🔀 On':'🔀 Shuffle';
    get('v7Repeat').textContent=repeatMode==='one'?'🔂 One':repeatMode==='all'?'🔁 All':'🔁 Off';
    get('v7Repeat').setAttribute('aria-label','Repeat mode: '+repeatMode);
    get('v7Repeat').setAttribute('aria-pressed',String(repeatMode!=='off'));
    const label=get('playlistFilter').value==='all'?'All Songs':get('playlistFilter').value;
    get('v7QueueInfo').textContent=count===0?'No playable audio in '+label+'. Use Find / Import to add songs.':
      index>=0?('Track '+(index+1)+' of '+count+' in '+label+' · '+(shuffleOn?'Shuffle on':'In order')):
      ('Playlist: '+label+' · '+count+' playable track(s). Tap Play This Playlist to start.');
    const mini=get('v7MiniPlayer');
    mini.hidden=!(ready&&activeTab!=='library'&&activeTab!=='studio'&&activeTab!=='voices'&&(player.currentTime>0||!player.paused));
    get('v7MiniNow').textContent=s?.title||'Your music';
    get('v7MiniToggle').textContent=player.paused?'▶':'⏸';
  }
  async function playSelected(){
    if(!player.getAttribute('src')){note('This song has no playable audio. Import a file first.',true);return;}
    try{await player.play();updateTransport();}
    catch(e){updateTransport();note('Audio could not play. Tap Play on the audio controls or check the file format. '+e.message,true);}
  }
  async function playSong(id,fromQueue=false){
    const song=songs.find(x=>x.id===id);
    if(!hasAudio(song)){note('Choose a song with an imported audio file first.',true);return;}
    if(!fromQueue)resetShuffle(id);
    const changed=selectedSongId!==id;
    selectedSongId=id;
    if(!fromQueue&&activeTab!=='library')tab('library');
    else if(changed)renderAll();
    else drawPlayer();
    if(changed||player.ended){try{player.currentTime=0;}catch(e){}}
    if(!fromQueue&&activeTab==='library')get('selectedDetails').scrollIntoView({behavior:'smooth',block:'nearest'});
    await playSelected();
  }
  async function advance(direction,automatic=false){
    const queue=playableQueue(),cur=selected();
    if(!queue.length){if(!automatic)note('No playable songs in this playlist. Import audio first.',true);return;}
    if(automatic&&repeatMode==='one'&&hasAudio(cur)){
      try{player.currentTime=0;}catch(e){}
      await playSelected();return;
    }
    const currentIndex=queue.findIndex(x=>x.id===cur?.id);
    let target=null;
    if(shuffleOn){
      const ids=new Set(queue.map(x=>x.id));
      if(shuffleCursor<0||shuffleHistory[shuffleCursor]!==cur?.id)resetShuffle(ids.has(cur?.id)?cur.id:null);
      if(direction<0){
        if(shuffleCursor>0){shuffleCursor--;target=shuffleHistory[shuffleCursor];}
        else{try{player.currentTime=0;}catch(e){}if(!automatic)await playSelected();return;}
      }else if(shuffleCursor<shuffleHistory.length-1){
        shuffleCursor++;target=shuffleHistory[shuffleCursor];
      }else{
        const played=new Set(shuffleHistory);
        let options=queue.filter(x=>!played.has(x.id));
        if(!options.length&&repeatMode==='all'){
          options=queue.filter(x=>x.id!==cur?.id);
          resetShuffle(cur?.id);
        }
        if(!options.length){
          if(!automatic)note('End of shuffled playlist. Switch Repeat to All to continue.');
          return;
        }
        target=options[Math.floor(Math.random()*options.length)].id;
        shuffleHistory.push(target);shuffleCursor=shuffleHistory.length-1;
      }
    }else{
      if(currentIndex===-1)target=queue[0].id;
      else{
        let nextIndex=currentIndex+direction;
        if(nextIndex<0||nextIndex>=queue.length){
          if(repeatMode==='all')nextIndex=(nextIndex+queue.length)%queue.length;
          else{
            if(!automatic&&direction<0){try{player.currentTime=0;}catch(e){}await playSelected();}
            else if(!automatic)note('End of playlist. Turn Repeat to All to play again.');
            return;
          }
        }
        target=queue[nextIndex].id;
      }
    }
    if(target)await playSong(target,true);
  }

  function showLineup(){
    const duet=Boolean(duetMode);
    get('v7Solo').classList.toggle('active',!duet);
    get('v7Duet').classList.toggle('active',duet);
    get('v7Solo').setAttribute('aria-pressed',String(!duet));
    get('v7Duet').setAttribute('aria-pressed',String(duet));
    const singer=singerProfiles.find(p=>p.id===activeSingerId);
    const partner=singerProfiles.find(p=>p.id===duetPartnerId);
    get('v7Lineup').textContent=duet&&singer&&partner?
      `🎤 ${singer.name} + ${partner.name} · One-phone live duet`:
      singer?`🎙 ${singer.name} · Solo performance`:'Choose or add a consenting singer profile';
  }

  function updatePage(){showPlaylists();drawPlayer();showLineup();updateTransport();
    get('v7WaveCard')?.classList.toggle('is-recording',Boolean(karaoke&&karaoke.rec?.state==='recording'));
  }

  ['instrumental','original'].forEach(k=>get(k==='original'?'v7SourceOriginal':'v7SourceInstrumental').addEventListener('click',()=>{
    const wasPlaying=!player.paused;preferredSource=k;drawPlayer();if(wasPlaying)playSelected();
  }));
  get('v7PlayPause').addEventListener('click',()=>{if(!player.paused){player.pause();return;}if(hasAudio(selected()))playSelected();else{const q=playableQueue();if(q.length)playSong(q[0].id);}});
  get('v7PlayPlaylist').addEventListener('click',()=>{const q=playableQueue();if(!q.length){note('Import songs to play this playlist.',true);return;}resetShuffle(q[0].id);playSong(q[0].id,true);});
  get('v7Next').addEventListener('click',()=>advance(1));
  get('v7Prev').addEventListener('click',()=>advance(-1));
  get('v7Shuffle').addEventListener('click',()=>{shuffleOn=!shuffleOn;resetShuffle(selected()?.id);updateTransport();});
  get('v7Repeat').addEventListener('click',()=>{repeatMode=repeatMode==='off'?'all':repeatMode==='all'?'one':'off';updateTransport();});
  player.addEventListener('play',updateTransport);
  player.addEventListener('pause',updateTransport);
  player.addEventListener('ended',()=>advance(1,true));
  player.addEventListener('error',()=>{if(player.getAttribute('src'))note('This file could not play on your phone. Try an MP3 or M4A.',true);});
  get('v7MiniToggle').addEventListener('click',()=>{if(player.paused)playSelected();else player.pause();});
  get('v7MiniNext').addEventListener('click',()=>advance(1));
  get('v7MiniOpen').addEventListener('click',()=>{tab('library');get('selectedDetails').scrollIntoView({behavior:'smooth',block:'start'});});
  window.v7PlaySong=id=>playSong(id,false);
  get('v7ToggleLyrics').addEventListener('click',()=>{
    const lyr=get('v7SongLyrics');lyr.hidden=!lyr.hidden;
    get('v7ToggleLyrics').setAttribute('aria-expanded',String(!lyr.hidden));
  });
  get('v7RecordSelected').addEventListener('click',()=>{player.pause();tab('studio')});
  get('v7DownloadSelected').addEventListener('click',()=>{
    const song=selected();const blob=preferredSource==='instrumental'?song?.instrumental:song?.original;
    if(!blob){note('There is no audio file attached to download.',true);return;}
    download(blob,(song.title||'Song')+'-'+preferredSource);
  });
  get('v7Solo').addEventListener('click',()=>{duetEls.solo.click();showLineup()});
  get('v7Duet').addEventListener('click',()=>{
    duetEls.duet.click();
    showLineup();
    // Setup is completed explicitly on Home; do not claim the pair is ready.
    if(!duetMode){note('Choose and save both singers in the Duet Setup on Home.');tab('home');get('duetPanel').scrollIntoView({behavior:'smooth',block:'center'});}
  });
  get('playlistFilter').addEventListener('change',()=>{resetShuffle(selected()?.id);showPlaylists();updateTransport();});
  get('karaokeStartBtn').addEventListener('click',()=>get('v7WaveCard')?.classList.add('is-recording'));
  get('karaokeStopBtn').addEventListener('click',()=>get('v7WaveCard')?.classList.remove('is-recording'));
  // Wrap existing view rendering, without replacing the V2/V6 data model.
  const originalRenderAll=renderAll;
  renderAll=function(){originalRenderAll();updatePage();};
  const originalRenderLibrary=renderLibrary;
  renderLibrary=function(){originalRenderLibrary();showPlaylists();drawPlayer();};
  const originalTab=tab;
  tab=function(name){
    if(['studio','voices','takes'].includes(name) && !player.paused)player.pause();
    originalTab(name);
    updatePage();
  };
  // Cleanup local blob URLs on navigation away.
  window.addEventListener('pagehide',()=>{player.pause();if(playerUrl){URL.revokeObjectURL(playerUrl);playerUrl=null;}});
  // Initial render is also called after IndexedDB finishes loading via renderAll().
  showPlaylists();showLineup();
})();
