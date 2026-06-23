# Guia de Deploy - Oracle Free Tier + DuckDNS + SSL (HTTPS)
Domínio personalizado: `trip-close.duckdns.org`

## Pré-requisitos
1. Conta no Oracle Cloud Free Tier
2. Conta no Supabase
3. Conta no DuckDNS com domínio `trip-close.duckdns.org`
4. Git, Docker e Docker Compose na VM

---

## Passo 1: Configurar DuckDNS (Local)

Segua o `GUIA_DUCKDNS_SSL.md`:
1. Crie o subdomínio `trip-close` no DuckDNS
2. Anote seu Token

---

## Passo 2: Configurar OAuth Google (Local)

Segua o `GUIA_GOOGLE_OAUTH.md`:
1. OAuth Credentials no Google Cloud Console
2. Adicione as origens e redirect URIs:
   - `http://localhost:5173` (dev)
   - `https://trip-close.duckdns.org` (prod)
   - `https://SEU-PROJETO.supabase.co/auth/v1/callback`
3. Habilite o provedor Google no Supabase

---

## Passo 3: Criar e Conectar à VM Oracle

1. Crie VM no Oracle Cloud (Ubuntu LTS, Ampere A1)
2. Conecte via SSH:
```bash
ssh ubuntu@SEU-IP-PUBLICO
```

---

## Passo 4: Instalar Dependências na VM

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Git, Certbot e Nginx (temporário)
sudo apt install -y git certbot python3-certbot-nginx nginx

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install -y docker-compose-plugin
```

Feche e reabra a conexão SSH para aplicar as permissões do Docker.

---

## Passo 5: Clonar Repositório e Configurar

```bash
# Clonar (ou envie os arquivos via SCP)
cd ~
git clone URL_DO_SEU_REPOSITORIO trip-app
cd trip-app

# Copiar arquivo .env (adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
nano .env
```

---

## Passo 6: Configurar Atualização Automática IP DuckDNS na VM

```bash
nano duckdns.sh
```

Cole (substitua SEU_TOKEN):
```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=trip-close&token=SEU_TOKEN&ip=" | curl -k -o ~/duckdns.log -K -
```

Salve, dê permissão e teste:
```bash
chmod +x duckdns.sh
./duckdns.sh
cat duckdns.log  # Deve retornar "OK"
```

Adicione ao cron (a cada 5 minutos):
```bash
crontab -e
# Adicione esta linha:
*/5 * * * * ~/trip-app/duckdns.sh
```

---

## Passo 7: Gerar Certificados SSL Let's Encrypt

```bash
# Inicie o Nginx temporariamente
sudo systemctl start nginx

# Gerar certificado
sudo certbot certonly --nginx -d trip-close.duckdns.org

# Depois, pare o Nginx para não conflitar com o container
sudo systemctl stop nginx
sudo systemctl disable nginx
```

---

## Passo 8: Iniciar Container com SSL

```bash
# Usar os arquivos de produção SSL
docker compose -f docker-compose.prod.yml up -d --build

# Verificar logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Passo 9: Configurar Regras de Firewall Oracle

1. No Oracle Cloud Console, vá para Compute > Instances > Sua VM > Resources > Subnet
2. Edite a Security List
3. Adicione regras de entrada:
   - **Porta 80 (HTTP)**: CIDR 0.0.0.0/0
   - **Porta 443 (HTTPS)**: CIDR 0.0.0.0/0

---

## Passo 10: Testar!

Acesse `https://trip-close.duckdns.org`!

## Renovação Automática do Certificado

Adicione ao cron (sudo):
```bash
sudo crontab -e
```

Adicione esta linha para renovar todos os dias às 3h:
```
0 3 * * * certbot renew --quiet && cd ~/trip-app && docker compose -f docker-compose.prod.yml restart web
```
