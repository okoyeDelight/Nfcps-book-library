import {db,error,json,requireAuth} from '@appdeploy/sdk';
type MemberSyncRecord={version:number;snapshot:Record<string,unknown>;updatedAt:string};
const table=(userId:string)=>`member_sync_${userId.replace(/[^A-Za-z0-9_-]/g,'_')}`;
async function readMember(userId:string){const{items}=await db.list<MemberSyncRecord>(table(userId),{limit:1});return items[0]||null}
export const memberSyncRoutes={
'GET /api/member-sync':[requireAuth(),async(ctx)=>{const current=await readMember(ctx.user!.userId);return json({snapshot:current?.snapshot||null,updatedAt:current?.updatedAt||null})}],
'PUT /api/member-sync':[requireAuth(),async(ctx)=>{const body=(ctx.body||{}) as {snapshot?:unknown};if(!body.snapshot||typeof body.snapshot!=='object'||Array.isArray(body.snapshot))return error('Invalid sync snapshot.',400);const snapshot=body.snapshot as Record<string,unknown>;const bytes=new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;if(bytes>220000)return error('Your synced library is too large for one update. Keep fewer very large notes and try again.',413);const updatedAt=new Date().toISOString();const record:MemberSyncRecord={version:1,snapshot,updatedAt};const current=await readMember(ctx.user!.userId);if(current){const[ok]=await db.update(table(ctx.user!.userId),[{id:current.id,record}]);if(!ok)return error('Could not update your NFCPS cloud copy.',500)}else{const[id]=await db.add(table(ctx.user!.userId),[record]);if(!id)return error('Could not create your NFCPS cloud copy.',500)}return json({snapshot,updatedAt})}]
};
