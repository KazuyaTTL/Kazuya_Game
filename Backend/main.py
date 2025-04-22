from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()

# Dữ liệu mô phỏng database
fake_db = []
#Route mặc định
@app.get("/")
def home():
    return {"message": "Telegram Mini App backend is running."}

# Model cho user từ Telegram
class TelegramUser(BaseModel):
    id: int
    username: str = None
    first_name: str
    last_name: str = None
    photo_url: str = None

@app.post("/auth_telegram")
def auth_telegram(user: TelegramUser):
    for u in fake_db:
        if u['id'] == user.id:
            return {"message": "Đã đăng nhập!", "user": u}
    
    # Lưu mới nếu chưa có
    fake_db.append(user.dict())
    return {"message": "Đăng nhập lần đầu!", "user": user}
