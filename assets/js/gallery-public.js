const photoGrid=document.querySelector('#photos .photo-grid');
const videoGrid=document.querySelector('#videos .video-grid');
const lightbox=document.querySelector('#lightbox');
function showLightbox(url,alt){
 let image=lightbox.querySelector('img');
 if(!image){image=document.createElement('img');image.id='lightboxImage';lightbox.insertBefore(image,lightbox.firstChild)}
 image.src=url;image.alt=alt;lightbox.hidden=false;
}
function photoCard(item){
 const card=document.createElement('article');card.className='media-card';card.dataset.lightbox=item.url;
 const image=document.createElement('img');image.src=item.previewUrl;image.alt=item.title;image.loading='lazy';image.decoding='async';
 const label=document.createElement('div');label.className='media-label';const title=document.createElement('b');title.textContent=item.title;label.append(title);
 if(item.caption){const caption=document.createElement('small');caption.textContent=item.caption;label.append(caption)}
 card.append(image,label);card.addEventListener('click',()=>showLightbox(item.url,item.title));return card;
}
function videoCard(item){
 const card=document.createElement('article');card.className='video-card youtube-card';
 const button=document.createElement('button');button.type='button';button.className='youtube-poster';button.setAttribute('aria-label',`Play ${item.title}`);
 const poster=document.createElement('img');poster.src=`https://i.ytimg.com/vi/${encodeURIComponent(item.videoId)}/hqdefault.jpg`;poster.alt='';poster.loading='lazy';poster.decoding='async';
 const play=document.createElement('span');play.className='youtube-play';play.setAttribute('aria-hidden','true');play.textContent='▶';button.append(poster,play);
 button.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.videoId)}?autoplay=1&rel=0`;frame.title=item.title;frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.loading='lazy';button.replaceWith(frame)});
 const info=document.createElement('div');info.className='video-info';const title=document.createElement('b');title.textContent=item.title;info.append(title);if(item.caption){const caption=document.createElement('small');caption.textContent=item.caption;info.append(caption)}card.append(button,info);return card;
}
async function loadManagedGallery(){
 const status=document.querySelector('#uploaded-gallery-status');
 try{
  const response=await fetch('/api/gallery/items',{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Gallery updates could not be loaded.');
  const {items}=await response.json(),photos=items.filter(item=>item.type==='photo'),videos=items.filter(item=>item.type==='youtube');
  photos.forEach(item=>photoGrid.append(photoCard(item)));videos.forEach(item=>videoGrid.append(videoCard(item)));
  document.querySelector('#gallery-photo-count').textContent=`${photoGrid.children.length} photos`;
  document.querySelector('#gallery-video-count').textContent=`${videoGrid.children.length} videos`;
  status.textContent=videos.length?'':'YouTube videos will appear here as they are added by a gallery administrator.';
 }catch{status.textContent='Recently added gallery items are temporarily unavailable. The photo archive remains available.'}
}
loadManagedGallery();
