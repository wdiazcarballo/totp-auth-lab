const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// เก็บข้อมูล secret ชั่วคราว (ในระบบจริงควรใช้ฐานข้อมูล)
let userSecrets = {};
let loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 นาที

// ระบบการล็อกบัญชีเมื่อมีการเข้าสู่ระบบที่ผิดพลาดเกินกำหนด
function checkLoginAttempts(userId) {
  if (!loginAttempts[userId]) {
    loginAttempts[userId] = {
      count: 0,
      lockUntil: 0
    };
  }
  
  const now = Date.now();
  if (loginAttempts[userId].lockUntil > now) {
    const remainingTime = Math.ceil((loginAttempts[userId].lockUntil - now) / 1000 / 60);
    return {
      allowed: false,
      message: `บัญชีถูกล็อก กรุณาลองอีกครั้งในอีก ${remainingTime} นาที`
    };
  }
  
  return { allowed: true };
}

function incrementLoginAttempts(userId) {
  loginAttempts[userId].count += 1;
  
  if (loginAttempts[userId].count >= MAX_ATTEMPTS) {
    loginAttempts[userId].lockUntil = Date.now() + LOCKOUT_TIME;
    loginAttempts[userId].count = 0;
    return false;
  }
  
  return true;
}

function resetLoginAttempts(userId) {
  if (loginAttempts[userId]) {
    loginAttempts[userId].count = 0;
  }
}

// สร้าง Secret และ QR Code
app.post('/api/generate-secret', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'กรุณาระบุ User ID' });
  }
  
  // สร้างข้อมูลลับสำหรับ TOTP
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `TechSecure:${userId}`
  });
  
  // เก็บข้อมูลลับไว้ (ในระบบจริงควรเก็บในฐานข้อมูล)
  userSecrets[userId] = {
    base32: secret.base32,
    registrationTime: new Date().toISOString(),
    lastUsed: null
  };
  
  // สร้าง QR Code
  QRCode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
    if (err) {
      return res.status(500).json({ error: 'ไม่สามารถสร้าง QR Code ได้' });
    }
    
    // บันทึกกิจกรรม (Audit log)
    console.log(`[${new Date().toISOString()}] User ${userId} ได้ลงทะเบียน TOTP`);
    
    res.json({ 
      success: true, 
      secret: secret.base32, 
      qrCode: dataUrl 
    });
  });
});

// ตรวจสอบความถูกต้องของ TOTP
app.post('/api/verify', (req, res) => {
  const { userId, token } = req.body;
  
  if (!userId || !token) {
    return res.status(400).json({ error: 'กรุณาระบุ User ID และ Token' });
  }
  
  // ตรวจสอบว่ามีข้อมูลลับของผู้ใช้หรือไม่
  if (!userSecrets[userId]) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
  }
  
  // ตรวจสอบการล็อก
  const loginCheck = checkLoginAttempts(userId);
  if (!loginCheck.allowed) {
    return res.status(403).json({ error: loginCheck.message });
  }
  
  // ตรวจสอบความถูกต้องของ TOTP
  const verified = speakeasy.totp.verify({
    secret: userSecrets[userId].base32,
    encoding: 'base32',
    token: token,
    window: 1 // อนุญาตให้มีความคลาดเคลื่อนได้ 1 ช่วงเวลา (±30 วินาที)
  });
  
  if (verified) {
    // บันทึกเวลาที่ใช้งานล่าสุด
    userSecrets[userId].lastUsed = new Date().toISOString();
    
    // บันทึกกิจกรรม (Audit log)
    console.log(`[${new Date().toISOString()}] User ${userId} ยืนยันตัวตนสำเร็จ`);
    
    // รีเซ็ตการนับจำนวนครั้งที่ล็อกอินผิดพลาด
    resetLoginAttempts(userId);
    
    res.json({ 
      success: true, 
      message: 'การยืนยันตัวตนสำเร็จ',
      timestamp: new Date().toISOString()
    });
  } else {
    // บันทึกความล้มเหลวในการยืนยันตัวตน
    console.log(`[${new Date().toISOString()}] User ${userId} ยืนยันตัวตนล้มเหลว`);
    
    // เพิ่มจำนวนครั้งที่ล็อกอินผิดพลาด
    const canContinue = incrementLoginAttempts(userId);
    
    if (!canContinue) {
      return res.status(403).json({ 
        success: false, 
        error: 'มีการพยายามเข้าสู่ระบบที่ผิดพลาดเกินกำหนด บัญชีถูกล็อกชั่วคราว' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'รหัส OTP ไม่ถูกต้อง' 
    });
  }
});

// แสดงประวัติการใช้งาน (Audit Trail)
app.get('/api/audit-trail/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userSecrets[userId]) {
    return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
  }
  
  res.json({
    userId,
    registrationTime: userSecrets[userId].registrationTime,
    lastUsed: userSecrets[userId].lastUsed
  });
});

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});