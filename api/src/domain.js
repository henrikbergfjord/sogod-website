import {createHash} from 'node:crypto';
export class Problem extends Error {constructor(status,message){super(message);this.status=status}}
export const SERVICES=['island','mayon','resort','waterpark','farm','culture','pool-party','food','catering','flowers','crafts','errands','guide','pickup','dropoff','scooter','laundry','sim-help'];
export const TRANSITIONS={new:['planning','cancelled'],planning:['quoted','cancelled'],quoted:['planning','confirmed','cancelled'],confirmed:['in_progress','cancelled'],in_progress:['completed'],completed:[],cancelled:[]};
const bad=m=>{throw new Problem(400,m)};
function str(v,max,label,required=false){if(typeof v!=='string'||v.length>max||required&&!v.trim())bad(`Please check ${label}.`);return v.trim()}
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)bad('Please choose a valid date.');return v}
export function days(a,b){return Math.round((Date.parse(b)-Date.parse(a))/86400000)}
export function validate(p,today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'})){
 if(!p||typeof p!=='object'||Array.isArray(p))bad('Invalid request.');
 const name=str(p.name,100,'your name',true),email=str(p.email,200,'your email',true).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))bad('Please enter a valid email.');
 if(!['stay','experience','combined'].includes(p.kind))bad('Choose a request type.');
 if(!Number.isInteger(p.guests)||p.guests<1||p.guests>100)bad('Guest count must be between 1 and 100.');
 const arrival=date(p.arrival);if(arrival<today)bad('Choose today or a future date.');
 let property=null,departure=null;
 if(p.kind!=='experience'){
  if(!['apartment','kobo','residence'].includes(p.property))bad('Choose an accommodation.');property=p.property;departure=date(p.departure);
  if(arrival<'2027-01-01')bad('Accommodation is planned from 2027.');
  if(days(arrival,departure)<1||days(arrival,departure)>366)bad('Choose 1–366 nights. Contact us for a longer stay.');
  if(property==='apartment'&&p.guests>5)bad('The apartment accommodates up to 5 guests.');
 }
 if(!Array.isArray(p.items)||p.items.length>SERVICES.length||new Set(p.items.map(x=>x?.id)).size!==p.items.length)bad('Please check selected services.');
 const items=p.items.map(x=>{if(!x||!SERVICES.includes(x.id)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>366)bad('Please check service quantities.');if(x.id==='scooter'&&x.quantity>2)bad('We have up to two scooters.');return {id:x.id,quantity:x.quantity}});
 if(p.kind==='experience'&&!items.length)bad('Choose at least one experience or service.');
 if(!['everything','shared','essentials'].includes(p.arrangement))bad('Choose how much you want us to arrange.');
 if(p.consent!==true)bad('Please agree that we may use your details to handle this request.');
 return {name,email,phone:str(p.phone||'',60,'phone'),kind:p.kind,property,arrival,departure,guests:p.guests,items,details:{stayingAt:["sogod","elsewhere","undecided"].includes(p.stayingAt)?p.stayingAt:"undecided",arrangement:p.arrangement,message:str(p.message||'',4000,'message'),pickup:str(p.pickup||'',300,'pickup location'),budget:str(p.budget||'',100,'budget'),consent:true}};
}
export const hash=p=>createHash('sha256').update(JSON.stringify(p)).digest('hex');
export function principal(header){try{const p=JSON.parse(Buffer.from(header||'','base64').toString('utf8'));return p.identityProvider==='aad'&&p.userId&&p.userRoles?.some(x=>['frontdesk','admin'].includes(x))?p:null}catch{return null}}
export function galleryManager(header){try{const p=JSON.parse(Buffer.from(header||'','base64').toString('utf8'));return p.identityProvider==='aad'&&p.userId&&p.userRoles?.includes('gallery')?p:null}catch{return null}}
export function uuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'')}
