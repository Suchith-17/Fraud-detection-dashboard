# create_user.py (run from backend/ folder)
import sys
from app.db import engine, Base
from app.models import User
from app.auth import get_password_hash

def create_db_and_user(username, password, superuser=False):
    Base.metadata.create_all(bind=engine)
    from sqlalchemy.orm import Session
    from app.db import SessionLocal
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print("User already exists:", username)
            return
        u = User(username=username, hashed_password=get_password_hash(password), is_superuser=superuser)
        db.add(u)
        db.commit()
        print("Created user:", username)
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <username> <password> [--super]")
        sys.exit(1)
    user = sys.argv[1]
    pwd = sys.argv[2]
    is_super = "--super" in sys.argv
    create_db_and_user(user, pwd, is_super) 