#!/bin/bash

# Ім'я твого джерельного зображення
ICON_SRC="icon.png"

# Перевір, чи існує вхідний файл
if [ ! -f "$ICON_SRC" ]; then
  echo "❌ Файл $ICON_SRC не знайдено!"
  exit 1
fi

# Створюємо вихідну директорію
mkdir -p buildResources/icons

# Масив розмірів іконок
for size in 16 32 48 64 128 256 512; do
  echo "🛠 Створюю іконку ${size}x${size}..."
  magick "$ICON_SRC" -resize ${size}x${size} "buildResources/icons/${size}x${size}.png"
done

echo "✅ Готово! Іконки збережено в buildResources/icons/"
#!/bin/bash

# Ім'я твого джерельного зображення
ICON_SRC="icon.png"

# Перевір, чи існує вхідний файл
if [ ! -f "$ICON_SRC" ]; then
  echo "❌ Файл $ICON_SRC не знайдено!"
  exit 1
fi

# Створюємо вихідну директорію
mkdir -p buildResources/icons

# Масив розмірів іконок
for size in 16 32 48 64 128 256 512; do
  echo "🛠 Створюю іконку ${size}x${size}..."
  magick "$ICON_SRC" -resize ${size}x${size} "buildResources/icons/${size}x${size}.png"
done

echo "✅ Готово! Іконки збережено в buildResources/icons/"

