import {randomUUID} from 'node:crypto';
import {app} from '@azure/functions';
import {BlobServiceClient} from '@azure/storage-blob';
import {Problem,galleryManager,uuid} from './domain.js';
import {MAX_IMAGE_BYTES,parseYouTubeUrl,sniffGalleryImage,validateGalleryFilename,galleryText} from './gallery-validation.js';
import {optimizeGalleryPhoto} from './gallery-processing.js';

const maxManifestBytes=1024*1024;
let service;

function container(){
 const connection=process.env.GALLERY_STORAGE_CONNECTION_STRING;
 if(!connection)throw new Problem(503,'Gallery storage is not configured.');
 service??=BlobServiceClient.fromConnectionString(connection);
 return service.getContainerClient(process.env.GALLERY_PUBLIC_CONTAINER||'gallery-public');
}
function originals(){
 const connection=process.env.GALLERY_STORAGE_CONNECTION_STRING;
 if(!connection)throw new Problem(503,'Gallery storage is not configured.');
 const name=process.env.GALLERY_ORIGINALS_CONTAINER||'gallery-originals';
 if(name===(process.env.GALLERY_PUBLIC_CONTAINER||'gallery-public'))throw new Problem(503,'Public gallery and private originals must use separate storage containers.');
 return service.getContainerClient(name);
}
async function ensurePrivateOriginals(){
 const store=originals();await store.createIfNotExists();
 const {blobPublicAccess}=await store.getAccessPolicy();
 if(blobPublicAccess)throw new Problem(503,'Gallery originals storage must not allow anonymous access.');
 return store;
}
function manager(req){if(!galleryManager(req.headers.get('x-ms-client-principal')))throw new Problem(403,'A Microsoft account explicitly assigned the gallery role is required.')}
function origin(req){if(!process.env.PUBLIC_ORIGIN||req.headers.get('origin')!==process.env.PUBLIC_ORIGIN)throw new Problem(403,'Please use the Sogod website to manage gallery items.')}
function json(status,jsonBody){return {status,jsonBody,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}}
function safe(fn){return async(req,ctx)=>{try{return await fn(req)}catch(e){if(!(e instanceof Problem))ctx.error('Gallery API error',e.code||e.name);return json(e.status||503,{error:e.status?e.message:'Gallery storage is temporarily unavailable.'})}}}

export async function readManifest(store){
 const blob=store.getBlockBlobClient('gallery-manifest.json');
 if(!await blob.exists())return {blob,items:[],etag:null};
 const props=await blob.getProperties();
 if((props.contentLength||0)>maxManifestBytes)throw new Problem(503,'Gallery manifest exceeds its size limit.');
 const data=await blob.downloadToBuffer(0,props.contentLength);
 let items;
 try{items=JSON.parse(data.toString('utf8'))}catch{throw new Problem(503,'Gallery manifest is invalid.')}
 if(!Array.isArray(items))throw new Problem(503,'Gallery manifest is invalid.');
 return {blob,items,etag:props.etag};
}

async function changeManifest(change){
 const store=container();
 await store.createIfNotExists({access:'blob'});
 const blob=store.getBlockBlobClient('gallery-manifest.json');
 for(let attempt=0;attempt<5;attempt++){
  const current=await readManifest(store),items=change([...current.items]);
  try{
   await blob.uploadData(Buffer.from(JSON.stringify(items)),{conditions:current.etag?{ifMatch:current.etag}:{ifNoneMatch:'*'},blobHTTPHeaders:{blobContentType:'application/json; charset=utf-8',blobCacheControl:'public, max-age=60'}});
   return items;
  }catch(error){if(error.statusCode!==412&&error.code!=='ConditionNotMet')throw error}
 }
 throw new Problem(409,'The gallery changed at the same time. Reload and try again.');
}

async function readLimited(req){
 const length=Number(req.headers.get('content-length'));
 if(Number.isFinite(length)&&length>MAX_IMAGE_BYTES)throw new Problem(413,'Photos must be 25 MB or smaller.');
 if(!req.body)throw new Problem(400,'Choose a photo to upload.');
 const reader=req.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_IMAGE_BYTES){await reader.cancel();throw new Problem(413,'Photos must be 25 MB or smaller.');}chunks.push(Buffer.from(value));}
 if(!size)throw new Problem(400,'Choose a non-empty photo to upload.');
 return Buffer.concat(chunks,size);
}

