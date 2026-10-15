# ระบบรายงานการปฏิบัติหน้าที่เวรประจำวันครู

โปรแกรมให้ครูโรงเรียนโคกสีวิทยาสรรค์รายงานการปฏิบัติหน้าที่เวรประจำวันผ่านเว็บ ใช้งานบนมือถือได้

## ความสามารถ

- **ครู:** ล็อกอินด้วย Google, บันทึกรายงานเวร (ตรวจรายการ, จำนวนนักเรียนมาสาย/ขาด, เหตุการณ์, การแก้ไข, ข้อเสนอแนะ และแนบรูปได้ไม่เกิน 4 รูป), ดูหรือแก้ไขรายงานของตนเอง, ดูตารางเวร, พิมพ์หรือบันทึกรายงานเป็น PDF
- **ผู้ดูแลระบบ/ผู้บริหาร:** ดูรายงานทั้งหมดแยกตามเดือนพร้อมสรุปยอด, เขียนความเห็นและรับทราบรายงาน, ส่งออก CSV (เปิดใน Excel ได้), จัดตารางเวร, อนุมัติผู้ใช้และกำหนดสิทธิ์

## เทคโนโลยี

React 18 + Vite, Firebase Authentication (Google), Cloud Firestore และ Firebase Hosting

รูปภาพจะถูกย่อขนาดในเบราว์เซอร์แล้วเก็บใน Firestore จึงใช้แผนฟรี (Spark) ได้ ไม่ต้องเปิด Cloud Storage

## การติดตั้งครั้งแรก

1. ติดตั้ง [Node.js LTS](https://nodejs.org) และ [Git](https://git-scm.com)
2. `npm install`
3. ตั้งค่า Firebase (โปรเจค `duty-teacher`)
   - Firebase Console → **Build → Authentication** → Sign-in method → เปิด **Google**
   - **Build → Firestore Database** → Create database
   - **Project settings → General → Your apps** → เพิ่ม Web app แล้วคัดลอกค่า config
4. คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่า config จากข้อ 3
5. `npm run dev` แล้วเปิด http://localhost:5173

### ตั้งผู้ดูแลระบบคนแรก

1. เข้าสู่ระบบด้วยบัญชี Google ของผู้ดูแล (ระบบจะแสดงว่า "รออนุมัติ")
2. ไปที่ Firebase Console → Firestore → collection `users` → เลือกเอกสารของบัญชีนั้น
3. แก้ฟิลด์ `role` จาก `pending` เป็น `admin`
4. รีเฟรชหน้าเว็บ หลังจากนี้ผู้ดูแลอนุมัติครูคนอื่นได้จากเมนู "จัดการผู้ใช้"

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
| `users/{uid}` | `displayName`, `email`, `role` (`pending` / `teacher` / `admin`) |
| `reports/{id}` | รายงานเวร: `date`, `shift`, `uid`, `teacherName`, `checklist`, `studentsLate`, `studentsAbsent`, `incidents`, `actions`, `suggestions`, `status`, `adminComment` |
| `reports/{id}/photos/{id}` | รูปภาพประกอบ (JPEG data URL) |
| `schedules/{YYYY-MM-DD}` | ตารางเวรรายวัน: `teachers[]`, `note` |

สิทธิ์การเข้าถึงกำหนดไว้ใน `firestore.rules`
