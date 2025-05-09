# TOTP Authentication Lab

A demonstration of Time-based One-Time Password (TOTP) authentication for two-factor authentication (2FA).

## Features

- Generate TOTP secrets and QR codes for authentication apps
- Verify TOTP tokens
- Account lockout after multiple failed attempts
- Basic audit trail functionality

## Prerequisites

- Node.js (v16+)
- npm
- AWS account (for EC2 deployment)

## Local Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/totp-auth-lab.git
   cd totp-auth-lab
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Access the application at: http://localhost:3000

## Deploying to AWS EC2

### 1. Set up an EC2 Instance

1. Log in to your AWS Management Console
2. Navigate to EC2 Dashboard
3. Launch a new EC2 instance:
   - Choose an Amazon Linux 2023 AMI
   - Select t2.micro (eligible for free tier)
   - Configure security group to allow inbound traffic on:
     - SSH (port 22)
     - HTTP (port 80)
     - HTTPS (port 443)
     - Custom TCP (port 3000) - if you want to access the app directly without a reverse proxy
   - Create and download a new key pair (.pem file)
   - Launch the instance

### 2. Connect to Your EC2 Instance

```bash
chmod 400 your-key-pair.pem
ssh -i your-key-pair.pem ec2-user@your-instance-public-dns
```

### 3. Install Node.js and Git on the EC2 Instance

```bash
# Update system packages
sudo yum update -y

# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Verify installations
node -v
npm -v
git --version
```

### 4. Clone and Set Up Your Application

```bash
# Clone the repository
git clone https://github.com/yourusername/totp-auth-lab.git
cd totp-auth-lab

# Install dependencies
npm install

# Start the application
npm start
```

At this point, your application should be running on port 3000 of your EC2 instance.

### 5. Set Up PM2 for Process Management (Production)

PM2 is a process manager for Node.js applications that keeps your application running.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your application with PM2
pm2 start server.js --name "totp-auth-lab"

# Set PM2 to start on system boot
pm2 startup
# (Follow the instructions output by this command)

# Save the PM2 process list
pm2 save
```

### 6. Set Up Nginx as a Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo yum install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure Nginx as a reverse proxy
sudo nano /etc/nginx/conf.d/totp-auth-lab.conf
```

Add the following configuration:

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
# Test Nginx configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

Now you can access your application via your domain name or EC2 public IP without specifying the port.

### 7. Set Up SSL with Let's Encrypt (Optional but Recommended)

For production environments, you should secure your application with HTTPS.

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Obtain and configure SSL certificate
sudo certbot --nginx -d your_domain_name
```

Follow the prompts to complete the setup. Certbot will automatically update your Nginx configuration.

## Security Considerations

- In a production environment, store user secrets in a database, not in memory
- Add proper user authentication before TOTP verification
- Implement additional security headers
- Consider implementing rate limiting
- Regularly update dependencies for security patches

## License

ISC