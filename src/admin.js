import { escapeHTML as e, formatDate } from './utils.js';

const svg={leaf:'<path d="M20 4C9 2 3 7 5 14c7 3 15-2 15-10Z"/><path d="M4 21 15 10"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',cloud:'<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11"/><path d="M12 21V11m-4 4 4-4 4 4"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',back:'<path d="M20 12H4m6-6-6 6 6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',external:'<path d="M14 3h7v7m0-7L10 14M10 3H4v17h17v-6"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',save:'<path d="M3 3h14l4 4v14H3ZM7 3v7h10V3M7 21v-7h10v7"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',exit:'<path d="M9 3H3v18h6m5-15 6 6-6 6M8 12h12"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 0 8 8 15 8-7 12-11 8-15Z"/>',phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg[name]||svg.leaf}</svg>`;
const state={session:null,records:[],record:null,tab:'couple',dirty:false,busy:false,uploading:false};
const root=document.querySelector('#admin-root');
const tabs=[['couple','Pasangan & teks'],['events','Acara & peta'],['photos','Foto & dekorasi'],['music','Musik'],['story','Cerita cinta'],['gifts','Rekening'],['sections','Komponen'],['responses','RSVP & ucapan']];
const sectionInfo=[['quote','Kata pembuka','Kutipan dan kalimat pembuka undangan.'],['couplePhoto','Foto pasangan','Foto utama pada bagian profil mempelai.'],['countdown','Hitung mundur','Menghitung waktu menuju tanggal pernikahan.'],['calendar','Simpan kalender','Tombol untuk menyimpan jadwal acara.'],['map','Peta lokasi','Menampilkan peta embed di dalam undangan.'],['story','Cerita cinta','Perjalanan dan momen penting pasangan.'],['gallery','Galeri foto','Koleksi foto yang dapat diperbesar.'],['music','Musik latar','Musik otomatis dengan tombol melayang untuk jeda/putar.'],['rsvp','Konfirmasi kehadiran','Formulir kehadiran dan jumlah tamu.'],['wishes','Ucapan & doa','Tamu menulis pesan; tayangkan setelah kamu setujui.'],['gifts','Hadiah digital','Rekening dan QR yang kamu tambahkan.'],['closing','Penutup','Ucapan terima kasih di akhir undangan.']];
let toastTimer;
function toast(message,error=false){const el=document.querySelector('#admin-toast');el.textContent=message;el.className=`studio-toast visible${error?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),6000);}
async function api(path,method='GET',body){
  const response=await fetch(path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(state.session?.csrf?{'X-CSRF-Token':state.session.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const result=await response.json();
  if(!response.ok){if(response.status===401&&state.session?.authenticated)toast('Sesi berakhir. Buka kembali /admin untuk masuk. Draft yang belum disimpan tetap ada di halaman ini.',true);throw new Error(result.error||'Permintaan belum berhasil.');}
  return result;
}
const names=record=>record.draft.couple.map(person=>person.name).join(' & ');
const get=path=>path.split('.').reduce((value,key)=>value?.[key],state.record.draft);
function set(path,value){const parts=path.split('.');let target=state.record.draft;for(const key of parts.slice(0,-1))target=target[key];target[parts.at(-1)]=value;}
function markDirty(){state.dirty=true;document.querySelector('#save-state')?.replaceChildren(document.createTextNode('Perubahan belum disimpan'));document.querySelector('#save-state')?.classList.add('unsaved');}
function canLeave(){if(state.busy||state.uploading){toast('Tunggu proses penyimpanan atau upload selesai.');return false;}return !state.dirty||confirm('Ada perubahan yang belum disimpan. Tinggalkan perubahan ini?');}
const dateValue=value=>String(value||'').slice(0,16);
function localToISO(value){return value?value+':00'+({'Asia/Jakarta':'+07:00','Asia/Makassar':'+08:00','Asia/Jayapura':'+09:00'}[state.record.draft.timeZone]||'+07:00'):'';}
function field(label,path,{type='text',hint='',max=200,required=false,rows=3}={}){
  const value=get(path)??'',id='f-'+path.replaceAll('.','-');
  return `<div class="studio-field"><label for="${id}">${e(label)}${required?' <span>*</span>':''}</label>${type==='textarea'?`<textarea id="${id}" data-field="${path}" rows="${rows}" maxlength="${max}">${e(value)}</textarea>`:`<input id="${id}" data-field="${path}" type="${type}" value="${e(type==='datetime-local'?dateValue(value):value)}" maxlength="${max}" ${required?'required':''}/>`}${hint?`<small>${e(hint)}</small>`:''}</div>`;
}
const heading=(title,description)=>`<div class="pane-heading"><h2>${title}</h2><p>${description}</p></div>`;
const sectionNote=key=>`<div class="section-status"><span class="status-dot ${get('sections.'+key)?'on':''}"></span>${get('sections.'+key)?'Bagian ini ditampilkan di undangan.':'Bagian ini disembunyikan. Isi tetap tersimpan.'}<button type="button" data-tab="sections">Atur komponen ${icon('arrow')}</button></div>`;
function uploadBox(path,label,kind='image',hint='JPG, PNG, atau WebP · maksimal 10 MB'){
  const value=get(path);
  return `<div class="upload-field"><div class="upload-heading"><label>${e(label)}</label>${value?`<button type="button" class="icon-button danger" data-remove-media="${path}" aria-label="Hapus ${e(label)}">${icon('trash')}</button>`:''}</div><label class="upload-box ${value?'has-media':''}">${value&&kind==='image'?`<img src="${e(value)}" alt="${e(label)}"/>`:`<span class="upload-symbol">${icon(kind==='audio'?'music':'image')}</span>`}<span><strong>${value?'Ganti file':'Pilih file dari perangkat'}</strong><small>${e(hint)}</small></span><span class="upload-arrow">${icon('upload')}</span><input type="file" data-upload="${path}" data-kind="${kind}" accept="${kind==='image'?'image/jpeg,image/png,image/webp':'.mp3,.wav,.ogg'}" aria-label="Upload ${e(label)}"/></label>${value&&kind==='audio'?`<audio controls preload="metadata" src="${e(value)}"></audio>`:''}</div>`;
}

function sidebar(active='list'){
  const username=state.session?.username||'Admin';
  return `<aside class="studio-sidebar"><a class="studio-brand" href="/admin">${icon('leaf')}<span>undangan<span>STUDIO PENGELOLA</span></span></a><p class="sidebar-label">RUANG KERJA</p><button class="sidebar-item ${active==='list'?'active':''}" data-action="list">${icon('grid')}Undangan saya</button><button class="sidebar-item ${active==='storage'?'active':''}" data-action="storage">${icon('cloud')}Penyimpanan media</button><div class="sidebar-template"><img src="/assets/floral-watercolor.png" alt=""/><span>TEMPLATE PERTAMA</span><strong>Floral Reverie</strong><p>Hal-hal indah dimulai<br>dari sebuah undangan.</p><a href="/" target="_blank" rel="noopener">Lihat desain ${icon('external')}</a></div><div class="sidebar-account"><span class="account-avatar">${e(username[0].toUpperCase())}</span><div><strong>${e(username)}</strong><small>Pengelola undangan</small></div><button data-action="logout" class="icon-button" aria-label="Keluar">${icon('exit')}</button></div></aside>`;
}
function shell(content,active='list'){root.innerHTML=`<div class="studio-shell">${sidebar(active)}<main class="studio-main">${content}</main></div>`;}
function breadcrumbs(text){return `<div class="studio-topbar"><span>Studio <span>/</span> ${e(text)}</span><span class="storage-chip">${icon('cloud')}${state.session.storage.provider==='cloudinary'?'Cloudinary':'Penyimpanan lokal'}</span></div>`;}
function renderLogin(session){
  const setup=!session.initialized;
  root.innerHTML=`<main class="auth-layout"><div class="auth-art"><img src="/assets/floral-watercolor.png" alt=""/><a class="studio-brand" href="/">${icon('leaf')}<span>undangan<span>STUDIO PENGELOLA</span></span></a><div><p class="eyebrow">SETIAP CERITA LAYAK DIRAYAKAN</p><h1>Ruang untuk<br>merangkai <em>hari bahagia.</em></h1><p>Atur isi, pilih momen, dan bagikan undangan yang terasa personal.</p></div><span>FLORAL REVERIE · UNDANGAN ONLINEKU</span></div><div class="auth-form-wrap"><span class="auth-icon">${icon('lock')}</span><h2>${setup?'Selamat datang di studio.':'Senang bertemu kembali.'}</h2><p>${setup?'Buat akun pengelola untuk mulai mengatur undanganmu.':'Masuk untuk melanjutkan undangan yang sedang kamu siapkan.'}</p>${setup&&!session.setupAllowed?'<div class="inline-error">Akun pertama perlu dibuat dari komputer server atau dengan ADMIN_PASSWORD di .env.</div>':`<form id="auth-form" data-setup="${setup}"><div class="studio-field"><label for="auth-user">Username</label><input id="auth-user" name="username" value="admin" autocomplete="username" required minlength="3" maxlength="40" pattern="[a-zA-Z0-9_.-]+"/></div><div class="studio-field"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="${setup?'new-password':'current-password'}" required ${setup?'minlength="12"':''} maxlength="200"/>${setup?'<small>Minimal 12 karakter. Simpan password ini untuk masuk kembali.</small>':''}</div><p class="inline-error" id="auth-error" role="alert"></p><button class="studio-button primary" type="submit">${setup?'Buat akun & mulai':'Masuk ke studio'}${icon('arrow')}</button></form>`}<a class="auth-back" href="/">${icon('back')}Lihat contoh undangan</a></div></main>`;
}
async function listInvitations(){
  state.records=(await api('/api/admin/invitations')).invitations;state.record=null;state.dirty=false;
  renderList();
}
function renderList(){
  shell(`${breadcrumbs('Undangan saya')}<div class="workspace"><div class="workspace-heading"><div><p class="studio-kicker">DARI CERITA MENJADI UNDANGAN</p><h1>Undangan saya<span>.</span></h1><p>Semua hari bahagia yang sedang kamu siapkan, dalam satu tempat.</p></div><button class="studio-button primary" data-action="new">${icon('plus')}Buat undangan</button></div><div class="collection-bar"><h2>Daftar undangan <span>${state.records.length}</span></h2><label class="search-box"><span class="sr-only">Cari pasangan</span><input id="search-invitations" placeholder="Cari nama pasangan…" type="search"/></label></div><div class="invitation-list">${state.records.map(record=>`<article class="invitation-row" data-search="${e(record.names.toLowerCase())}"><div class="invitation-thumb">${icon('leaf')}</div><div class="invitation-row-title"><h3>${e(record.names)}</h3><p>Floral Reverie <span>·</span> ${e(formatDate(record.date))}</p><small>/u/${e(record.slug)}</small></div><span class="badge ${record.status==='published'?'published':''}">${record.status==='published'?'Terbit':'Draft'}</span><div class="row-response">${record.responses}<small>respons tamu</small></div><button class="studio-button secondary" data-edit="${record.id}">Kelola ${icon('arrow')}</button></article>`).join('')}</div><p id="search-empty" class="studio-empty" hidden>Tidak ada undangan yang cocok dengan pencarianmu.</p><div class="collection-note">${icon('leaf')}<p><strong>Mulai dari data pasangan, sempurnakan dengan detail kecil.</strong>Undangan baru tersimpan sebagai draft. Tamu dapat membukanya setelah kamu menerbitkan.</p></div></div>`);
}
async function openEditor(id){state.record=await api(`/api/admin/invitations/${id}`);state.dirty=false;state.tab='couple';renderEditor();}
function renderEditor(){
  const record=state.record;
  shell(`${breadcrumbs('Editor undangan')}<div class="editor-workspace"><button class="back-link" data-action="list">${icon('back')}Semua undangan</button><div class="editor-heading"><div><h1 id="editor-title">${e(names(record))}</h1><p><span class="badge ${record.published?'published':''}">${record.published?'Terbit':'Draft'}</span><span>Floral Reverie</span><span id="save-state">Semua perubahan tersimpan</span></p></div><div class="editor-actions"><button class="studio-button secondary" data-action="save">${icon('save')}Simpan draft</button><button class="studio-button primary" data-action="publish">${icon('check')}${record.published?'Perbarui terbitan':'Terbitkan'}</button></div></div><div class="mobile-editor-tools"><a class="studio-button secondary" href="/preview/${record.id}" target="_blank" rel="noopener">${icon('eye')}Lihat draft tersimpan</a>${record.published?`<a class="studio-button secondary" href="/u/${e(record.slug)}" target="_blank" rel="noopener">${icon('external')}Buka undangan</a><button type="button" class="studio-button secondary" data-action="copy-link">${icon('copy')}Salin tautan</button><button type="button" class="text-button danger" data-action="unpublish">Batalkan publikasi</button>`:''}</div><div class="editor-columns"><div class="editor-form-column"><nav class="editor-tabs" aria-label="Pengaturan undangan">${tabs.map(([id,label])=>`<button type="button" class="${state.tab===id?'active':''}" data-tab="${id}" aria-current="${state.tab===id?'page':'false'}">${label}</button>`).join('')}</nav><form id="editor-form"><fieldset id="editor-fieldset"><div id="editor-pane"></div></fieldset></form><div class="editor-bottom"><p>Draft tidak mengubah undangan yang sudah terbit.</p><button type="button" class="studio-button secondary" data-action="save">Simpan draft ${icon('arrow')}</button></div></div><aside class="preview-column"><div class="preview-title">${icon('phone')}Pratinjau undangan<a href="/preview/${record.id}" target="_blank" rel="noopener" aria-label="Buka preview di tab baru">${icon('external')}</a></div><div class="phone-frame"><iframe title="Pratinjau undangan tersimpan" src="/preview/${record.id}" id="invitation-preview"></iframe></div><p class="preview-caption">Menampilkan draft terakhir yang disimpan.</p><button type="button" class="studio-button secondary preview-refresh" data-action="preview">${icon('eye')}Simpan & perbarui preview</button>${record.published?`<div class="published-link"><span>TAUTAN UNTUK TAMU</span><a href="/u/${e(record.slug)}" target="_blank" rel="noopener">/u/${e(record.slug)} ${icon('external')}</a><button class="text-button" data-action="copy-link">${icon('copy')}Salin tautan</button><button class="text-button danger" data-action="unpublish">Batalkan publikasi</button></div>`:'<div class="draft-help">'+icon('lock')+'<p>Preview hanya bisa dibuka pengelola. Terbitkan untuk membagikannya kepada tamu.</p></div>'}</aside></div></div>`);
  renderPane();
}
function renderPane(){
  const d=state.record.draft, pane=document.querySelector('#editor-pane');
  document.querySelectorAll('.editor-tabs button').forEach(button=>{button.classList.toggle('active',button.dataset.tab===state.tab);button.setAttribute('aria-current',button.dataset.tab===state.tab?'page':'false');});
  let html='';
  if(state.tab==='couple')html=`${heading('Awal dari cerita mereka.','Lengkapi identitas pasangan dan kata-kata yang menyambut tamu.')}<div class="form-section"><div class="section-number">01</div><div><h3>Informasi undangan</h3><div class="studio-field"><label for="invitation-slug">Tautan undangan</label><div class="slug-input"><span>/u/</span><input id="invitation-slug" value="${e(state.record.slug)}" ${state.record.publishedAt?'readonly':''} maxlength="80"/></div><small>${state.record.publishedAt?'Tautan tetap dipertahankan karena pernah diterbitkan.':'Huruf kecil, angka, dan tanda hubung. Contoh: nadine-arga.'}</small></div><div class="form-grid">${field('Tanggal utama','date',{type:'datetime-local',required:true})}<div class="studio-field"><label for="timezone">Zona waktu</label><select id="timezone" data-field="timeZone">${[['Asia/Jakarta','WIB · Indonesia Barat'],['Asia/Makassar','WITA · Indonesia Tengah'],['Asia/Jayapura','WIT · Indonesia Timur']].map(([value,label])=>`<option value="${value}" ${d.timeZone===value?'selected':''}>${label}</option>`).join('')}</select></div></div>${field('Kota / lokasi singkat','location',{hint:'Ditampilkan pada sampul undangan.'})}${field('Sapaan tamu bawaan','defaultGuest',{max:100})}</div></div>${d.couple.map((person,i)=>`<div class="form-section"><div class="section-number">0${i+2}</div><div><h3>${i===0?'Mempelai pertama':'Mempelai kedua'}</h3><div class="form-grid">${field('Nama panggilan',`couple.${i}.name`,{required:true,max:40})}${field('Nama lengkap',`couple.${i}.fullName`,{required:true,max:150})}</div>${field('Keterangan keluarga',`couple.${i}.family`,{type:'textarea',max:500,hint:'Bisa diisi nama orang tua, urutan anak, atau dikosongkan.'})}</div></div>`).join('')}<div class="form-section"><div class="section-number">04</div><div><h3>Kata-kata untuk tamu</h3>${field('Kutipan','quote',{type:'textarea',max:1500})}${field('Kalimat pembuka','introduction',{type:'textarea',max:2500})}${field('Kalimat penutup','closingText',{type:'textarea',max:2500})}</div></div>`;
  if(state.tab==='events')html=`${heading('Tempat janji berlabuh.','Atur jadwal dan tampilkan peta langsung di dalam undangan.')}${sectionNote('map')}<div class="helper-note">${icon('cloud')}<p>Di Google Maps, pilih <strong>Bagikan → Sematkan peta → Salin HTML</strong>. Tempel hasilnya pada kolom embed. Tautan pendek lokasi tidak dapat digunakan sebagai embed.</p></div>${d.events.map((event,i)=>`<article class="repeat-card"><div class="repeat-header"><span>ACARA ${i+1}</span>${d.events.length>1?`<button type="button" class="icon-button danger" data-remove="events:${i}" aria-label="Hapus acara ${i+1}">${icon('trash')}</button>`:''}</div><div class="form-grid">${field('Nama acara',`events.${i}.title`,{required:true,max:100})}${field('Keterangan singkat',`events.${i}.subtitle`,{max:100})}${field('Mulai',`events.${i}.start`,{type:'datetime-local',required:true})}${field('Selesai',`events.${i}.end`,{type:'datetime-local',required:true})}</div>${field('Nama tempat',`events.${i}.venue`,{required:true})}${field('Alamat lengkap',`events.${i}.address`,{type:'textarea',max:500,rows:2})}${field('Kata pencarian Google Maps',`events.${i}.mapQuery`,{max:500,hint:'Digunakan tombol petunjuk arah.'})}${field('Embed Google Maps',`events.${i}.mapEmbed`,{type:'textarea',max:12000,rows:3,hint:'Kode <iframe> atau URL https://www.google.com/maps/embed?...'})}<button type="button" class="text-button" data-map-preview="${i}">${icon('eye')}Lihat peta</button><div id="map-preview-${i}" class="admin-map-preview"></div></article>`).join('')}<button type="button" class="studio-button secondary" data-add="events">${icon('plus')}Tambah acara</button>`;
  if(state.tab==='photos')html=`${heading('Momen yang ingin disimpan.','Upload langsung dari perangkat. Semua foto terhubung dengan undangan ini.')}<div class="media-storage-note">${icon('cloud')}<p>${e(state.session.storage.message)}</p></div>${uploadBox('coverPhoto','Foto sampul (opsional)')}${uploadBox('couplePhoto','Foto utama pasangan')}${uploadBox('decoration','Dekorasi bunga / ornamen','image','PNG atau WebP transparan disarankan · maksimal 10 MB')}<div class="subsection-heading"><h3>Galeri foto</h3><span>${d.gallery.length}/30 foto</span></div>${sectionNote('gallery')}<div class="admin-gallery">${d.gallery.map((photo,i)=>`<div class="admin-photo-card"><div><img src="${e(photo.src)}" alt="${e(photo.alt)}"/><button type="button" class="photo-remove" data-remove="gallery:${i}" aria-label="Hapus foto ${i+1}">${icon('trash')}</button></div>${field('Keterangan foto',`gallery.${i}.caption`,{max:250})}${field('Deskripsi gambar',`gallery.${i}.alt`,{max:200})}</div>`).join('')}</div><label class="gallery-upload">${icon('plus')}<strong>Tambah foto galeri</strong><span>Pilih beberapa foto sekaligus · maksimal 10 MB per foto</span><input type="file" data-upload="gallery" data-kind="image" accept="image/jpeg,image/png,image/webp" multiple/></label><div id="upload-progress" class="upload-progress" role="status"></div>`;
  if(state.tab==='music')html=`${heading('Nada untuk hari istimewa.','Pilih musik yang akan menemani tamu saat membaca undangan.')}${sectionNote('music')}${uploadBox('music.src','Musik latar','audio','MP3, WAV, atau OGG · maksimal 20 MB')}${field('Nama lagu / keterangan','music.name',{max:200})}<div class="studio-field"><label for="music-volume">Volume awal <span id="volume-label">${Math.round(d.music.volume*100)}%</span></label><input type="range" id="music-volume" data-field="music.volume" min="0" max="1" step="0.05" value="${d.music.volume}"/></div><div class="helper-note">${icon('music')}<p>Musik dicoba menyala otomatis. Jika browser membatasinya, musik mulai saat tamu mengetuk halaman atau membuka undangan. Tombol melayang dapat digunakan untuk jeda/putar. Gunakan audio milikmu atau yang sudah kamu izinkan untuk digunakan.</p></div><div id="upload-progress" class="upload-progress" role="status"></div>`;
  if(state.tab==='story')html=`${heading('Setiap perjalanan punya cerita.','Rangkai pertemuan pertama, lamaran, dan momen yang berarti.')}${sectionNote('story')}${d.story.map((item,i)=>`<article class="repeat-card"><div class="repeat-header"><span>CERITA ${i+1}</span><button type="button" class="icon-button danger" data-remove="story:${i}" aria-label="Hapus cerita ${i+1}">${icon('trash')}</button></div><div class="form-grid">${field('Tahun / waktu',`story.${i}.year`,{max:40})}${field('Judul',`story.${i}.title`,{required:true,max:150})}</div>${field('Cerita',`story.${i}.text`,{type:'textarea',max:2500,rows:4})}</article>`).join('')||'<div class="studio-empty">Belum ada cerita. Tambahkan momen pertama pasangan.</div>'}<button type="button" class="studio-button secondary" data-add="story">${icon('plus')}Tambah cerita</button>`;
  if(state.tab==='gifts')html=`${heading('Tanda kasih dari orang terdekat.','Tambahkan rekening dan QR opsional untuk hadiah digital.')}${sectionNote('gifts')}${field('Pengantar hadiah','giftIntro',{type:'textarea',max:1500})}${d.accounts.map((account,i)=>`<article class="repeat-card"><div class="repeat-header"><span>REKENING ${i+1}</span><button type="button" class="icon-button danger" data-remove="accounts:${i}" aria-label="Hapus rekening ${i+1}">${icon('trash')}</button></div><div class="form-grid">${field('Nama bank',`accounts.${i}.bank`,{required:true,max:80})}${field('Nomor rekening',`accounts.${i}.number`,{required:true,max:40})}</div>${field('Atas nama',`accounts.${i}.holder`,{required:true,max:150})}${uploadBox(`accounts.${i}.qr`,'Gambar QR (opsional)')}</article>`).join('')||'<div class="studio-empty">Belum ada rekening. Tambahkan rekening yang ingin ditampilkan.</div>'}<button type="button" class="studio-button secondary" data-add="accounts">${icon('plus')}Tambah rekening</button><div class="helper-note">${icon('heart')}<p>Tamu dapat menyalin nomor rekening. Bagian hadiah hanya tampil jika komponen <strong>Hadiah digital</strong> diaktifkan.</p></div><div id="upload-progress" class="upload-progress" role="status"></div>`;
  if(state.tab==='sections')html=`${heading('Sesuai cerita, sesuai kebutuhan.','Pilih bagian yang tampil. Menyembunyikan bagian tidak menghapus isinya.')}<div class="core-components">${icon('lock')}<div><strong>Identitas pasangan & detail acara</strong><p>Informasi inti selalu ditampilkan agar undangan tetap lengkap.</p></div><span>Utama</span></div><div class="toggle-list">${sectionInfo.map(([key,label,description])=>`<label class="toggle-row"><span><strong>${label}</strong><small>${description}</small></span><span class="toggle"><input type="checkbox" data-field="sections.${key}" ${d.sections[key]?'checked':''}/><span></span></span></label>`).join('')}</div>`;
  if(state.tab==='responses')html=`${heading('Kabar dari para tamu.','Konfirmasi masuk tersimpan di server. Setujui ucapan untuk menampilkannya di undangan.')}<div id="responses-content" class="studio-empty">Memuat respons…</div>`;
  pane.innerHTML=html;
  if(state.tab==='responses')loadResponses();
}

function renderStorage(){
  shell(`${breadcrumbs('Penyimpanan media')}<div class="workspace storage-workspace"><div class="workspace-heading"><div><p class="studio-kicker">TEMPAT MENYIMPAN MOMEN</p><h1>Penyimpanan media<span>.</span></h1><p>Gambar dan musik diunggah dari editor undangan.</p></div></div><div class="storage-panel"><div class="storage-panel-icon">${icon('cloud')}</div><span class="badge ${state.session.storage.ready?'published':''}">${state.session.storage.ready?'Siap digunakan':'Perlu konfigurasi'}</span><h2>${state.session.storage.provider==='cloudinary'?'Cloudinary':'Penyimpanan lokal'}</h2><p>${e(state.session.storage.message)}</p><div class="storage-how"><h3>Menghubungkan Cloudinary</h3><ol><li>Buka file <code>.env</code> di folder proyek.</li><li>Isi <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, dan <code>CLOUDINARY_API_SECRET</code>.</li><li>Biarkan <code>MEDIA_STORAGE=auto</code>, lalu restart server.</li><li>Upload berikutnya akan disimpan di Cloudinary.</li></ol><p>File yang sudah diunggah lokal tetap menggunakan lokasi sebelumnya. Kunci API hanya dibaca oleh server.</p></div><div class="storage-limits"><span><strong>Gambar</strong>JPG, PNG, WebP · 10 MB</span><span><strong>Musik</strong>MP3, WAV, OGG · 20 MB</span></div></div></div>`,'storage');
}

async function loadResponses(){
  const id=state.record.id;
  try{const {responses}=await api(`/api/admin/invitations/${id}/responses`);if(state.record?.id!==id||state.tab!=='responses')return;
    document.querySelector('#responses-content').className='response-list';
    document.querySelector('#responses-content').innerHTML=responses.length?responses.slice().reverse().map(response=>`<article class="response-item"><div class="response-header"><h3>${e(response.name)}</h3><span class="badge">${{yes:'Hadir',no:'Tidak hadir',maybe:'Belum pasti',message:'Ucapan'}[response.attendance]}${response.guests?' · '+response.guests+' orang':''}</span></div><time>${e(new Date(response.createdAt).toLocaleString('id-ID'))}</time>${response.message?`<p>${e(response.message)}</p><button type="button" class="studio-button secondary" data-moderate="${response.id}" data-visible="${!response.visible}">${icon(response.visible?'eye':'check')}${response.visible?'Sembunyikan ucapan':'Tampilkan ucapan'}</button>`:'<p class="muted">Tanpa ucapan.</p>'}</article>`).join(''):'<div class="studio-empty">Belum ada respons. Setelah undangan diterbitkan, konfirmasi tamu akan muncul di sini.</div>';
  }catch(error){const el=document.querySelector('#responses-content');if(el)el.textContent=error.message;}
}

function setBusy(value){state.busy=value;const fieldset=document.querySelector('#editor-fieldset');if(fieldset)fieldset.disabled=value;document.querySelectorAll('.editor-actions button,.editor-bottom button,.preview-refresh').forEach(button=>button.disabled=value);}
async function saveRecord(){
  if(state.uploading)throw new Error('Tunggu upload selesai sebelum menyimpan.');
  const form=document.querySelector('#editor-form');if(form&&!form.reportValidity())throw new Error('Lengkapi kolom yang wajib diisi.');
  const record=state.record;
  // Date controls represent local wall time in the selected invitation zone.
  record.draft.date=localToISO(dateValue(record.draft.date));
  record.draft.events.forEach(event=>{event.start=localToISO(dateValue(event.start));event.end=localToISO(dateValue(event.end));});
  state.record=await api(`/api/admin/invitations/${record.id}`,'PUT',{draft:record.draft,slug:record.slug,revision:record.revision});
  state.dirty=false;
}
async function saveAndRender(publish=false){
  if(state.busy)return;
  if(!document.querySelector('#editor-form').reportValidity())return;
  setBusy(true);let saved=false;
  try{await saveRecord();saved=true;if(publish){await api(`/api/admin/invitations/${state.record.id}/publish`,'POST',{revision:state.record.revision});state.record=await api(`/api/admin/invitations/${state.record.id}`);}renderEditor();toast(publish?'Undangan sudah terbit. Tautannya siap dibagikan.':'Draft tersimpan. Pratinjau sudah diperbarui.');}
  catch(error){if(saved)renderEditor();toast(error.message,true);}finally{setBusy(false);}
}
function uploadFile(file,kind,onProgress){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest(),form=new FormData();form.append('file',file);form.append('kind',kind);
    xhr.open('POST','/api/admin/uploads');xhr.setRequestHeader('X-CSRF-Token',state.session.csrf);xhr.timeout=140000;
    xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
    xhr.onload=()=>{let result;try{result=JSON.parse(xhr.responseText);}catch{return reject(new Error('Respons upload tidak valid.'));}if(xhr.status>=200&&xhr.status<300)resolve(result.asset);else reject(new Error(result.error||'Upload belum berhasil.'));};
    xhr.onerror=()=>reject(new Error('Koneksi terputus. Coba upload kembali.'));xhr.ontimeout=()=>reject(new Error('Upload terlalu lama. Periksa koneksi lalu coba lagi.'));xhr.send(form);
  });
}
async function handleUpload(input){
  const files=[...input.files];if(!files.length)return;
  const path=input.dataset.upload,kind=input.dataset.kind;
  if(path==='gallery'&&get('gallery').length+files.length>30){toast('Galeri maksimal 30 foto.',true);input.value='';return;}
  state.uploading=true;document.querySelector('#editor-fieldset').disabled=true;
  let progress=document.querySelector('#upload-progress');if(!progress){progress=document.createElement('div');progress.id='upload-progress';progress.className='upload-progress';progress.setAttribute('role','status');document.querySelector('#editor-pane').prepend(progress);}
  let count=0;
  try{
    for(const file of files){
      const limit=(kind==='image'?10:20)*1024*1024;if(file.size>limit)throw new Error(`${file.name}: ukuran maksimal ${kind==='image'?10:20} MB.`);
      progress.textContent=`Mengunggah ${count+1}/${files.length}: ${file.name}`;
      const asset=await uploadFile(file,kind,percent=>{progress.textContent=percent===100?`Menyelesaikan upload ${count+1}/${files.length}…`:`Mengunggah ${count+1}/${files.length} · ${percent}%`;});
      if(path==='gallery')state.record.draft.gallery.push({src:asset.url,alt:'Foto pasangan',caption:''});
      else {set(path,asset.url);if(path==='music.src')set('music.name',asset.name);}
      markDirty();count++;
    }
    toast(`${count} file berhasil diunggah. Simpan draft untuk menerapkan.`);
  }catch(error){toast(`${count?count+' file berhasil. ':''}${error.message}`,true);}
  finally{state.uploading=false;document.querySelector('#editor-fieldset').disabled=false;renderPane();}
}

root.addEventListener('input',event=>{
  const input=event.target;
  if(input.id==='search-invitations'){let found=0;document.querySelectorAll('[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(input.value.toLowerCase());if(!row.hidden)found++;});document.querySelector('#search-empty').hidden=found>0;return;}
  if(!state.record)return;
  if(input.id==='invitation-slug'){state.record.slug=input.value;markDirty();return;}
  if(input.dataset.field){
    let value=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.type==='datetime-local'?localToISO(input.value):input.value;
    set(input.dataset.field,value);markDirty();
    if(input.id==='music-volume')document.querySelector('#volume-label').textContent=Math.round(value*100)+'%';
    if(input.dataset.field.startsWith('couple.'))document.querySelector('#editor-title').textContent=names(state.record);
  }
});
root.addEventListener('change',event=>{if(event.target.dataset.upload)handleUpload(event.target);});
root.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.target;
  if(form.id==='editor-form'){await saveAndRender();return;}
  if(form.id!=='auth-form')return;
  const button=form.querySelector('button');button.disabled=true;document.querySelector('#auth-error').textContent='';
  try{
    const values=new FormData(form);await api(form.dataset.setup==='true'?'/api/setup':'/api/login','POST',{username:values.get('username'),password:values.get('password')});
    state.session=await api('/api/session');await listInvitations();
  }catch(error){document.querySelector('#auth-error').textContent=error.message;button.disabled=false;}
});
root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  try{
    if(state.uploading||state.busy){toast('Tunggu proses yang sedang berjalan selesai.');return;}
    if(button.dataset.tab){state.tab=button.dataset.tab;renderPane();return;}
    if(button.dataset.edit){if(canLeave())await openEditor(button.dataset.edit);return;}
    if(button.dataset.removeMedia){set(button.dataset.removeMedia,'');markDirty();renderPane();return;}
    if(button.dataset.remove){const [key,index]=button.dataset.remove.split(':');get(key).splice(Number(index),1);markDirty();renderPane();return;}
    if(button.dataset.add){
      const key=button.dataset.add,list=get(key),limit={events:8,story:12,accounts:8}[key];if(list.length>=limit)throw new Error(`Maksimal ${limit} bagian.`);
      list.push(key==='events'?{title:'Acara tambahan',subtitle:'',start:state.record.draft.events[0].start,end:state.record.draft.events[0].end,venue:'',address:'',mapQuery:'',mapEmbed:''}:key==='story'?{year:'',title:'Momen baru',text:''}:{bank:'',number:'',holder:'',qr:''});markDirty();renderPane();return;
    }
    if(button.dataset.mapPreview!==undefined){
      const index=button.dataset.mapPreview,raw=get(`events.${index}.mapEmbed`).trim();
      const src=raw.startsWith('<')?raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]:raw;
      let url;try{url=new URL((src||'').replace(/&amp;/g,'&'));}catch{throw new Error('Tempel kode embed Google Maps terlebih dahulu.');}
      if(url.protocol!=='https:'||!['www.google.com','google.com','maps.google.com'].includes(url.hostname)||url.port||url.username||url.password||!(url.pathname==='/maps/embed'||url.pathname.startsWith('/maps/embed/')))throw new Error('Gunakan kode dari menu Sematkan peta di Google Maps.');
      const frame=document.createElement('iframe');frame.src=url.href;frame.title='Pratinjau lokasi acara';frame.loading='lazy';frame.referrerPolicy='no-referrer-when-downgrade';document.querySelector(`#map-preview-${index}`).replaceChildren(frame);return;
    }
    if(button.dataset.moderate){button.disabled=true;await api(`/api/admin/invitations/${state.record.id}/responses`,'PATCH',{id:button.dataset.moderate,visible:button.dataset.visible==='true'});await loadResponses();toast('Status ucapan diperbarui.');return;}
    switch(button.dataset.action){
      case 'list':if(canLeave())await listInvitations();break;
      case 'storage':if(canLeave()){state.record=null;state.dirty=false;state.session=await api('/api/session');renderStorage();}break;
      case 'new':{if(!canLeave())return;button.disabled=true;const record=await api('/api/admin/invitations','POST',{});await openEditor(record.id);break;}
      case 'save':case 'preview':await saveAndRender();break;
      case 'publish':await saveAndRender(true);break;
      case 'unpublish':if(confirm('Hentikan publikasi? Tautan tamu tidak dapat dibuka sampai undangan diterbitkan lagi.')){setBusy(true);try{const result=await api(`/api/admin/invitations/${state.record.id}/unpublish`,'POST',{revision:state.record.revision});state.record.published=null;state.record.revision=result.revision;state.record.updatedAt=result.updatedAt;renderEditor();if(state.dirty)markDirty();toast('Publikasi dihentikan.');}finally{setBusy(false);}}break;
      case 'copy-link':{const link=`${location.origin}/u/${state.record.slug}`;try{await navigator.clipboard.writeText(link);toast('Tautan undangan disalin.');}catch{prompt('Salin tautan undangan:',link);}break;}
      case 'logout':if(canLeave()){await api('/api/logout','POST',{});state.record=null;state.dirty=false;await boot();}break;
    }
  }catch(error){button.disabled=false;toast(error.message,true);}
});
window.addEventListener('beforeunload',event=>{if(state.dirty||state.uploading){event.preventDefault();event.returnValue='';}});
async function boot(){
  try{state.session=await api('/api/session');if(state.session.authenticated)await listInvitations();else renderLogin(state.session);}
  catch{root.innerHTML='<main class="connection-error"><h1>Studio belum terhubung.</h1><p>Pastikan server berjalan, lalu coba muat ulang halaman.</p><button class="studio-button primary" id="retry-connection">Coba lagi</button></main>';document.querySelector('#retry-connection').addEventListener('click',boot);}
}
boot();
