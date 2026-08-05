# GhostWriter Authentication System

## 1. Project purpose

This project is a very simple full-stack login and registration system. It uses a React frontend, a FastAPI backend, and a Supabase PostgreSQL database. The code is intentionally small and beginner-friendly so the main ideas are easy to follow.

## 2. Folder structure

```text
project-hello-world-final/
├── Backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── db.py
│   │   ├── security.py
│   │   ├── models/
│   │   │   └── user_model.py
│   │   ├── schemas/
│   │   │   └── auth_schema.py
│   │   ├── controllers/
│   │   │   └── auth_controller.py
│   │   └── routes/
│   │       └── auth_route.py
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
├── Frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 3. Backend installation commands

```bash
# Go inside the backend folder
cd Backend

# Create the virtual environment
python3 -m venv .venv

# Activate the virtual environment on macOS/Linux
source .venv/bin/activate

# Install backend modules
pip install -r requirements.txt
```

## 4. Frontend installation commands

```bash
# Go inside the frontend folder
cd Frontend

# Install React and Vite node modules
npm install
```

## 5. How to run the backend

```bash
# Go inside the backend folder
cd Backend

# Activate the virtual environment on macOS/Linux
source .venv/bin/activate

# Start the FastAPI server
uvicorn app.main:app --reload
```

Backend Swagger URL: http://127.0.0.1:8000/docs

## 6. How to run the frontend

```bash
# Go inside the frontend folder
cd Frontend

# Start the React development server
npm run dev
```

Frontend URL: http://localhost:5173

## 7. API endpoint list

```text
GET  /
POST /auth/register
POST /auth/login
GET  /auth/me
```

## 8. Environment variable names without values

Backend single database URL name:

```text
DATABASE_URL
```

Backend split database variable names supported by the code:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
host
port
database
user
password
```

Backend JWT and app setting names:

```text
JWT_SECRET_KEY
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
FRONTEND_URL
```

Frontend variables:

```text
VITE_API_URL
```

## 9. How SQLAlchemy automatically creates the table

When the FastAPI app starts, `Backend/app/main.py` imports the `UserAuth` model and runs `Base.metadata.create_all(bind=engine)`. SQLAlchemy checks the connected PostgreSQL database and creates the `user_auth` table if it does not already exist.

## 10. How registration works

The frontend sends a username, phone number, and password to `POST /auth/register`. The backend checks if the username or phone number already exists. If both are new, it hashes the password with Argon2 and saves the user.

## 11. How login works

The frontend sends a username and password to `POST /auth/login`. The backend finds the user by username and compares the typed password with the stored password hash. If the login is valid, the backend returns a JWT.

## 12. How JWT works

The JWT stores the user ID in `sub` and an expiration time in `exp`. It does not store the password or phone number. The frontend saves the token in `localStorage` with the key `access_token` and sends it to `GET /auth/me` as a Bearer token.

## 13. How logout works

Logout removes `access_token` from `localStorage`, clears the current user in React state, and returns the app to the login screen.
