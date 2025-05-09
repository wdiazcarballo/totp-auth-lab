# TOTP Authentication Lab (ระบบยืนยันตัวตนแบบ TOTP)

ตัวอย่างระบบการยืนยันตัวตนแบบ Time-based One-Time Password (TOTP) สำหรับการยืนยันตัวตนแบบสองชั้น (2FA)

## คุณสมบัติ

- สร้าง TOTP secret และ QR code สำหรับแอปพลิเคชันยืนยันตัวตน (เช่น Google Authenticator)
- ตรวจสอบรหัส TOTP
- ล็อคบัญชีหลังจากพยายามเข้าสู่ระบบล้มเหลวหลายครั้ง
- บันทึกกิจกรรมพื้นฐาน (Audit Trail)

## ความต้องการของระบบ

- Node.js (v16+)
- npm
- บัญชี AWS (สำหรับการติดตั้งบน EC2)

## การพัฒนาบนเครื่องส่วนตัว

1. โคลนโปรเจค:
   ```
   git clone https://github.com/yourusername/totp-auth-lab.git
   cd totp-auth-lab
   ```

2. ติดตั้งแพ็คเกจที่จำเป็น:
   ```
   npm install
   ```

3. เริ่มต้นเซิร์ฟเวอร์สำหรับการพัฒนา:
   ```
   npm run dev
   ```

4. เข้าถึงแอปพลิเคชันที่: http://localhost:3000

## การติดตั้งบน AWS EC2

### 1. สร้าง EC2 Instance

1. เข้าสู่ระบบ AWS Management Console
2. ไปที่ EC2 Dashboard
3. สร้าง EC2 instance ใหม่:
   - เลือก Amazon Linux 2023 AMI
   - เลือก t2.micro (อยู่ในระดับ free tier)
   - ตั้งค่า security group ให้อนุญาต inbound traffic บน:
     - SSH (พอร์ต 22)
     - HTTP (พอร์ต 80)
     - HTTPS (พอร์ต 443)
     - Custom TCP (พอร์ต 3000) - หากต้องการเข้าถึงแอปโดยตรงโดยไม่ใช้ reverse proxy
   - สร้างและดาวน์โหลด key pair (.pem file)
   - เริ่มใช้งาน instance

### 2. เชื่อมต่อกับ EC2 Instance ของคุณ

```bash
chmod 400 your-key-pair.pem
ssh -i your-key-pair.pem ec2-user@your-instance-public-dns
```

### 3. ติดตั้ง Node.js และ Git บน EC2 Instance

```bash
# อัปเดตแพ็คเกจระบบ
sudo yum update -y

# ติดตั้ง Node.js และ npm
sudo yum install -y gcc-c++ make
curl -sL https://rpm.nodesource.com/setup_18.x | sudo -E bash -
sudo yum install -y nodejs

# ตรวจสอบการติดตั้ง Node.js และ npm
node -v
npm -v

# ติดตั้ง Git
sudo yum install -y git

# ตรวจสอบการติดตั้ง Git
git --version
```

### 4. ติดตั้งแอปพลิเคชันของคุณ

```bash
# โคลนโปรเจคจาก GitHub (หรืออัปโหลดไฟล์โดยตรง)
git clone https://github.com/yourusername/totp-auth-lab.git
cd totp-auth-lab

# ติดตั้งแพ็คเกจที่จำเป็น
npm install

# รันแอปพลิเคชัน
npm start
```

ในขั้นตอนนี้ แอปพลิเคชันของคุณควรทำงานที่พอร์ต 3000 บน EC2 instance

### 5. ตั้งค่า PM2 สำหรับการจัดการโปรเซส (แนะนำสำหรับการใช้งานจริง)

PM2 เป็นตัวจัดการโปรเซสสำหรับแอพพลิเคชัน Node.js ที่ช่วยให้แอพของคุณทำงานต่อเนื่องแม้เกิดข้อผิดพลาด

```bash
# ติดตั้ง PM2 แบบ global
sudo npm install -g pm2

# เริ่มต้นแอปพลิเคชันด้วย PM2
pm2 start server.js --name "totp-auth-lab"

# ตั้งค่าให้ PM2 เริ่มทำงานเมื่อเปิดเครื่อง
pm2 startup
# (ทำตามคำแนะนำที่แสดงจากคำสั่งนี้)

# บันทึกรายการโปรเซส PM2
pm2 save

# ตรวจสอบสถานะแอปพลิเคชัน
pm2 status
```

