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

## Passo 9: Configurar Regras de Firewall (Oracle Cloud + Ubuntu)

### 9.1: Regras de Entrada no Oracle Cloud Console (Obrigatório!)
1. Acesse o [Oracle Cloud Console](https://cloud.oracle.com/)
2. Vá para **Compute > Instances > Sua VM (Trip-App-VM)**
3. Na seção **Resources**, clique em **Subnet** (deve haver uma subnet padrão)
4. Na página da Subnet, clique em **Security Lists**
5. Clique na **Security List padrão** (geralmente chamada de `Default Security List for ...`)
6. Clique em **Add Ingress Rules**
7. Adicione as seguintes regras de entrada (uma por vez):

---

#### Regra 1: Permitir HTTP (Porta 80)
| Campo | Valor |
|-------|-------|
| Stateless | **No** (Deixe desmarcado) |
| Source Type | **CIDR** |
| Source CIDR | `0.0.0.0/0` |
| IP Protocol | **TCP** |
| Source Port Range | Deixe vazio |
| Destination Port Range | `80` |
| Description | `Permitir HTTP (web)` |

Clique em **Add Ingress Rule**

---

#### Regra 2: Permitir HTTPS (Porta 443)
| Campo | Valor |
|-------|-------|
| Stateless | **No** |
| Source Type | **CIDR** |
| Source CIDR | `0.0.0.0/0` |
| IP Protocol | **TCP** |
| Source Port Range | Deixe vazio |
| Destination Port Range | `443` |
| Description | `Permitir HTTPS (web seguro)` |

Clique em **Add Ingress Rule**

---

#### Regra 3: Permitir SSH (Porta 22) (Já deve existir!)
Verifique se já há uma regra para porta 22 — se não, adicione-a:
| Campo | Valor |
|-------|-------|
| Stateless | **No** |
| Source Type | **CIDR** |
| Source CIDR | `SEU-IP-LOCAL/32` (ou `0.0.0.0/0` para acesso de qualquer lugar, menos seguro) |
| IP Protocol | **TCP** |
| Source Port Range | Deixe vazio |
| Destination Port Range | `22` |
| Description | `Permitir SSH` |

---

### 9.2: Configurar Firewall Ubuntu (ufw) (Opcional, mas Recomendado)
Na VM, configure o `ufw` para permitir apenas as portas necessárias:
```bash
# Habilitar ufw
sudo ufw enable

# Permitir SSH, HTTP e HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar status
sudo ufw status
```

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
