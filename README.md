🚨 Fraud Detection Dashboard

A full-stack application that detects and explains fraudulent financial transactions using Machine Learning and SHAP-based explainability. Includes secure user authentication, batch prediction, and an interactive dashboard UI.

📌 Features

🔍 Fraud Detection Model using XGBoost + Scikit-Learn

🧠 Explainability with SHAP (Feature importance & per-record explanation)

📊 Dashboard for Transactions (Filter, search, batch upload)

🔐 OAuth2 Authentication

🧪 Synthetic Data Generator

🛠 Backend API with FastAPI

🖥 Modern frontend with React + TypeScript (Vite + shadcn/ui)

🧱 Tech Stack
Backend

FastAPI

XGBoost

Pandas

SHAP

Scikit-Learn

SQLAlchemy ORM

Frontend

React + TypeScript

Vite

Tailwind CSS

shadcn/ui Components

DevOps

Docker (optional)

GitHub for version control

Deployment target: Render (backend) + Vercel (frontend)

🏗 Architecture
Frontend (React + TypeScript)
        |
        | REST API
        v
Backend (FastAPI + XGBoost Model + SHAP)
        |
        v
SQL Database (via SQLAlchemy ORM)

🚀 Getting Started (Local Development)
1️⃣ Clone the Repository
git clone https://github.com/Suchith-17/Fraud-detection-dashboard.git
cd Fraud-detection-dashboard

2️⃣ Backend Setup
cd backend
pip install -r requirements.txt


Copy environment template:

cp .env.example .env


Run backend:

uvicorn app.main:app --reload


Docs available at:
➡ http://localhost:8000/docs

3️⃣ Frontend Setup
cd ../frontend
npm install


Copy env template:

cp .env.example .env


Run frontend:

npm run dev


UI will run at:
➡ http://localhost:5173/

🧪 Model Explainability

This project integrates SHAP (Shapley values) to interpret predictions:

Local explanation for individual records

Global feature impact visualization

This helps users understand why a transaction was flagged.

🐳 Docker Support

(Coming soon)

docker-compose up --build

📌 TODO / Future Enhancements

📡 Real-time streaming support (Kafka)

🎯 Model retraining & monitoring pipeline

📍 Role-based access control

📈 Advanced analytics dashboard

📄 License

📝 MIT License

⭐ Support

If you like this project, give it a ⭐ on GitHub — it helps a lot!

👉 https://github.com/Suchith-17/Fraud-detection-dashboard
