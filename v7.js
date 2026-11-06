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

  function updatePage(){showPlaylists();drawPlayer();showLineup();
    get('v7WaveCard')?.classList.toggle('is-recording',Boolean(karaoke&&karaoke.rec?.state==='recording'));
  }

  ['instrumental','original'].forEach(k=>get(k==='original'?'v7SourceOriginal':'v7SourceInstrumental').addEventListener('click',()=>{
    preferredSource=k;drawPlayer();
  }));
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
  get('playlistFilter').addEventListener('change',showPlaylists);
  get('karaokeStartBtn').addEventListener('click',()=>get('v7WaveCard')?.classList.add('is-recording'));
  get('karaokeStopBtn').addEventListener('click',()=>get('v7WaveCard')?.classList.remove('is-recording'));
  // Wrap existing view rendering, without replacing the V2/V6 data model.
  const originalRenderAll=renderAll;
  renderAll=function(){originalRenderAll();updatePage();};
  const originalRenderLibrary=renderLibrary;
  renderLibrary=function(){originalRenderLibrary();showPlaylists();drawPlayer();};
  const originalTab=tab;
  tab=function(name){
    if(name!=='library' && !player.paused)player.pause();
    originalTab(name);
    updatePage();
  };
  // Cleanup local blob URLs on navigation away.
  window.addEventListener('pagehide',()=>{player.pause();if(playerUrl){URL.revokeObjectURL(playerUrl);playerUrl=null;}});
  // Initial render is also called after IndexedDB finishes loading via renderAll().
  showPlaylists();showLineup();
})();
