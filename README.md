# ระบบรายงานการปฏิบัติหน้าที่เวรประจำวันครู

โปรแกรมให้ครูโรงเรียนโคกสีวิทยาสรรค์รายงานการปฏิบัติหน้าที่เวรประจำวันผ่านเว็บ ใช้งานบนมือถือได้

## ความสามารถ

- **ครู:** เข้าใช้งานด้วยชื่อผู้ใช้งาน (เช่น t016) รหัสผ่านเหมือนชื่อผู้ใช้งาน, บันทึกรายงานเวร (ตรวจรายการ, จำนวนนักเรียนมาสาย/ขาด, เหตุการณ์, การแก้ไข, ข้อเสนอแนะ และแนบรูปได้ไม่เกิน 4 รูป), ดูหรือแก้ไขรายงานของตนเอง, ดูตารางเวร, พิมพ์หรือบันทึกรายงานเป็น PDF
- **บุคลากร:** ผู้ดูแลเพิ่ม/แก้ไข/ลบรายชื่อ ชื่อผู้ใช้งาน และวันเวร ได้ที่เมนู "บุคลากร" (ครูดูได้อย่างเดียว)
- **ผู้ดูแลระบบ/ผู้บริหาร:** ดูรายงานทั้งหมดแยกตามเดือนพร้อมสรุปยอด, เขียนความเห็นและรับทราบรายงาน, ส่งออก CSV (เปิดใน Excel ได้), จัดตารางเวร, อนุมัติผู้ใช้และกำหนดสิทธิ์

## เทคโนโลยี

React 18 + Vite, Firebase Authentication (Anonymous), Cloud Firestore และ Firebase Hosting

รูปภาพจะถูกย่อขนาดในเบราว์เซอร์แล้วเก็บใน Firestore จึงใช้แผนฟรี (Spark) ได้ ไม่ต้องเปิด Cloud Storage

## การติดตั้งครั้งแรก

1. ติดตั้ง [Node.js LTS](https://nodejs.org) และ [Git](https://git-scm.com)
2. `npm install`
3. ตั้งค่า Firebase (โปรเจค `duty-teacher`)
   - Firebase Console → **Build → Authentication** → Sign-in method → เปิด **Anonymous**
   - **Build → Firestore Database** → Create database
   - **Project settings → General → Your apps** → เพิ่ม Web app แล้วคัดลอกค่า config
4. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า config จากข้อ 3
5. `npm run dev` แล้วเปิด http://localhost:5173

### ตั้งรหัสผ่านผู้ดูแลระบบ (ครั้งแรก)

1. Firebase Console → **Firestore Database** → Start collection ชื่อ `adminSecrets`
2. Document ID ใส่รหัสผ่านผู้ดูแลที่ต้องการ (ห้ามมี `/`) และเพิ่มฟิลด์ `username` = `admin` (รหัสใช้ได้กับชื่อผู้ใช้งานนี้เท่านั้น)
3. หน้าเข้าใช้งาน ใส่ชื่อผู้ใช้งาน `admin` และรหัสผ่านนั้น จะได้สิทธิ์ผู้ดูแลทันที
4. ครั้งต่อไปเปลี่ยนรหัสได้ที่เมนู "จัดการผู้ใช้"
5. บุคลากรที่มี `admin: true` (ตอนนี้คือ ผอ. `t999`) เข้าด้วยรหัสผ่านใน `adminSecrets` ที่มี `username` เป็นชื่อผู้ใช้งานของตน และได้สิทธิ์ผู้ดูแล

## Deploy

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy            # deploy hosting + firestore rules + indexes
```

หลัง deploy แล้ว ให้เพิ่มโดเมน `duty-teacher.web.app` ใน Authentication → Settings → Authorized domains (ปกติระบบเพิ่มให้อัตโนมัติ)

## การตรวจโค้ด

- `npm run lint` ตรวจ ESLint (ห้ามมี warning)
- `npm run check` ตรวจ lint และ build
- Git hooks ใน `.githooks/` รัน `npm run check` ก่อน commit และก่อน push อัตโนมัติ (ตั้งค่าให้เองตอน `npm install`)
- GitHub Actions รัน lint และ build ทุกครั้งที่ push

## โครงสร้างข้อมูล (Firestore)

| Collection | คำอธิบาย |
|---|---|
| `users/{uid}` | `displayName`, `username`, `role` (`pending` / `teacher` / `admin`) |
| `reports/{id}` | รายงานเวร: `date`, `shift`, `uid`, `teacherName`, `checklist`, `studentsLate`, `studentsAbsent`, `incidents`, `actions`, `suggestions`, `status`, `adminComment` |
| `reports/{id}/photos/{id}` | รูปภาพประกอบ (JPEG data URL) |
| `personnel/{id}` | บุคลากร: `name`, `position`, `phone`, `dutyDay` (0 = ไม่มีเวร, 1–5 = จันทร์–ศุกร์), `head` — ทุกคนดูได้ แก้ไขได้เฉพาะผู้ดูแล |
| `adminSecrets/{รหัสผ่าน}` | รหัสผ่านผู้ดูแลระบบ (id ของเอกสาร) อ่าน/เขียนได้เฉพาะผู้ดูแล |
| `schedules/{YYYY-MM-DD}` | ตารางเวรรายวัน: `teachers[]`, `note` |

สิทธิ์การเข้าถึงกำหนดไว้ใน `firestore.rules`
