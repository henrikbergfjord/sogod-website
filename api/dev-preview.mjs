// Local-only demonstration. No Microsoft sign-in, external messages or production database.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {randomUUID} from 'node:crypto';
import {createRequest,updateRequest} from './src/store.js';
import {createProposal,shareProposal,readProposal,acceptProposal} from './src/proposals.js';
import {validate} from './src/domain.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),db=new PGlite(),origin='http://127.0.0.1:8768';
for(const file of ['001_services.sql','002_products_proposals.sql'])await db.exec(await readFile(path.join(root,'database',file),'utf8'));
const seed=await createRequest(db,validate({name:'Demo guest',email:'demo@example.invalid',kind:'experience',guests:20,arrival:'2027-04-04',items:[{id:'catering',quantity:1}],arrangement:'everything',consent:true,message:'Dinner for 20 with cake, tables and decoration.'},'2026-09-13'),randomUUID());
const offer=await createProposal(db,seed.id,{baseRevision:0,lines:[{description:'Local menu for 20 people',quantity:1,unitCostMinor:800000,unitPriceMinor:1000000,type:'service'},{description:'Coordination and setup',quantity:1,unitCostMinor:50000,unitPriceMinor:100000,type:'service_fee'}],terms:'DEMONSTRATION ONLY. Includes delivery and setup. No real order, payment or supplier arrangement.',validUntil:new Date(Date.now()+7*86400000).toISOString()},'demo');
const shared=await shareProposal(db,offer.id,'demo');
let pending=Promise.resolve();
async function api(req,url){const parts=url.pathname.split('/').filter(Boolean);let body={};if(req.method!=='GET'){if(req.headers.origin!==origin)throw Error('Local origin required');let raw='';for await(const data of req){raw+=data;if(raw.length>30000)throw Error('Too large')}body=raw?JSON.parse(raw):{}}
if(url.pathname==='/api/services/config')return {acceptingRequests:true};
if(url.pathname==='/api/requests'&&req.method==='POST')return {...await createRequest(db,validate(body),req.headers['idempotency-key']),status:'received'};
if(url.pathname==='/api/frontdesk/requests')return {requests:(await db.query("SELECT *,to_char(arrival,'YYYY-MM-DD') AS arrival,to_char(departure,'YYYY-MM-DD') AS departure FROM service_requests WHERE ($1='' OR status=$1) ORDER BY created_at DESC",[url.searchParams.get('status')||''])).rows};
if(parts[1]==='frontdesk'&&parts[2]==='requests'&&parts[4]==='proposals')return req.method==='GET'?{proposals:(await db.query('SELECT * FROM proposals WHERE request_id=$1 ORDER BY revision DESC',[parts[3]])).rows}:createProposal(db,parts[3],body,'local demo');
if(parts[1]==='frontdesk'&&parts[2]==='requests'&&req.method==='PATCH')return updateRequest(db,parts[3],body,'local demo');
if(parts[1]==='frontdesk'&&parts[2]==='proposals'&&parts[4]==='share'){const link=await shareProposal(db,parts[3],'local demo');return {url:origin+'/proposal.html#'+new URLSearchParams(link),message:'Local demo link. Nothing has been emailed.'}}
if(parts[1]==='proposals')return parts[3]==='accept'?acceptProposal(db,parts[2],req.headers['x-proposal-token']):readProposal(db,parts[2],req.headers['x-proposal-token']);
if(url.pathname==='/api/frontdesk/suppliers')return {suppliers:[]};
if(url.pathname==='/api/frontdesk/mail-status')return {states:[]};
throw Object.assign(Error('Not connected in this local demonstration.'),{status:503});}
http.createServer((req,res)=>{pending=pending.then(async()=>{try{const u=new URL(req.url,origin);if(u.pathname.startsWith('/api/')){const result=await api(req,u);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result));return}let rel=decodeURIComponent(u.pathname);if(rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,'.'+rel);if(!file.startsWith(root+path.sep)||rel.includes('/.')||rel.startsWith('/api')||rel.startsWith('/database'))throw Error('Unavailable');let content=await readFile(file);const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};if(ext==='.html')content=content.toString().replace('<body>','<body><div style="background:#f6d780;padding:10px;text-align:center;color:#102e27;font:16px sans-serif">LOCAL DEMO — fictional data; no Microsoft sign-in, emails or real bookings.</div>');res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(content)}catch(e){res.writeHead(e.status||400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}})}).listen(8768,'127.0.0.1',()=>{console.log('Local demo:',origin);console.log('Customer preview:',origin+'/proposal.html#'+new URLSearchParams(shared));});
