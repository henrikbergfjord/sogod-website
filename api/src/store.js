import {randomUUID} from 'node:crypto';
import {Problem,TRANSITIONS,hash} from './domain.js';
export async function createRequest(db,p,key,env={}){
 await db.query('BEGIN');
 try{
  const id=randomUUID(),fingerprint=hash(p);
  const r=await db.query(`INSERT INTO service_requests(id,idempotency_key,payload_hash,customer_name,email,phone,kind,property_id,arrival,departure,guests,items,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,[id,key,fingerprint,p.name,p.email,p.phone,p.kind,p.property,p.arrival,p.departure,p.guests,JSON.stringify(p.items),JSON.stringify(p.details)]);
  if(!r.rows.length){const old=(await db.query('SELECT id,payload_hash FROM service_requests WHERE idempotency_key=$1',[key])).rows[0];if(old.payload_hash!==fingerprint)throw new Problem(409,'This request changed. Please submit it again.');await db.query('COMMIT');return {id:old.id,duplicate:true}}
  await db.query('INSERT INTO request_audit(request_id,actor,action) VALUES($1,$2,$3)',[id,'customer','Request received']);
  const body=`Thank you, ${p.name}.\n\nWe received your Sogod request ${id}. This is not a booking confirmation. Our team must confirm availability and price.\n\nDate: ${p.arrival}${p.departure?' to '+p.departure:''}\nGuests: ${p.guests}\nServices: ${p.items.map(x=>x.id+' × '+x.quantity).join(', ')||'Accommodation only'}\n\nPlease reply to our front desk for changes.`;
  if(env.MAIL_REPLY_TO)await db.query('INSERT INTO mail_outbox(id,request_id,recipient,subject,body) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,p.email,'Sogod — request received',body]);
  if(env.FRONTDESK_EMAIL)await db.query('INSERT INTO mail_outbox(id,request_id,recipient,subject,body) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,env.FRONTDESK_EMAIL,'New Sogod request',`Request ${id} is waiting in front desk. Open ${env.PUBLIC_ORIGIN}/frontdesk/ to review it.`]);
  await db.query('COMMIT');return {id,duplicate:false};
 }catch(e){await db.query('ROLLBACK');throw e}
}
export async function updateRequest(db,id,p,actor,env={}){
 await db.query('BEGIN');
 try{
  const old=(await db.query('SELECT * FROM service_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!old)throw new Problem(404,'Request not found.');
  if(p.version!==old.version)throw new Problem(409,'Someone else updated this request. Reload it before saving.');
  if(p.status!==old.status&&!TRANSITIONS[old.status].includes(p.status))throw new Problem(409,'This status change is not allowed.');
  let quotePesos=old.quote_pesos;
  if(p.status==='confirmed'&&old.status!=='confirmed'){
   const offer=(await db.query("SELECT * FROM proposals WHERE request_id=$1 AND state='accepted' ORDER BY revision DESC LIMIT 1",[id])).rows[0];
   if(!offer)throw new Problem(409,'The customer must accept a shared proposal before confirmation.');
   if(p.operationsConfirmed!==true)throw new Problem(400,'Check suppliers, external calendars and any required payment before confirming.');
   if(!p.supplierPlan?.trim()&&old.items.length)throw new Problem(400,'Record supplier arrangements before confirming.');
   quotePesos=offer.total_minor/100;
   if(old.property_id){
    const property=(await db.query('SELECT * FROM properties WHERE id=$1',[old.property_id])).rows[0];
    if(!property?.confirmation_enabled||!property.resource_group||!property.capacity||old.guests>property.capacity||!property.opening_date)throw new Problem(409,'Verify property capacity, opening and resource mapping before confirming.');
    const start=new Date(old.arrival),end=new Date(old.departure);
    if(start<new Date(property.opening_date)||(end-start)/86400000<property.minimum_nights)throw new Problem(409,'Dates do not meet property opening or minimum-stay rules.');
    await db.query(`INSERT INTO resource_nights(property_id,night,request_id) SELECT $1,d::date,$2 FROM generate_series($3::date,$4::date-1,interval '1 day') d`,[property.resource_group,id,old.arrival,old.departure]);
   }
  }
  if(p.status==='cancelled')await db.query('DELETE FROM resource_nights WHERE request_id=$1',[id]);
  await db.query(`UPDATE service_requests SET status=$2,assigned_to=$3,internal_notes=$4,supplier_plan=$5,quote_pesos=$6,version=version+1,updated_at=now() WHERE id=$1`,[id,p.status,p.assignedTo||'',p.notes||'',p.supplierPlan||'',quotePesos]);
  await db.query('INSERT INTO request_audit(request_id,actor,action) VALUES($1,$2,$3)',[id,actor,`${old.status} → ${p.status}; quote ${quotePesos} PHP; operations checked ${p.operationsConfirmed===true}`]);
  await db.query('COMMIT');return {id,version:old.version+1};
 }catch(e){await db.query('ROLLBACK');if(e.code==='23505')throw new Problem(409,'These accommodation dates are already booked. Nothing was confirmed.');throw e}
}
