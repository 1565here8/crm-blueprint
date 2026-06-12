import paramiko, os, sys
sys.stdout.reconfigure(encoding='utf-8')

host = '178.105.155.211'; user = 'root'; pw = os.environ.get('VPS_ROOT_PASSWORD', '')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=pw, timeout=15, look_for_keys=False, allow_agent=False)

domain = sys.argv[1] if len(sys.argv) > 1 else 'yourdomain.com'
password = os.environ.get('VPS_ROOT_PASSWORD', pw) if not pw else pw

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
}}
"""

sftp = client.open_sftp()
with sftp.open('/etc/nginx/sites-available/trading-site', 'w') as f:
    f.write(nginx_conf)
sftp.close()

cmds = [
    'ln -sf /etc/nginx/sites-available/trading-site /etc/nginx/sites-enabled/trading-site',
    'rm -f /etc/nginx/sites-enabled/default',
    'nginx -t',
    'systemctl reload nginx',
    'curl -s -o /dev/null -w "%{http_code}" http://localhost',
]
for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print('ERR:', err[:200])
client.close()
print('NGINX_DONE')
