import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); dotenv.config();
if (getApps().length === 0) initializeApp({ credential: cert({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\n/g, '\n'),
})});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {auth:{persistSession:false}});
(async () => {
  const FS_UID = 'b6c4103e-ab74-415b-bca1-d4c349428f72';
  const fallbackEmail = `manligyeong_${FS_UID.slice(0,8)}@internal.antstreet.local`;
  const fsUser = (await getFirestore().collection('users').doc(FS_UID).get()).data()!;
  const { data: created, error } = await sb.auth.admin.createUser({
    email: fallbackEmail,
    password: 'V!' + Math.random().toString(36).slice(2) + Date.now(),
    email_confirm: true,
    user_metadata: { virtual: true, original_firestore_uid: FS_UID, original_email: fsUser.email },
  });
  if (error) { console.error('실패:', error.message); process.exit(1); }
  const newUid = created!.user.id;
  await sb.auth.admin.updateUserById(newUid, { ban_duration: '876000h' });
  await sb.from('users').update({
    nickname: fsUser.nickname,
    display_name: fsUser.displayName ?? null,
    photo_url: fsUser.photoURL ?? null,
    onboarding_completed: true,
    terms_agreed: true, privacy_agreed: true, investment_disclaimer_agreed: true,
    terms_version: '2026.02.01', privacy_version: '2026.02.01',
    agreed_at: new Date().toISOString(),
    equipped_badge_id: fsUser.equippedBadgeId ?? null,
    is_virtual: true,
  }).eq('id', newUid);
  console.log(`✓ 만리경: ${FS_UID} → ${newUid} (${fallbackEmail})`);
  const mappingPath = path.join(process.cwd(), 'scripts', 'output', 'phase3-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  mapping.users[FS_UID] = newUid;
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log('  매핑 저장 완료');
  process.exit(0);
})();
