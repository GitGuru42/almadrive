"""
cloudinary_storage.py - Универсальное хранилище для фото
Поддерживает Cloudinary для продакшена и локальное для разработки
"""

import os
import logging
from pathlib import Path
from typing import List, Optional
import hashlib
from datetime import datetime

logger = logging.getLogger(__name__)

class CarPhotoStorage:
    """Класс для управления хранением фото автомобилей"""
    
    def __init__(self):
        self.use_cloudinary = bool(os.getenv('CLOUDINARY_API_KEY'))
        
        if self.use_cloudinary:
            try:
                import cloudinary
                import cloudinary.uploader
                import cloudinary.api
                
                cloudinary.config(
                    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
                    api_key=os.getenv('CLOUDINARY_API_KEY'),
                    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
                    secure=True
                )
                self.cloudinary = cloudinary
                logger.info("✅ Cloudinary настроен")
            except ImportError:
                logger.error("❌ Cloudinary не установлен. Используйте: pip install cloudinary")
                self.use_cloudinary = False
            except Exception as e:
                logger.error(f"❌ Ошибка настройки Cloudinary: {e}")
                self.use_cloudinary = False
        
        # Локальная директория для загрузки
        if os.getenv("RENDER"):
            self.upload_dir = Path("/opt/render/project/src/static/uploads/cars")
        else:
            self.upload_dir = Path("static/uploads/cars")
        
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def save_photo(self, temp_file_path: str, car_id: int, photo_index: int) -> str:
        """
        Сохраняет фото и возвращает URL
        
        Args:
            temp_file_path: путь к временному файлу
            car_id: ID автомобиля
            photo_index: индекс фото (0, 1, 2...)
        
        Returns:
            URL фото (Cloudinary или локальный)
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_filename = Path(temp_file_path).name
        filename_base = f"car_{car_id}_{timestamp}_{photo_index}"
        
        if self.use_cloudinary:
            return self._save_to_cloudinary(temp_file_path, car_id, filename_base)
        else:
            return self._save_locally(temp_file_path, car_id, filename_base, original_filename)
    
    def _save_to_cloudinary(self, file_path: str, car_id: int, filename_base: str) -> str:
        """Сохраняет фото в Cloudinary"""
        try:
            # ✅ public_id сразу с нужной папкой
            public_id = f"avtorend/car_{car_id}/{filename_base}"

            # ✅ НЕ передаем folder, иначе получится двойная папка
            result = self.cloudinary.uploader.upload(
                file_path,
                public_id=public_id,
                overwrite=False,
                resource_type="image",
            )

            # ✅ Берем РЕАЛЬНЫЙ public_id из ответа Cloudinary
            real_public_id = result["public_id"]

            optimized_url = self.cloudinary.CloudinaryImage(real_public_id).build_url(
                width=800,
                height=600,
                crop="fill",
                gravity="auto",
                quality="auto",
                fetch_format="webp",
                secure=True
            )

            logger.info(f"✅ Фото загружено в Cloudinary: {real_public_id}")
            return optimized_url

        except Exception as e:
            logger.error(f"❌ Ошибка загрузки в Cloudinary: {e}")
            return self._save_locally(file_path, car_id, filename_base, "cloudinary_fallback.jpg")
    
    def _save_locally(self, file_path: str, car_id: int, filename_base: str, original_name: str) -> str:
        """Сохраняет фото локально (для разработки)"""
        try:
            from PIL import Image
            
            # Создаем имя файла
            ext = Path(original_name).suffix or ".jpg"
            filename = f"{filename_base}{ext}"
            target_path = self.upload_dir / filename
            
            # Оптимизируем и сохраняем
            img = Image.open(file_path)
            
            # Ресайз для веба
            if img.height > 1080 or img.width > 1920:
                img.thumbnail((1920, 1080))
            
            # Конвертируем в RGB если нужно
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else img)
                img = background
            
            img.save(target_path, "JPEG", quality=85, optimize=True)
            
            # Возвращаем веб-путь
            web_path = f"/static/uploads/cars/{filename}"
            logger.info(f"✅ Фото сохранено локально: {target_path}")
            return web_path
            
        except Exception as e:
            logger.error(f"❌ Ошибка локального сохранения: {e}")
            # Возвращаем placeholder
            return "/static/uploads/cars/placeholder.jpg"
    
    def delete_photo(self, photo_url: str) -> bool:
        """Удаляет фото по URL"""
        if self.use_cloudinary and "res.cloudinary.com" in photo_url:
            try:
                # ✅ Cloudinary URL часто содержит .../upload/<transforms>/v1/<public_id>[.<ext>]
                if "/v1/" not in photo_url:
                    logger.warning(f"⚠️ Не удалось распарсить Cloudinary URL (нет /v1/): {photo_url}")
                    return False

                public_id = photo_url.split("/v1/", 1)[1]
                public_id = public_id.split("?", 1)[0]          # убрать querystring
                public_id = public_id.rsplit(".", 1)[0]         # убрать расширение, если оно есть

                result = self.cloudinary.uploader.destroy(public_id, invalidate=True)

                # Cloudinary может вернуть 'ok' или 'not found' — оба варианта считаем успешным удалением
                status = result.get("result")
                if status in ("ok", "not found"):
                    return True

                logger.warning(f"⚠️ Cloudinary destroy unexpected result: {result}")
                return False

            except Exception as e:
                logger.error(f"❌ Ошибка удаления из Cloudinary: {e}")
                # ✅ НЕ валим удаление машины из-за фотки
                return False

        # Локальное удаление
        if photo_url.startswith("/static/"):
            try:
                file_path = Path(photo_url.lstrip("/"))
                if file_path.exists():
                    file_path.unlink()
                return True
            except Exception as e:
                logger.error(f"❌ Ошибка локального удаления фото: {e}")
                return False

        return False
    
    def delete_all_car_photos(self, car_id: int) -> bool:
        """Удаляет все фото автомобиля. Best-effort: не должен валить удаление машины."""
        if self.use_cloudinary:
            try:
                result = self.cloudinary.api.delete_resources_by_prefix(f"avtorend/car_{car_id}/")
                logger.info(f"🧹 Cloudinary delete_by_prefix result: {result}")
                return True  # даже если deleted пустой — это не ошибка
            except Exception as e:
                logger.error(f"❌ Ошибка удаления фото автомобиля (Cloudinary): {e}")
                return False

        # локально
        try:
            pattern = f"car_{car_id}_*"
            for file_path in self.upload_dir.glob(pattern):
                try:
                    file_path.unlink()
                except Exception:
                    pass
            return True
        except Exception as e:
            logger.error(f"❌ Ошибка локального удаления фото: {e}")
            return False

# Синглтон экземпляр
photo_storage = CarPhotoStorage()
