# 🦅 Troca.ai

Application for sticker collection management and trading (Panini-style albums).
Designed for users to mark their stickers (Have/Repeated) and find trade partners automatically.

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: TailwindCSS + Shadcn/ui
- **Backend/Auth**: Supabase (Auth, Database, Realtime)
- **Storage**: AWS S3 / MinIO (via AWS SDK)
- **Infrastructure**: Docker + Nginx (VPS Deployment)

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- NPM
- A Supabase Project
- An S3-compatible Storage Bucket (MinIO, AWS, or Supabase Storage)

### 2. Environment Setup
The project relies on environment variables for API connections.
Create a `.env` file in the **root** directory (do not commit this file):

```ini
# .env

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Object Storage (S3 / MinIO)
VITE_MINIO_ENDPOINT=https://files.troca-ai.com
VITE_MINIO_ACCESS_KEY=your-access-key
VITE_MINIO_SECRET_KEY=your-secret-key
```

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## 🚢 Deployment (VPS via GitHub Actions)

The project is configured for **Continuous Deployment** to a VPS using GitHub Actions.

### Setup Instructions
1. **VPS**: Ensure you have a Linux VPS with Docker installed.
2. **Secrets**: Add the following Secrets in your GitHub Repository Settings:

| Secret Name | Description |
|---|---|
| `VPS_HOST` | IP Address of your VPS |
| `VPS_USER` | SSH Username (e.g., ubuntu) |
| `VPS_SSH_KEY` | Private SSH Key (ensure public key is in `~/.ssh/authorized_keys` on VPS) |
| `VITE_SUPABASE_URL` | Production Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Production Supabase Key |
| `VITE_MINIO_ENDPOINT` | Production Storage URL |
| `VITE_MINIO_ACCESS_KEY` | Storage Access Key |
| `VITE_MINIO_SECRET_KEY` | Storage Secret Key |

### How it Works
1. When you push to `main`:
2. GitHub Actions connects to the VPS via SSH.
3. It builds the Docker Image **on the VPS**.
4. It swaps the running containers with zero downtime (almost).

## 🧪 Load Testing (K6)

We have a suite of load tests in `tests/load/`.

**Prerequisites**:
- [K6 Installed](https://k6.io/docs/get-started/installation/)

**Running a Test**:
```powershell
# Run the Frontend Load Test (500 VUs)
.\tests\load\run-test.ps1 frontend-load-test.js
```

See [tests/load/README.md](tests/load/README.md) for more details (if available) or check the scripts directly.

---

# 🇧🇷 Versão em Português

Aplicativo para gerenciamento de álbuns de figurinhas e trocas (estilo Panini).
Projetado para usuários marcarem suas figurinhas (Tenho/Repetidas) e encontrarem parceiros de troca automaticamente.

## 🛠️ Stack Tecnológica

- **Frontend**: React + TypeScript + Vite
- **UI**: TailwindCSS + Shadcn/ui
- **Backend/Auth**: Supabase (Auth, Database, Realtime)
- **Armazenamento**: AWS S3 / MinIO (via AWS SDK)
- **Infraestrutura**: Docker + Nginx (Deploy em VPS)

## 🚀 Como Iniciar

### 1. Pré-requisitos
- Node.js 20+
- NPM
- Um Projeto Supabase
- Um Bucket de Armazenamento compatível com S3 (MinIO, AWS ou Supabase Storage)

### 2. Configuração de Ambiente
O projeto depende de variáveis de ambiente para conexões de API.
Crie um arquivo `.env` no diretório **raiz** (não commite este arquivo):

```ini
# .env

# Configuração Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Object Storage (S3 / MinIO)
VITE_MINIO_ENDPOINT=https://files.troca-ai.com
VITE_MINIO_ACCESS_KEY=sua-access-key
VITE_MINIO_SECRET_KEY=sua-secret-key
```

### 3. Instalação e Execução
```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev
```

## 🚢 Deploy (VPS via GitHub Actions)

O projeto está configurado para **Deploy Contínuo** (CD) em uma VPS usando GitHub Actions.

### Instruções de Configuração
1. **VPS**: Garanta que você tenha uma VPS Linux com Docker instalado.
2. **Secrets**:  Adicione os seguintes "Secrets" nas configurações do seu repositório GitHub:

| Nome do Secret | Descrição |
|---|---|
| `VPS_HOST` | Endereço IP da sua VPS |
| `VPS_USER` | Usuário SSH (ex: ubuntu) |
| `VPS_SSH_KEY` | Chave Privada SSH (garanta que a pública esteja no `~/.ssh/authorized_keys` da VPS) |
| `VITE_SUPABASE_URL` | URL do Supabase de Produção |
| `VITE_SUPABASE_ANON_KEY` | Chave do Supabase de Produção |
| `VITE_MINIO_ENDPOINT` | URL do Storage de Produção |
| `VITE_MINIO_ACCESS_KEY` | Storage Access Key |
| `VITE_MINIO_SECRET_KEY` | Storage Secret Key |

### Como Funciona
1. Quando você faz push para a branch `main`:
2. O GitHub Actions conecta na VPS via SSH.
3. Ele constrói a Imagem Docker **dentro da VPS**.
4. Ele troca os containers em execução com quase zero downtime.

## 🧪 Testes de Carga (K6)

Temos uma suíte de testes de carga em `tests/load/`.

**Pré-requisitos**:
- [K6 Instalado](https://k6.io/docs/get-started/installation/)

**Rodando um Teste**:
```powershell
# Rodar o Teste de Carga do Frontend (500 VUs)
.\tests\load\run-test.ps1 frontend-load-test.js
```

Veja [tests/load/README.md](tests/load/README.md) para mais detalhes (se disponível) ou cheque os scripts diretamente.
