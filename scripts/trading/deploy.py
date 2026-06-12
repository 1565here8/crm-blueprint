import paramiko, os, sys, json
sys.stdout.reconfigure(encoding='utf-8')

"""Deploy trading site blueprint to VPS.
Usage: python scripts/deploy.py <vps-host> <domain>

Requires env var: VPS_ROOT_PASSWORD
"""
host = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('VPS_HOST', '')
domain = sys.argv[2] if len(sys.argv) > 2 else ''
password = os.environ.get('VPS_ROOT_PASSWORD', '')

if not host or not password:
    print("Usage: VPS_ROOT_PASSWORD=xxx python scripts/deploy.py <vps-host> <domain>")
    print("Or set VPS_HOST in .env")
    sys.exit(1)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username='root', password=password, timeout=15, look_for_keys=False, allow_agent=False)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8',errors='replace').strip()
    err = stderr.read().decode('utf-8',errors='replace').strip()[:500]
    if out: print(out)
    if err: print('ERR:', err)

# Step 1: Install deps
print("=== Installing system dependencies ===")
run('apt-get update -qq && apt-get install -y -qq curl git nginx nodejs npm certbot python3-certbot-nginx')

# Step 2: Clone repo
print("\n=== Cloning blueprint repo ===")
run('rm -rf /opt/trading-site && git clone https://github.com/1565here8/crm-blueprint.git /opt/trading-site')

# Step 3: Setup env
print("\n=== Setting up environment ===")
run('cd /opt/trading-site && cp .env.example .env')
run(f"cd /opt/trading-site && sed -i 's/JWT_SECRET=.*/JWT_SECRET={os.urandom(32).hex()}/' .env")
run(f"cd /opt/trading-site && sed -i 's/CSRF_SECRET=.*/CSRF_SECRET={os.urandom(16).hex()}/' .env")
run(f"cd /opt/trading-site && sed -i 's/ADMIN_SECRET=.*/ADMIN_SECRET={os.urandom(12).hex()}/' .env")
run("cd /opt/trading-site && sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env")
if domain:
    run(f"cd /opt/trading-site && sed -i 's|CORS_ORIGIN=http://localhost:5173|CORS_ORIGIN=https://{domain}|' .env")

# Step 4: Build
print("\n=== Building ===")
run('cd /opt/trading-site && npm install && npm run build')

# Step 5: Nginx
print("\n=== Configuring Nginx ===")
if domain:
    nginx_conf = f"""server {{
    listen 80;
    server_name {domain} www.{domain};
    return 301 https://$server_name$request_uri;
}}
server {{
    listen 443 ssl http2;
    server_name {domain} www.{domain};
    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 10M;

    add_header X-Robots-Tag "noindex, nofollow";
    if ($http_cf_ipcountry = "IL") {{ return 403; }}

    location / {{
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    location /assets/ {{
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
}}"""

    stdin, stdout, stderr = client.exec_command('cat > /etc/nginx/sites-available/trading-site', timeout=10)
    stdin.write(nginx_conf)
    stdin.channel.shutdown_write()

    run('ln -sf /etc/nginx/sites-available/trading-site /etc/nginx/sites-enabled/trading-site')
    run('rm -f /etc/nginx/sites-enabled/default')

    # Step 6: SSL
    print("\n=== Getting SSL certificate ===")
    run(f'certbot --nginx -d {domain} -d www.{domain} --non-interactive --agree-tos --email admin@{domain}')

    # Step 7: Reload nginx
    run('nginx -t && systemctl reload nginx')

# Step 8: PM2
print("\n=== Starting app with PM2 ===")
run('npm install -g pm2 2>/dev/null || true')
run('cd /opt/trading-site && pm2 delete trading-crm 2>/dev/null; pm2 start ecosystem.config.cjs && pm2 save')
run('pm2 status')

print(f"\n=== DONE ===")
if domain:
    print(f"Site: https://{domain}")
    print(f"Admin: https://{domain}/admin")

client.close()
