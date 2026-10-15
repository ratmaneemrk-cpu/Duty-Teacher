# Duty-Teacher

ระบบรายงานเวรประจำวันครู โรงเรียนโคกสีวิทยาสรรค์ — React + Vite + Firebase (โปรเจค `duty-teacher`)
Repo: https://github.com/ratmaneemrk-cpu/Duty-Teacher.git

## กฎการทำงาน

- ทุกครั้งที่แก้โค้ด ต้องรัน `npm run check` (ESLint --max-warnings 0 + vite build) ให้ผ่านก่อน commit/push
- ห้าม commit ไฟล์ `.env`
- ข้อความ UI เป็นภาษาไทย
- ถ้าเปลี่ยนโครงสร้างข้อมูล ให้แก้ `firestore.rules` / `firestore.indexes.json` ให้สอดคล้องกัน
