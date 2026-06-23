# Guia Completo - DuckDNS + SSL + Oracle Free Tier
Para domínio: `trip-close.duckdns.org`

---

## 1. Passo 1: Criar Conta e Subdomínio no DuckDNS

1. Acesse o [DuckDNS](https://duckdns.org/)
2. Faça login usando sua conta Google/GitHub/etc.
3. No campo "subdomain", digite: `trip-close`
4. Clique em **"add domain"**
5. Você vai ver seu domínio: `trip-close.duckdns.org` e o seu Token (guarde esse Token!)

---

## 2. Passo 2: Atualizar Google Cloud OAuth Credentials

1. Volte para o [Google Cloud Console](https://console.cloud.google.com/)
2. Vá para **APIs & Services > Credentials**
3. Edite sua OAuth Client ID existente:
   - **Authorized JavaScript origins**: Adicione:
     - `http://trip-close.duckdns.org`
     - `https://trip-close.duckdns.org`
   - **Authorized redirect URIs**: Adicione (substitua SEU-PROJETO pelo seu projeto Supabase):
     - `https://trip-close.duckdns.org/auth/v1/callback`
     - `https://SEU-PROJETO.supabase.co/auth/v1/callback`
4. Salve!

---

## 3. Passo 3: Atualizar Supabase Auth

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **Authentication > URL Configuration**
3. Adicione o seu domínio em **Site URL**:
   - `https://trip-close.duckdns.org`
4. Adicione no **Additional Redirect URLs**:
   - `http://trip-close.duckdns.org`
   - `http://localhost:5173` (desenvolvimento)
   - `http://localhost:5174` (desenvolvimento)
5. Vá para **Authentication > Providers > Google**
6. Verifique se o **Redirect URL** já está correto (deve ser `https://SEU-PROJETO.supabase.co/auth/v1/callback`)

---

## 4. Passo 4: Configurar VM para Atualizar IP no DuckDNS (Automático)

Vamos criar um script que atualiza automaticamente o IP no DuckDNS periodicamente.

Conecte-se via SSH na sua VM Oracle:

```bash
# Edite o arquivo de configuração
nano duckdns.sh
```

Cole esse conteúdo (substitua SEU_TOKEN e trip-close pelo seu domínio):
```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=trip-close&token=SEU_TOKEN&ip=" | curl -k -o ~/duckdns.log -K -
```

Salve (Ctrl+X, Y, Enter) e dê permissão:
```bash
chmod +x duckdns.sh
```

Execute uma vez para testar:
```bash
./duckdns.sh
```

Se funcionar, verifique `cat duckdns.log` — deve aparecer "OK".

Adicione ao cron para executar a cada 5 minutos:
```bash
crontab -e
```

Adicione essa linha no final:
```
*/5 * * * * ~/duckdns.sh
```

Salve e feche.

---

## 5. Passo 5: Configurar SSL com Let's Encrypt (Certbot)

Para ter HTTPS, vamos usar Nginx + Certbot.

Atualize os pacotes:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

Vamos modificar o `nginx.conf` e o `docker-compose.yml` para suportar SSL:

---

### Arquivo 1: Atualizar nginx.conf (Projeto Local)

Atualize o seu arquivo `nginx.conf` no diretório do projeto local:
```nginx
server {
    listen 80;
    server_name trip-close.duckdns.org;

    # Redireciona tudo para HTTPS
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name trip-close.duckdns.org;

    root /usr/share/nginx/html;
    index index.html;

    # Certificados SSL (vamos gerar depois)
    ssl_certificate /etc/letsencrypt/live/trip-close.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trip-close.duckdns.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Configuração para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

---

### Arquivo 2: Atualizar docker-compose.yml (Projeto Local)

Atualize o seu `docker-compose.yml` no diretório do projeto local:
```yaml
version: '3.8'

services:
  web:
    build: .
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Mapeia certificados SSL da VM para o container
      - /etc/letsencrypt:/etc/letsencrypt:ro
      # Diretório temporário para desafio ACME
      - /var/www/html:/var/www/html
    container_name: trip-app-web
```

---

### Arquivo 3: Atualizar Dockerfile (Projeto Local)

Atualize o seu `Dockerfile` para copiar o novo `nginx.conf`:
```dockerfile
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar resto do código
COPY . .

# Build da aplicação
RUN npm run build

# Production stage
FROM nginx:alpine

# Instalar certbot (opcional, mas útil)
RUN apk add --no-cache certbot

# Copiar build para diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor portas 80 e 443
EXPOSE 80 443

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 6. Passo 6: Gerar Certificados SSL na VM

Depois de enviar os arquivos para a VM e parar o container antigo, vamos gerar os certificados:

1. Parar qualquer container rodando:
```bash
cd ~/trip-app
docker compose down
```

2. Instalar nginx temporariamente na VM para o desafio ACME (se não tiver):
```bash
sudo apt install nginx -y
sudo systemctl start nginx
```

3. Gerar certificado com Certbot:
```bash
sudo certbot certonly --nginx -d trip-close.duckdns.org
```

4. Siga as instruções (digite seu email, aceite os termos)

5. Depois de gerar, pare o nginx da VM:
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

6. Agora, inicie o seu container Docker:
```bash
docker compose up -d --build
```

---

## 7. Passo 7: Testar Tudo!

Acesse `https://trip-close.duckdns.org` no navegador. Deve aparecer o cadeado SSL!

Teste o login com Google — deve funcionar agora!

---

## 8. (Opcional) Renovação Automática de Certificado

Vamos adicionar uma tarefa cron para renovar o certificado automaticamente:

```bash
sudo crontab -e
```

Adicione essa linha para verificar renovação diariamente às 3h:
```
0 3 * * * certbot renew --quiet && docker compose -f ~/trip-app/docker-compose.yml restart web
```
