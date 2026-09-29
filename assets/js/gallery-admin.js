const itemsNode=document.querySelector('#items');
const accessStatus=document.querySelector('#access-status');
const uploadStatus=document.querySelector('#upload-status');
const youtubeStatus=document.querySelector('#youtube-status');
const signInPath='/.auth/login/aad?post_login_redirect_uri=%2Fgallery-admin.html';
const formatSize=bytes=>`${(bytes/1024/1024).toFixed(2)} MB`;
function errorMessage(data,response){return data?.error|| (response.status===403?'This Microsoft account is not assigned gallery administrator access. Ask the site administrator to assign the gallery role.':`Request failed (${response.status}).`)}
async function api(url,options={}){
 const response=await fetch(url,{...options,headers:{...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});
 let data={};try{data=await response.json()}catch{}
 if(!response.ok){const error=Error(errorMessage(data,response));error.status=response.status;throw error}
 return data;
}
function status(node,message,type=''){node.textContent=message;node.className=type?`status-${type}`:''}
async function loadItems(){
 try{const {items}=await api('/api/frontdesk/gallery/items');accessStatus.textContent=items.length?`${items.length} gallery item${items.length===1?'':'s'}`:'No gallery items yet. Upload a photo or add a YouTube link.';itemsNode.replaceChildren(...items.map(renderItem))}
 catch(error){status(accessStatus,error.status===401?'Sign in with Microsoft to manage gallery content.':error.message,'error');if(error.status===401){const link=document.createElement('a');link.className='signin-link';link.href=signInPath;link.textContent='Sign in with Microsoft';accessStatus.append(document.createElement('br'),link)}itemsNode.replaceChildren()}
}
function renderItem(item){
 const row=document.createElement('article');row.className='admin-item';
 if(item.type==='photo'){const img=document.createElement('img');img.src=item.previewUrl;img.alt='';row.append(img)}
 else{const img=document.createElement('img');img.className='video-poster';img.src=`https://i.ytimg.com/vi/${encodeURIComponent(item.videoId)}/hqdefault.jpg`;img.alt='';row.append(img)}
 const content=document.createElement('div'),fields=document.createElement('div');fields.className='admin-item-fields';
 const titleLabel=document.createElement('label');titleLabel.textContent='Title';const title=document.createElement('input');title.maxLength=120;title.value=item.title;titleLabel.append(title);
 const captionLabel=document.createElement('label');captionLabel.className='wide';captionLabel.textContent='Caption';const caption=document.createElement('textarea');caption.maxLength=500;caption.value=item.caption||'';captionLabel.append(caption);fields.append(titleLabel,captionLabel);
 const actions=document.createElement('div');actions.className='admin-item-actions';
 const save=document.createElement('button');save.type='button';save.textContent='Save title / caption';save.addEventListener('click',async()=>{save.disabled=true;try{await api(`/api/frontdesk/gallery/items/${encodeURIComponent(item.id)}`,{method:'PATCH',body:JSON.stringify({title:title.value,caption:caption.value})});status(accessStatus,'Gallery details saved.','success');await loadItems()}catch(error){status(accessStatus,error.message,'error')}finally{save.disabled=false}});
 actions.append(save);
 if(item.type==='photo'){const original=document.createElement('a');original.href=item.originalDownloadUrl;original.textContent='Download original photo';actions.append(original);const download=document.createElement('a');download.href=item.downloadUrl;download.textContent='Download optimized photo';actions.append(download)}
 else{const watch=document.createElement('a');watch.href=`https://www.youtube.com/watch?v=${encodeURIComponent(item.videoId)}`;watch.target='_blank';watch.rel='noopener noreferrer';watch.textContent='Open on YouTube';actions.append(watch)}
 const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Delete';remove.addEventListener('click',async()=>{const label=item.type==='youtube'?'Remove this YouTube video from the Sogod Gallery? The YouTube video itself will not be changed.':'Delete this optimized photo and its preview permanently?';if(!window.confirm(label))return;remove.disabled=true;try{await api(`/api/frontdesk/gallery/items/${encodeURIComponent(item.id)}`,{method:'DELETE'});status(accessStatus,'Gallery item deleted.','success');await loadItems()}catch(error){status(accessStatus,error.message,'error')}finally{remove.disabled=false}});
 actions.append(remove);content.append(fields,actions);row.append(content);return row;
}

function uploadPhoto(file){
 return new Promise((resolve,reject)=>{
  const request=new XMLHttpRequest();request.open('POST','/api/frontdesk/gallery/photos');request.timeout=40000;request.setRequestHeader('Content-Type','application/octet-stream');request.setRequestHeader('X-Gallery-Filename',encodeURIComponent(file.name));
  request.upload.addEventListener('progress',event=>{if(event.lengthComputable){const percent=Math.round(event.loaded/event.total*100);status(uploadStatus,percent<100?`Uploading ${file.name}: ${percent}%`:`Upload complete. Optimizing ${file.name} on the server…`)}});
  request.addEventListener('load',()=>{let response={};try{response=JSON.parse(request.responseText)}catch{}if(request.status<200||request.status>=300){reject(Error(errorMessage(response,{status:request.status})));return}resolve(response)});
  request.addEventListener('error',()=>reject(Error('Upload interrupted. Check your connection and try again.')));
  request.addEventListener('timeout',()=>reject(Error('Image processing took too long. Try a smaller photo.')));
  request.send(file);
 });
}
async function uploadFiles(files){
 const selected=[...files];if(!selected.length)return;
 for(let index=0;index<selected.length;index++){
  const file=selected[index];
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>25*1024*1024){status(uploadStatus,`${file.name}: choose a JPG, PNG or WebP image no larger than 25 MB.`,'error');continue}
  try{const result=await uploadPhoto(file);const reduction=result.sourceBytes?Math.max(0,Math.round((1-result.optimizedBytes/result.sourceBytes)*100)):0;status(uploadStatus,`${file.name}: optimized ${formatSize(result.sourceBytes)} → ${formatSize(result.optimizedBytes)} (${reduction}% smaller).`,'success');await loadItems()}
  catch(error){status(uploadStatus,`${file.name}: ${error.message}`,'error')}
 }
}
const fileInput=document.querySelector('#photo-file'),dropZone=document.querySelector('#drop-zone');
fileInput.addEventListener('change',()=>{uploadFiles(fileInput.files);fileInput.value=''});
for(const name of ['dragenter','dragover'])dropZone.addEventListener(name,event=>{event.preventDefault();dropZone.classList.add('dragging')});
for(const name of ['dragleave','drop'])dropZone.addEventListener(name,event=>{event.preventDefault();dropZone.classList.remove('dragging')});
dropZone.addEventListener('drop',event=>uploadFiles(event.dataTransfer.files));
document.querySelector('#youtube-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form));status(youtubeStatus,'Saving YouTube video…');try{await api('/api/frontdesk/gallery/youtube',{method:'POST',body:JSON.stringify(values)});form.reset();status(youtubeStatus,'YouTube video added to the public Gallery.','success');await loadItems()}catch(error){status(youtubeStatus,error.message,'error')}});
loadItems();
