# Инструкция по развёртыванию на VPS

## Требования
- VPS с Ubuntu 20.04+
- Docker и Docker Compose
- Домен (опционально)

## Быстрый старт

### 1. Подготовка сервера
```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt update
sudo apt install docker-compose
```

### 2. Загрузка проекта на сервер
```bash
# Клонируйте репозиторий или передайте файлы
git clone ваш-репозиторий /opt/avtorend
cd /opt/avtorend
```

### 3. Настройка переменных окружения
```bash
cp .env.example .env
nano .env
```

Заполните `.env`:
```env
SECRET_KEY=сгенерируйте-ключ-minimum-64-символа
ALLOWED_ORIGINS=https://ваш-домен.com

TELEGRAM_BOT_TOKEN=8310795061:AAG7Fm2dSyPoiIMsueZDXzyyK3vroNRiFao
TELEGRAM_ADMIN_IDS=854456461

CLOUDINARY_CLOUD_NAME=daxfsz15l
CLOUDINARY_API_KEY=288599529822729
CLOUDINARY_API_SECRET=OVtrZJHmq-QzHWSnU1BewtRApU4

API_BOT_USERNAME=telegrambot
API_BOT_PASSWORD=придумайте-сложный-пароль
```

### 4. Запуск
```bash
docker-compose up -d --build
```

### 5. Создание пользователя для бота
```bash
# Получить ID контейнера
docker-compose ps

# Выполнить миграции и создать пользователя
docker-compose exec app python -c "
from api.database import engine, Base
from api.models import User
from passlib.context import CryptContext

Base.metadata.create_all(bind=engine)
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
user = User(
    username='telegrambot',
    email='bot@avtorend.com',
    full_name='Telegram Bot',
    password_hash=pwd_context.hash('ваш-пароль-из-API_BOT_PASSWORD')
)
from sqlalchemy.orm import Session
with Session(engine) as session:
    session.add(user)
    session.commit()
print('User created!')
"
```

### 6. Проверка
```bash
docker-compose ps
docker-compose logs -f app
```

## Nginx (опционально, для домена)

```bash
sudo apt install nginx certbot python3-certbot-nginx

sudo nano /etc/nginx/sites-available/avtorend
```

```nginx
server {
    listen 80;
    server_name ваш-домен.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/avtorend /etc/nginx/sites-enabled/
sudo certbot --nginx -d ваш-домен.com
sudo nginx -t && sudo systemctl reload nginx
```

## Команды управления

```bash
# Перезапуск
docker-compose restart

# Логи
docker-compose logs -f

# Остановка
docker-compose down

# Обновление
git pull
docker-compose up -d --build
```
