# Guia de Deploy - Oracle Free Tier VM com Docker

Este guia explica como fazer deploy da aplicação Fechamento de Viagem em uma VM Oracle Cloud Free Tier usando Docker e Git.

## Pré-requisitos

1. Conta no Oracle Cloud Free Tier
2. Conta no Supabase
3. Git instalado na VM
4. Docker e Docker Compose instalados na VM

---

## Passo 1: Criar VM no Oracle Cloud Free Tier

1. Acesse o Oracle Cloud Console
2. Vá para Compute > Instances
3. Clique em "Create Instance"
4. Configure:
   - Name: Trip-App-VM
   - Image: Canonical Ubuntu (escolha a versão LTS mais recente)
   - Shape: Ampere A1 (free tier) - 4 OCPUs, 24GB RAM (ou use VM.Standard.E2.1.Micro para x86)
   - SSH Keys: Adicione sua chave pública SSH
5. Clique em "Create"

Aguarde a VM inicializar (leva alguns minutos).

---

## Passo 2: Conectar à VM via SSH

Use o IP público da VM (encontrado no console do Oracle Cloud):

```bash
ssh ubuntu@SEU-IP-PUBLICO
```

---

## Passo 3: Atualizar pacotes e instalar dependências

```bash
# Atualizar lista de pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Git
sudo apt install -y git

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar seu usuário ao grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install -y docker-compose-plugin

# Verificar instalações
docker --version
docker compose version
git --version
```

---

## Passo 4: Configurar Repositório Git

No diretório home da VM:

```bash
# Clonar repositório
cd ~
git clone URL_DO_SEU_REPOSITORIO trip-app
cd trip-app
```

---

## Passo 5: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
nano .env
```

Adicione as seguintes variáveis (copie do seu arquivo `.env` local):

```env
VITE_SUPABASE_URL=seu-supabase-url
VITE_SUPABASE_ANON_KEY=seu-supabase-anon-key
```

Salve e saia: `Ctrl+X`, `Y`, `Enter`

---

## Passo 6: Criar Dockerfile

Crie um arquivo `Dockerfile` na raiz do projeto:

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

# Copiar build para diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## Passo 7: Criar Configuração do Nginx

Crie um arquivo `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

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

## Passo 8: Criar Docker Compose

Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    restart: always
    ports:
      - "80:80"
    container_name: trip-app-web
```

---

## Passo 9: Build e Iniciar o Container

```bash
# Build da imagem Docker
docker compose build

# Iniciar container em segundo plano
docker compose up -d

# Verificar logs
docker compose logs -f
```

---

## Passo 10: Configurar Firewall do Oracle Cloud

1. No Oracle Cloud Console, vá para Compute > Instances > Sua VM
2. Na seção "Resources", clique em "Subnet"
3. Clique em "Security List" associada
4. Adicione uma nova regra de entrada:
   - Source Type: CIDR
   - Source CIDR: 0.0.0.0/0
   - IP Protocol: TCP
   - Destination Port Range: 80
5. Salve a regra

---

## Passo 11: Acessar a Aplicação

Abra seu navegador e acesse:

```
http://SEU-IP-PUBLICO
```

---

## Atualizações Futuras

Para atualizar a aplicação com novas alterações do Git:

```bash
cd ~/trip-app

# Pull das alterações
git pull origin main

# Rebuild e restart do container
docker compose down
docker compose up -d --build

# Verificar logs
docker compose logs -f
```

---

## Backup

1. **Backup do Supabase**:
   - No painel do Supabase, faça backup da base de dados
   
2. **Backup da VM**:
   - No Oracle Cloud Console, crie um snapshot da VM periodicamente

---

## Troubleshooting

### Porta 80 está bloqueada?
Verifique se o `ufw` (firewall do Ubuntu) está permitindo a porta 80:
```bash
sudo ufw allow 80/tcp
```

### Container não inicia?
Verifique os logs:
```bash
docker compose logs web
```

### Problemas com o Git?
Configure suas credenciais Git na VM:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```
