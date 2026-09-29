import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {Problem} from './domain.js';
const fail=m=>{throw new Problem(400,m)};
const tokenHash=t=>createHash('sha256').update(t).digest('hex');
export function proposalInput(p,now=Date.now()) {
 if(!Array.isArray(p?.lines)||!p.lines.length||p.lines.length>40)fail('Add 1–40 proposal lines.');
 const lines=p.lines.map(l=>{
  if(!l||typeof l.description!=='string'||!l.description.trim()||l.description.length>300)fail('Check line descriptions.');
  for(const k of ['quantity','unitPriceMinor','unitCostMinor'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>100000000)fail('Check quantities and amounts.');
  if(l.quantity<1||l.quantity>1000)fail('Quantity must be 1–1000.');
  if(!['service','service_fee'].includes(l.type))fail('Choose service or service fee.');
  return {description:l.description.trim(),quantity:l.quantity,unitPriceMinor:l.unitPriceMinor,unitCostMinor:l.unitCostMinor,type:l.type};
 });
 const total=lines.reduce((s,l)=>s+l.quantity*l.unitPriceMinor,0),cost=lines.reduce((s,l)=>s+l.quantity*l.unitCostMinor,0);
 if(total>100000000||cost>100000000)fail('Proposal exceeds the supported total.');
 if(typeof p.terms!=='string'||!p.terms.trim()||p.terms.length>5000)fail('Add inclusions, exclusions and cancellation/payment terms.');
 const expiry=Date.parse(p.validUntil);if(!Number.isFinite(expiry)||expiry<=now||expiry>now+30*86400000)fail('Choose a validity between now and 30 days.');
 return {lines,total,cost,terms:p.terms.trim(),validUntil:new Date(expiry).toISOString()};
}
async function audit(db,id,actor,action){await db.query('INSERT INTO request_audit(request_id,actor,action) VALUES($1,$2,$3)',[id,actor,action])}
export async function createProposal(db,requestId,p,actor){
 const v=proposalInput(p);await db.query('BEGIN');
 try{
  const r=(await db.query('SELECT status FROM service_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
  if(!r)throw new Problem(404,'Request not found.');
  if(!['new','planning','quoted'].includes(r.status))throw new Problem(409,'Proposals can only be revised before booking confirmation.');
  const latest=(await db.query('SELECT revision FROM proposals WHERE request_id=$1 ORDER BY revision DESC LIMIT 1',[requestId])).rows[0]?.revision||0;
  if(p.baseRevision!==latest)throw new Problem(409,'A newer proposal exists. Reload before creating another version.');
  // A draft does not revoke an already shared proposal. Sharing it does.
  const id=randomUUID();await db.query('INSERT INTO proposals(id,request_id,revision,lines,total_minor,cost_minor,terms,valid_until) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,requestId,latest+1,JSON.stringify(v.lines),v.total,v.cost,v.terms,v.validUntil]);
  await audit(db,requestId,actor,`Proposal v${latest+1} drafted`);await db.query('COMMIT');return {id,revision:latest+1};
 }catch(e){await db.query('ROLLBACK');throw e}
}
export async function shareProposal(db,id,actor){
 await db.query('BEGIN');try{
  const peek=(await db.query('SELECT request_id FROM proposals WHERE id=$1',[id])).rows[0];if(!peek)throw new Problem(404,'Proposal not found.');
  const request=(await db.query('SELECT status FROM service_requests WHERE id=$1 FOR UPDATE',[peek.request_id])).rows[0];
  if(!['new','planning','quoted'].includes(request.status))throw new Problem(409,'This request can no longer receive a proposal.');
  const p=(await db.query('SELECT * FROM proposals WHERE id=$1 FOR UPDATE',[id])).rows[0];
  const latest=(await db.query('SELECT max(revision)::integer AS revision FROM proposals WHERE request_id=$1',[p.request_id])).rows[0].revision;
  if(p.revision!==latest||p.state!=='draft')throw new Problem(409,'Only the newest draft can be shared. Create a new version to replace an existing link.');
  if(new Date(p.valid_until).getTime()<=Date.now())throw new Problem(409,'This draft has expired.');
  const token=randomBytes(32).toString('base64url');
  await db.query("UPDATE proposals SET state='superseded',token_hash=NULL WHERE request_id=$1 AND state IN ('shared','accepted')",[p.request_id]);
  await db.query("UPDATE proposals SET state='shared',token_hash=$2 WHERE id=$1",[id,tokenHash(token)]);
  const updated=(await db.query("UPDATE service_requests SET status='quoted',version=version+1,updated_at=now() WHERE id=$1 RETURNING version",[p.request_id])).rows[0];
  await audit(db,p.request_id,actor,`Proposal v${p.revision} shared; previous acceptance invalidated`);
  await db.query('COMMIT');return {id,token,requestId:p.request_id,requestVersion:updated.version};
 }catch(e){await db.query('ROLLBACK');throw e}
}
function authorised(p,token){
 if(!p||typeof token!=='string'||token.length!==43||!p.token_hash||!timingSafeEqual(Buffer.from(tokenHash(token),'hex'),Buffer.from(p.token_hash,'hex')))throw new Problem(404,'This proposal link is unavailable.');
 if(!['shared','accepted'].includes(p.state))throw new Problem(410,'This proposal has been replaced or withdrawn.');
 if(p.state==='shared'&&new Date(p.valid_until).getTime()<=Date.now())throw new Problem(410,'This proposal has expired. Ask Sogod for an updated offer.');
}
export function customerView(p){return {id:p.id,revision:p.revision,state:p.state,currency:p.currency,lines:p.lines.map(l=>({description:l.description,quantity:l.quantity,unitPriceMinor:l.unitPriceMinor,type:l.type})),totalMinor:p.total_minor,terms:p.terms,validUntil:p.valid_until,acceptedAt:p.accepted_at};}
export async function readProposal(db,id,token){const p=(await db.query('SELECT * FROM proposals WHERE id=$1',[id])).rows[0];authorised(p,token);return customerView(p)}
export async function acceptProposal(db,id,token){
 await db.query('BEGIN');try{
  const peek=(await db.query('SELECT request_id FROM proposals WHERE id=$1',[id])).rows[0];if(!peek)throw new Problem(404,'This proposal link is unavailable.');
  const request=(await db.query('SELECT status FROM service_requests WHERE id=$1 FOR UPDATE',[peek.request_id])).rows[0];
  const p=(await db.query('SELECT * FROM proposals WHERE id=$1 FOR UPDATE',[id])).rows[0];authorised(p,token);
  if(p.state==='accepted'){await db.query('COMMIT');return {accepted:true,alreadyAccepted:true}}
  if(request.status!=='quoted')throw new Problem(409,'This request is not accepting proposal responses.');
  await db.query("UPDATE proposals SET state='accepted',accepted_at=now() WHERE id=$1",[id]);
  await audit(db,p.request_id,'customer via private proposal link',`Proposal v${p.revision} accepted; not booking confirmation`);
  await db.query('COMMIT');return {accepted:true,alreadyAccepted:false};
 }catch(e){await db.query('ROLLBACK');throw e}
}
