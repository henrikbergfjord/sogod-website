import {Problem} from './domain.js';

export const MAX_IMAGE_BYTES=25*1024*1024;
const formats={jpg:{mime:'image/jpeg'},jpeg:{mime:'image/jpeg'},png:{mime:'image/png'},webp:{mime:'image/webp'}};

export function validateGalleryFilename(value){
 if(typeof value!=='string'||value.length>160||value.includes('/')||value.includes('\\'))throw new Problem(400,'Use a filename without folders and no longer than 160 characters.');
 const normalized=value.normalize('NFKC').trim();
 if(!/^[\p{L}\p{N}][\p{L}\p{N} ._()-]{0,145}\.(jpg|jpeg|png|webp)$/iu.test(normalized))throw new Problem(400,'Upload a JPG, PNG or WebP image with a simple filename. Video uploads are not enabled until a separate video transcoder is configured.');
 return {name:normalized,extension:normalized.split('.').at(-1).toLowerCase()};
}

export function sniffGalleryImage(buffer,extension){
 let detected;
 if(buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)detected='jpg';
 else if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))detected='png';
 else if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')detected='webp';
 if(!detected||!formats[extension]||detected!==extension&&!(detected==='jpg'&&extension==='jpeg'))throw new Problem(400,'The file contents do not match a supported JPG, PNG or WebP image.');
 return formats[detected];
}

export function parseYouTubeUrl(value){
 let url;
 try{url=new URL(value)}catch{throw new Problem(400,'Paste a valid YouTube video URL.')}
 if(!['http:','https:'].includes(url.protocol))throw new Problem(400,'Paste a valid YouTube video URL.');
 const host=url.hostname.toLowerCase().replace(/^www\./,'');
 let id='';
 if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||'';
 else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
  const parts=url.pathname.split('/').filter(Boolean);
  if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
  else if(['embed','shorts','live'].includes(parts[0]))id=parts[1]||'';
 }
 if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Problem(400,'Use a standard YouTube video URL.');
 return id;
}

export function galleryText(value,max,label){
 if(value===undefined||value===null)return '';
 if(typeof value!=='string'||value.length>max)throw new Problem(400,`${label} must be ${max} characters or fewer.`);
 return value.trim();
}
