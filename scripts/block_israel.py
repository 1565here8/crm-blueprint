"""Block Israel IPs from tradetoros.com + add noindex header."""
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
host = '104.207.70.155'; user = 'root'; pw = 'Af1P5Ba3QGHu7w17zy'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=15, look_for_keys=False, allow_agent=False)

def run(cmd):
    print(f'$ {cmd}')
    stdin, stdout, stderr = c.exec_command(cmd, timeout=30)
    out = stdout.read().decode('utf-8',errors='replace').strip()
    err = stderr.read().decode('utf-8',errors='replace').strip()[:500]
    if out: print(out)
    if err: print('ERR:', err)
    print()

new_conf = """# Main public site - proxy to app for public landing at root
server {
    listen 80;
    server_name tradetoros.com www.tradetoros.com;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    server_name tradetoros.com www.tradetoros.com;
    ssl_certificate /etc/letsencrypt/live/tradetoros.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tradetoros.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 10M;

    # Block Israel
    if ($http_cf_ipcountry = "IL") {
        return 403;
    }

    # Noindex header to prevent search indexing
    add_header X-Robots-Tag "noindex, nofollow";

    # Public landing at root and other paths (except CRM path)
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # CRM at /democrm - rewrite to /admin so React router matches
    location /democrm {
        rewrite ^/democrm(.*)$ /admin$1 break;
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host admin.tradetoros.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin CRM subdomains (full admin)
server {
    listen 80;
    server_name admin.tradetoros.com backoffice.tradetoros.com;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    server_name admin.tradetoros.com backoffice.tradetoros.com;
    ssl_certificate /etc/letsencrypt/live/tradetoros.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tradetoros.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 10M;

    # Block Israel (admin too)
    if ($http_cf_ipcountry = "IL") {
        return 403;
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

# Write the new config
stdin, stdout, stderr = c.exec_command('cat > /etc/nginx/sites-available/tradetoros', timeout=10)
stdin.write(new_conf)
stdin.channel.shutdown_write()
out = stdout.read().decode('utf-8',errors='replace').strip()
err = stderr.read().decode('utf-8',errors='replace').strip()[:500]
if out: print(out)
if err: print('ERR:', err)

# Test nginx config
print('=== Testing nginx config ===')
run('nginx -t 2>&1')

# Reload nginx
print('=== Reloading nginx ===')
run('systemctl reload nginx 2>&1')

# Verify Israel block
print('=== Verify Israel block ===')
run('curl -s -o /dev/null -w "IL visitor: HTTP %{http_code}\n" -H "CF-IPCountry: IL" http://localhost/ 2>&1')
run('curl -s -o /dev/null -w "US visitor: HTTP %{http_code}\n" -H "CF-IPCountry: US" http://localhost/ 2>&1')

# Check headers for noindex
print('=== Verify noindex header ===')
run('curl -s -D- https://tradetoros.com/ 2>&1 | head -20')

# Also check admin
print('=== Verify admin Israel block ===')
run('curl -s -o /dev/null -w "Admin IL: HTTP %{http_code}\n" -H "CF-IPCountry: IL" -H "Host: admin.tradetoros.com" http://localhost/ 2>&1')

c.close()
print('DONE')
