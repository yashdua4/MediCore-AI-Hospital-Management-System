# Cloud Deployment & Environment Configuration Documentation

This document describes the environment variables, configuration parameters, and target platform setup guides required to host the **MediCore AI Hospital Management System** in production.

---

## 1. Production Environment Variables (Secrets)

The backend service expects the following secrets in its runtime context:

| Variable Name | Required | Default / Format | Description / Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://<user>:<password>@<host>:<port>/<dbname>` | PostgreSQL connection URI containing credentials and schema targets. |
| `JWT_SECRET` | Yes | High-entropy random string | Crypto secret token used to sign authentication payloads. |
| `PORT` | No | `5000` | Port backend server binds to. |
| `NODE_ENV` | No | `production` | Set to `production` to activate security controls and suppress verbose stack traces. |
| `CORS_ORIGIN` | No | `*` or comma-separated origins | Whitelisted frontend domains allowed to query REST APIs. |

---

## 2. Platform Setup Guides

### A. Render (Fully Managed PaaS)
Render is ideal for hosting web applications with integrated PostgreSQL databases.

1. **Deploy PostgreSQL**:
   - Go to Render Dashboard -> New -> **PostgreSQL**.
   - Input Name (`medicore-db`), Database name (`medicore`), User (`postgres`).
   - Copy the **Internal Database URL** for backend container communication, or **External Database URL** for administrative access.

2. **Deploy Backend (Web Service)**:
   - New -> **Web Service** -> Link git repo.
   - Set Environment to `Docker`.
   - Set Dockerfile Path to `backend/Dockerfile` (or use root context with `backend` subdirectory).
   - In Environment variables, set:
     - `DATABASE_URL`: Set to the Render Postgres connection URI.
     - `JWT_SECRET`: Generate a secure key.
     - `PORT`: `5000`.
   - Build command/Docker commands are executed automatically based on the Dockerfile.

3. **Deploy Frontend (Static Site)**:
   - New -> **Static Site** -> Link git repo.
   - Set Build Command to `npm run build` (Build Context: `frontend`).
   - Set Publish Directory to `dist`.
   - Add Rewrite rule in Render Site settings: Redirect all `/.*` requests to `/index.html` (Status: `200`) to support HTML5 History SPA routing.

---

### B. Railway (Rapid Container PaaS)
Railway offers seamless multi-service deployments using a single git repository.

1. **Provision Cluster**:
   - Click "New Project" -> **Provision PostgreSQL**.
   - Copy the auto-generated database connection string `DATABASE_URL`.

2. **Deploy Backend**:
   - Click "New" -> **GitHub Repo** -> Link repo.
   - In settings, set root directory to `backend`.
   - Railway will automatically detect the `Dockerfile` inside `backend/`.
   - Under variables, bind:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (automatic link).
     - `JWT_SECRET`: Secure secret.
     - `PORT`: `5000`.

3. **Deploy Frontend**:
   - Click "New" -> **GitHub Repo** -> Link repo.
   - Set root directory to `frontend`.
   - Railway will locate `frontend/Dockerfile` and compile the Vite Nginx web server.
   - Expose the frontend service public domain.

---

### C. Traditional VPS / Dedicated Server (PM2 + Nginx)
For Linux VPS instances (Ubuntu 22.04 LTS), execute:

1. **Prerequisites**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install nodejs npm postgresql postgresql-contrib nginx -y
   sudo npm install -g pm2
   ```

2. **Deploy Backend**:
   - Clone code to `/var/www/medicore`.
   - Build backend:
     ```bash
     cd /var/www/medicore/backend
     npm install
     npx prisma db push
     npm run build
     ```
   - Start with PM2:
     ```bash
     pm2 start dist/app.js --name "medicore-backend" --env DATABASE_URL="postgresql://..." JWT_SECRET="..." PORT="5000"
     pm2 save
     pm2 startup
     ```

3. **Deploy Frontend**:
   - Compile static assets:
     ```bash
     cd /var/www/medicore/frontend
     npm install
     npm run build
     ```
   - Copy build contents to public folder:
     ```bash
     sudo cp -r dist/* /var/www/html/
     ```
   - Configure Nginx virtual host (`/etc/nginx/sites-available/default`) to fallback routing:
     ```nginx
     server {
         listen 80;
         server_name _;
         root /var/www/html;
         index index.html;

         location / {
             try_files $uri $uri/ /index.html;
         }

         location /api/ {
             proxy_pass http://localhost:5000/api/;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
         }
     }
     ```
   - Reload Nginx: `sudo systemctl restart nginx`.

---

### D. AWS (ECS + RDS + S3 + CloudFront)
For large-scale, enterprise-ready hospital infrastructure:

1. **Database (RDS)**:
   - Create a PostgreSQL database instance in RDS within a private VPC subnet.

2. **Backend (ECS / Fargate)**:
   - Build backend Docker image, tag, and push to **AWS ECR**.
   - Create a Task Definition pointing to ECR.
   - Set up an ECS Service under an Application Load Balancer (ALB) exposing port 5000.
   - Keep task parameters in AWS Systems Manager (SSM) Parameter Store.

3. **Frontend (S3 + CloudFront)**:
   - Upload compiled `frontend/dist` folder to an **S3 Bucket** configured as static website hosting.
   - Put a **CloudFront Distribution** in front of S3 to serve assets over SSL/HTTPS globally, configuring error responses to route `404` to `/index.html` with status `200`.