### 6. ตั้งค่า Nginx เป็น Reverse Proxy (แนะนำ)

```bash
# ติดตั้ง Nginx
sudo yum install -y nginx

# เริ่มต้น Nginx และตั้งค่าให้ทำงานเมื่อเปิดเครื่อง
sudo systemctl start nginx
sudo systemctl enable nginx

# สร้างไฟล์คอนฟิกสำหรับแอปพลิเคชันของคุณ
sudo nano /etc/nginx/conf.d/totp-auth-lab.conf
```

เพิ่มการตั้งค่าต่อไปนี้:

```
server {
    listen 80;
    server_name your_domain_or_ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# ทดสอบการตั้งค่า Nginx
sudo nginx -t

# รีโหลด Nginx เพื่อใช้การตั้งค่าใหม่
sudo systemctl reload nginx

# หากพบปัญหา ตรวจสอบ log
sudo tail -f /var/log/nginx/error.log
```

ตอนนี้คุณสามารถเข้าถึงแอปพลิเคชันผ่านโดเมนหรือ IP สาธารณะของ EC2 โดยไม่ต้องระบุพอร์ต

### 7. ตั้งค่า SSL ด้วย Let's Encrypt (แนะนำสำหรับการใช้งานจริง)

สำหรับการใช้งานจริง คุณควรเพิ่มความปลอดภัยให้แอปพลิเคชันของคุณด้วย HTTPS

```bash
# ติดตั้ง EPEL repository
sudo yum install -y epel-release

# ติดตั้ง Certbot และปลั๊กอินสำหรับ Nginx
sudo yum install -y certbot python3-certbot-nginx

# ขอและตั้งค่าใบรับรอง SSL
sudo certbot --nginx -d your_domain_name
```

ทำตามคำแนะนำเพื่อเสร็จสิ้นการตั้งค่า Certbot จะอัปเดตการตั้งค่า Nginx ของคุณโดยอัตโนมัติ

### 8. การตั้งค่าไฟร์วอลล์ (สำหรับ Amazon Linux)

```bash
# ตรวจสอบสถานะไฟร์วอลล์
sudo systemctl status firewalld

# หากยังไม่ได้ติดตั้ง ให้ติดตั้ง firewalld
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# เปิดพอร์ตที่จำเป็น
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# ตรวจสอบการตั้งค่า
sudo firewall-cmd --list-all
```

## ข้อควรพิจารณาด้านความปลอดภัย

- ในสภาพแวดล้อมการใช้งานจริง ควรเก็บข้อมูลลับของผู้ใช้ในฐานข้อมูล ไม่ใช่ในหน่วยความจำ
- เพิ่มการตรวจสอบตัวตนผู้ใช้ที่เหมาะสมก่อนการตรวจสอบ TOTP
- ใช้ HTTP Security Headers เพิ่มเติม
- พิจารณาใช้การจำกัดการเรียกใช้ API (Rate Limiting)
- อัปเดตแพ็คเกจอย่างสม่ำเสมอเพื่อความปลอดภัย

## วิธีการแก้ไขปัญหาเบื้องต้น

### แอปพลิเคชันไม่ทำงาน
```bash
# ตรวจสอบบันทึกของแอปพลิเคชัน
pm2 logs

# รีสตาร์ทแอปพลิเคชัน
pm2 restart totp-auth-lab
```

### ปัญหาเกี่ยวกับ Nginx
```bash
# ตรวจสอบสถานะ Nginx
sudo systemctl status nginx

# ตรวจสอบไฟล์บันทึกข้อผิดพลาด
sudo tail -f /var/log/nginx/error.log
```

### ปัญหาเกี่ยวกับไฟร์วอลล์
```bash
# ตรวจสอบสถานะไฟร์วอลล์
sudo systemctl status firewalld

# ตรวจสอบการตั้งค่าไฟร์วอลล์
sudo firewall-cmd --list-all
```

## ลิขสิทธิ์

ISC