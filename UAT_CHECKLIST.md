# UAT CHECKLIST - Document Workflow System

## 1. Authentication
- [ ] Login ด้วย admin สำเร็จ
- [ ] Login ด้วย username/password ผิด ต้องไม่ผ่าน
- [ ] ได้ access token หลัง login
- [ ] Token ใช้เรียก API ได้

## 2. Document Upload
- [ ] Upload PDF ได้
- [ ] บันทึกชื่อไฟล์จริง
- [ ] บันทึก path ไฟล์ใน database
- [ ] สร้าง document record สำเร็จ
- [ ] แสดง status เริ่มต้นถูกต้อง

## 3. OCR / Text Extraction
- [ ] ระบบอ่านข้อความจาก PDF ได้
- [ ] กรณี OCR fail ระบบไม่ล่ม
- [ ] เก็บ extracted text ได้
- [ ] แสดงข้อความ OCR ในหน้ารายละเอียดเอกสาร

## 4. Auto Assignment
- [ ] ระบบ auto assign เอกสารได้
- [ ] จับประเภทเอกสารได้ถูกต้อง
- [ ] assign ไปยังหน่วยงาน/ผู้รับผิดชอบถูกต้อง
- [ ] มี log การ assign
- [ ] กรณีไม่พบ rule ต้องมี fallback

## 5. Document Status Workflow
- [ ] สถานะเริ่มต้นถูกต้อง
- [ ] เปลี่ยนสถานะเอกสารได้
- [ ] บันทึก status log
- [ ] แสดง timeline สถานะได้
- [ ] ป้องกันสถานะผิดลำดับ

## 6. Signature / Stamp
- [ ] Upload ลายเซ็นได้
- [ ] เลือกลายเซ็นได้
- [ ] ประทับลายเซ็นบน PDF ได้
- [ ] กำหนดตำแหน่ง x/y ได้
- [ ] Download stamped PDF ได้
- [ ] บันทึก version เอกสารหลังประทับลายเซ็น

## 7. Audit Log
- [ ] บันทึกผู้กระทำ
- [ ] บันทึกวันเวลา
- [ ] บันทึก action type
- [ ] ตรวจสอบย้อนหลังได้

## 8. Permissions / Roles
- [ ] Admin เห็นเมนูจัดการ
- [ ] Chief เห็นเอกสารที่เกี่ยวข้อง
- [ ] User ทั่วไปเห็นเฉพาะเอกสารของตนเอง
- [ ] Unauthorized user เข้า endpoint สำคัญไม่ได้

## 9. Frontend
- [ ] Upload document ผ่านหน้าเว็บได้
- [ ] แสดงผลหลัง upload ได้
- [ ] แสดงรายการเอกสารได้
- [ ] เปิดรายละเอียดเอกสารได้
- [ ] Download เอกสารได้
- [ ] หน้าจอไม่ error เมื่อไม่มีข้อมูล

## 10. Final UAT Result
- [ ] Auth ผ่าน
- [ ] Upload ผ่าน
- [ ] OCR ผ่าน
- [ ] Auto assign ผ่าน
- [ ] Workflow ผ่าน
- [ ] Signature ผ่าน
- [ ] Audit log ผ่าน
- [ ] Frontend ผ่าน

## Overall Result

UAT Status: PENDING

Tester: ______________________

Date: ______________________

Remark: ______________________