function encode(value){return encodeURIComponent(value)}
function decode(value){try{return decodeURIComponent(value||'')}catch{return ''}}
async function readJson(req){
 const length=Number(req.headers.get('content-length'));
 if(Number.isFinite(length)&&length>4000)throw new Problem(413,'Gallery details are too large.');
 const raw=await req.text();if(raw.length>4000)throw new Problem(413,'Gallery details are too large.');
 try{return JSON.parse(raw)}catch{throw new Problem(400,'Invalid gallery details.')}
}

app.http('gallery-public-list',{route:'gallery/items',methods:['GET'],authLevel:'anonymous',handler:safe(async()=>{
 const {items}=await readManifest(container());
 return json(200,{items:items.filter(item=>item.type==='photo'||item.type==='youtube').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(item=>({id:item.id,type:item.type,title:decode(item.title),caption:decode(item.caption),createdAt:item.createdAt,...(item.type==='photo'?{url:item.url,previewUrl:item.previewUrl}:{videoId:item.videoId})}))});
})});
app.http('gallery-admin-list',{route:'frontdesk/gallery/items',methods:['GET'],authLevel:'anonymous',handler:safe(async req=>{
 manager(req);const {items}=await readManifest(container());
 return json(200,{items:items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(item=>{const {originalBlob,originalMime,originalExtension,...publicItem}=item;return {...publicItem,title:decode(item.title),caption:decode(item.caption),...(item.type==='photo'?{downloadUrl:`/api/frontdesk/gallery/items/${item.id}/download`,originalDownloadUrl:`/api/frontdesk/gallery/items/${item.id}/original`}:{})}})});
})});
app.http('gallery-photo-upload',{route:'frontdesk/gallery/photos',methods:['POST'],authLevel:'anonymous',handler:safe(async req=>{
 manager(req);origin(req);
 let filename;try{filename=decodeURIComponent(req.headers.get('x-gallery-filename')||'')}catch{throw new Problem(400,'Invalid filename.')}
 const file=validateGalleryFilename(filename),data=await readLimited(req);sniffGalleryImage(data,file.extension);
 const {full,preview}=await optimizeGalleryPhoto(data);
 const store=container();await store.createIfNotExists({access:'blob'});
 const {blobPublicAccess}=await store.getAccessPolicy();
 if(blobPublicAccess!=='blob')throw new Problem(503,'Public gallery storage must allow anonymous blob reads.');
 const privateStore=await ensurePrivateOriginals();
 const id=randomUUID(),createdAt=new Date().toISOString(),fullName=`${id}.webp`,previewName=`${id}-preview.webp`;
 const fullBlob=store.getBlockBlobClient(fullName),previewBlob=store.getBlockBlobClient(previewName);
 const originalExtension=file.extension,originalName=`${id}.${originalExtension}`,originalBlob=privateStore.getBlockBlobClient(originalName);
 const originalMime=sniffGalleryImage(data,file.extension).mime;
 const title=file.name.replace(/\.[^.]+$/,'');
 try{
  await originalBlob.uploadData(data,{blobHTTPHeaders:{blobContentType:originalMime,blobContentDisposition:'attachment'}});
  await previewBlob.uploadData(preview,{blobHTTPHeaders:{blobContentType:'image/webp',blobContentDisposition:`inline; filename="${previewName}"`}});
  await fullBlob.uploadData(full,{blobHTTPHeaders:{blobContentType:'image/webp',blobContentDisposition:`inline; filename="${fullName}"`}});
  await changeManifest(items=>[...items,{id,type:'photo',title:encode(title),caption:'',createdAt,url:fullBlob.url,previewUrl:previewBlob.url,fullBlob:fullName,previewBlob:previewName,originalBlob:originalName,originalMime,originalExtension,sourceBytes:data.length,optimizedBytes:full.length}]);
 }catch(error){await originalBlob.deleteIfExists();await fullBlob.deleteIfExists();await previewBlob.deleteIfExists();throw error}
 return json(201,{id,title,sourceBytes:data.length,optimizedBytes:full.length,previewBytes:preview.length,savedPercent:Math.max(0,Math.round((1-full.length/data.length)*100)),createdAt,url:fullBlob.url,previewUrl:previewBlob.url});
})});
app.http('gallery-youtube-add',{route:'frontdesk/gallery/youtube',methods:['POST'],authLevel:'anonymous',handler:safe(async req=>{
 manager(req);origin(req);const input=await readJson(req);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Problem(400,'Invalid video details.');
 const videoId=parseYouTubeUrl(input.url),title=galleryText(input.title,120,'Title'),caption=galleryText(input.caption,500,'Caption');
 const item={id:randomUUID(),type:'youtube',videoId,title:encode(title||'YouTube video'),caption:encode(caption),createdAt:new Date().toISOString()};
 await changeManifest(items=>[...items,item]);
 return json(201,{...item,title:title||'YouTube video',caption});
})});
app.http('gallery-item-manage',{route:'frontdesk/gallery/items/{id}',methods:['PATCH','DELETE'],authLevel:'anonymous',handler:safe(async req=>{
 manager(req);origin(req);if(!uuid(req.params.id))throw new Problem(404,'Gallery item not found.');
 if(req.method==='DELETE'){
  let removed;
  await changeManifest(items=>items.filter(item=>{if(item.id!==req.params.id)return true;removed=item;return false}));
  if(!removed)throw new Problem(404,'Gallery item not found.');
  if(removed.type==='photo'){const store=container();await store.deleteBlob(removed.previewBlob,{deleteSnapshots:'include'});await store.deleteBlob(removed.fullBlob,{deleteSnapshots:'include'});if(removed.originalBlob)await (await ensurePrivateOriginals()).deleteBlob(removed.originalBlob,{deleteSnapshots:'include'});}
  return json(200,{deleted:true});
 }
 const input=await readJson(req);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Problem(400,'Invalid gallery details.');
 const title=galleryText(input.title,120,'Title'),caption=galleryText(input.caption,500,'Caption');let found;
 await changeManifest(items=>items.map(item=>{if(item.id!==req.params.id)return item;found={...item,title:encode(title||(item.type==='youtube'?'YouTube video':decode(item.title))),caption:encode(caption)};return found}));
 if(!found)throw new Problem(404,'Gallery item not found.');
 return json(200,{id:found.id,title,caption});
})});
app.http('gallery-download',{route:'frontdesk/gallery/items/{id}/download',methods:['GET'],authLevel:'anonymous',handler:safe(async req=>{
 manager(req);if(!uuid(req.params.id))throw new Problem(404,'Gallery item not found.');
 const {items}=await readManifest(container()),item=items.find(entry=>entry.id===req.params.id&&entry.type==='photo');
 if(!item)throw new Problem(404,'Gallery photo not found.');
 const result=await container().getBlockBlobClient(item.fullBlob).downloadToBuffer();
 return {status:200,body:result,headers:{'Cache-Control':'no-store','Content-Type':'image/webp','Content-Disposition':`attachment; filename="sogod-gallery-${req.params.id}.webp"`,'X-Content-Type-Options':'nosniff'}};
})});
app.http('gallery-original-download',{route:'frontdesk/gallery/items/{id}/original',methods:['GET'],authLevel:'anonymous',handler:safe(async req=>{
 manager(req);if(!uuid(req.params.id))throw new Problem(404,'Gallery photo not found.');
 const {items}=await readManifest(container()),item=items.find(entry=>entry.id===req.params.id&&entry.type==='photo');
 if(!item?.originalBlob)throw new Problem(404,'Gallery original not found.');
 const result=await (await ensurePrivateOriginals()).getBlockBlobClient(item.originalBlob).downloadToBuffer();
 return {status:200,body:result,headers:{'Cache-Control':'no-store','Content-Type':item.originalMime,'Content-Disposition':`attachment; filename="sogod-original-${req.params.id}.${item.originalExtension}"`,'X-Content-Type-Options':'nosniff'}};
})});
