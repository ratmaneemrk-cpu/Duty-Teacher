export default function SetupNotice() {
  return (
    <div className="center-screen">
      <div className="card narrow">
        <h1>ยังไม่ได้ตั้งค่า Firebase</h1>
        <p>
          กรุณาคัดลอกไฟล์ <code>.env.example</code> เป็น <code>.env</code> แล้วใส่ค่า Firebase config
          ของเว็บแอปจาก Firebase Console (Project settings → General → Your apps) จากนั้นรันโปรแกรมใหม่
        </p>
      </div>
    </div>
  )
}
