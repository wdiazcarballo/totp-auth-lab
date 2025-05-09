// เก็บข้อมูลผู้ใช้ปัจจุบัน
let currentUser = null;

// เลือกองค์ประกอบ
const userIdInput = document.getElementById('userId');
const generateBtn = document.getElementById('generateBtn');
const qrcodeContainer = document.getElementById('qrcode-container');
const qrcodeElement = document.getElementById('qrcode');
const secretKeyElement = document.getElementById('secret-key');
const verifySection = document.getElementById('verify-section');
const tokenInput = document.getElementById('token');
const verifyBtn = document.getElementById('verifyBtn');
const resultContainer = document.getElementById('result-container');
const resultMessage = document.getElementById('result-message');
const timestamp = document.getElementById('timestamp');
const auditSection = document.getElementById('audit-section');
const auditBtn = document.getElementById('auditBtn');
const auditResult = document.getElementById('audit-result');
const registrationTime = document.getElementById('registration-time');
const lastUsed = document.getElementById('last-used');

// สร้าง Secret และ QR Code
generateBtn.addEventListener('click', async () => {
  const userId = userIdInput.value.trim();
  
  if (!userId) {
    alert('กรุณากรอกรหัสผู้ใช้');
    return;
  }
  
  try {
    const response = await fetch('/api/generate-secret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // แสดง QR Code และรหัสลับ
      qrcodeElement.innerHTML = `<img src="${data.qrCode}" alt="QR Code">`;
      secretKeyElement.textContent = data.secret;
      qrcodeContainer.classList.remove('hidden');
      
      // แสดงส่วนยืนยันตัวตน
      verifySection.classList.remove('hidden');
      auditSection.classList.remove('hidden');
      
      // บันทึกผู้ใช้ปัจจุบัน
      currentUser = userId;
    } else {
      alert(data.error || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
  }
});

// ยืนยันตัวตนด้วย TOTP
verifyBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  
  if (!currentUser) {
    alert('กรุณาลงทะเบียนก่อน');
    return;
  }
  
  if (!token) {
    alert('กรุณากรอกรหัส TOTP');
    return;
  }
  
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: currentUser, token })
    });
    
    const data = await response.json();
    
    resultContainer.classList.remove('hidden');
    
    if (response.ok && data.success) {
      resultContainer.className = 'success';
      resultMessage.textContent = 'การยืนยันตัวตนสำเร็จ!';
      timestamp.textContent = `เวลา: ${new Date(data.timestamp).toLocaleString()}`;
    } else {
      resultContainer.className = 'error';
      resultMessage.textContent = data.error || 'การยืนยันตัวตนล้มเหลว';
      timestamp.textContent = '';
    }
  } catch (error) {
    console.error('Error:', error);
    resultContainer.className = 'error';
    resultMessage.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
    timestamp.textContent = '';
  }
});

// แสดงประวัติการใช้งาน
auditBtn.addEventListener('click', async () => {
  if (!currentUser) {
    alert('กรุณาลงทะเบียนก่อน');
    return;
  }
  
  try {
    const response = await fetch(`/api/audit-trail/${currentUser}`);
    const data = await response.json();
    
    auditResult.classList.remove('hidden');
    
    if (response.ok) {
      registrationTime.textContent = `เวลาลงทะเบียน: ${new Date(data.registrationTime).toLocaleString()}`;
      lastUsed.textContent = data.lastUsed 
        ? `เข้าสู่ระบบล่าสุด: ${new Date(data.lastUsed).toLocaleString()}`
        : 'ยังไม่เคยเข้าสู่ระบบ';
    } else {
      auditResult.innerHTML = `<p class="error">${data.error || 'ไม่สามารถแสดงประวัติการใช้งานได้'}</p>`;
    }
  } catch (error) {
    console.error('Error:', error);
    auditResult.innerHTML = '<p class="error">เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์</p>';
  }
});