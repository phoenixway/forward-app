#!/bin/bash

# --- Налаштування ---
APP_NAME="ForwardApp"
APPIMAGE_NAME="ForwardApp-1.0.0.AppImage"
# ВАЖЛИВО: Вкажіть ПОВНИЙ АБСОЛЮТНИЙ шлях до вашого AppImage
APPIMAGE_PATH="$HOME/studio/public/forward-app/release_builds/${APPIMAGE_NAME}" # Приклад: в ~/Applications

# --- Налаштування ІКОНОК ---
# Вкажіть ПОВНИЙ АБСОЛЮТНИЙ шлях до каталогу, де лежать ваші іконки
ICONS_SOURCE_DIR="/home/roman/studio/public/forward-app/buildResources/icons" # <--- ВАШ ШЛЯХ

# Назва іконки, яка буде використовуватися в .desktop файлі (без розширення)
# Це буде ім'я файлів іконок в системних каталогах (наприклад, forwardapp.png)
DESKTOP_ICON_NAME="${APP_NAME,,}" # Наприклад "forwardapp"

URL_SCHEME="forwardapp"
DESKTOP_FILE_NAME="${APP_NAME,,}-${URL_SCHEME}-handler.desktop"
USER_APPLICATIONS_DIR="$HOME/.local/share/applications"
USER_ICONS_DIR_BASE="$HOME/.local/share/icons" # Базовий каталог для іконок

# --- Перевірки ---
if [ ! -f "$APPIMAGE_PATH" ]; then
    echo "Помилка: Файл AppImage не знайдено за шляхом: $APPIMAGE_PATH"
    exit 1
fi
if [ ! -x "$APPIMAGE_PATH" ]; then
    chmod +x "$APPIMAGE_PATH" || { echo "Помилка: Не вдалося зробити AppImage виконуваним."; exit 1; }
fi
if [ ! -d "$ICONS_SOURCE_DIR" ]; then
    echo "Помилка: Каталог з іконками не знайдено: $ICONS_SOURCE_DIR"
    # Якщо іконки не критичні, можна продовжити без них, але краще виправити шлях
    # exit 1
fi

# --- Створення каталогів, якщо їх немає ---
mkdir -p "$USER_APPLICATIONS_DIR"

# --- Обробка та копіювання іконок ---
ICON_INSTALL_SUCCESSFUL=false
if [ -d "$ICONS_SOURCE_DIR" ]; then
    echo "Обробка іконок з каталогу: $ICONS_SOURCE_DIR"

    # Перебираємо всі .png файли в каталозі іконок
    for icon_file_path in "$ICONS_SOURCE_DIR"/*.png; do
        if [ -f "$icon_file_path" ]; then
            icon_filename=$(basename "$icon_file_path")
            # Витягуємо розмір з імені файлу (наприклад, 128x128.png -> 128x128)
            size_part=$(echo "$icon_filename" | grep -oE '^[0-9]+x[0-9]+') # Або інший спосіб, якщо формат імені інший

            if [ -n "$size_part" ]; then
                target_icon_subdir="hicolor/${size_part}/apps"
                target_icon_install_dir="$USER_ICONS_DIR_BASE/$target_icon_subdir"
                mkdir -p "$target_icon_install_dir"

                # Копіюємо іконку під стандартним іменем (DESKTOP_ICON_NAME.png)
                if cp "$icon_file_path" "$target_icon_install_dir/${DESKTOP_ICON_NAME}.png"; then
                    echo "Іконку ${icon_filename} скопійовано в ${target_icon_install_dir}/${DESKTOP_ICON_NAME}.png"
                    ICON_INSTALL_SUCCESSFUL=true
                else
                    echo "Помилка: Не вдалося скопіювати іконку ${icon_filename} до ${target_icon_install_dir}/${DESKTOP_ICON_NAME}.png"
                fi
            else
                echo "Не вдалося визначити розмір для іконки: ${icon_filename}. Пропускаємо."
            fi
        fi
    done

    # Можна також додати обробку SVG іконок, якщо вони є (копіювати в hicolor/scalable/apps)
    # for svg_icon_file_path in "$ICONS_SOURCE_DIR"/*.svg; do
    #    if [ -f "$svg_icon_file_path" ]; then
    #        target_icon_subdir="hicolor/scalable/apps"
    #        target_icon_install_dir="$USER_ICONS_DIR_BASE/$target_icon_subdir"
    #        mkdir -p "$target_icon_install_dir"
    #        if cp "$svg_icon_file_path" "$target_icon_install_dir/${DESKTOP_ICON_NAME}.svg"; then
    #            echo "SVG іконку $(basename "$svg_icon_file_path") скопійовано в ${target_icon_install_dir}/${DESKTOP_ICON_NAME}.svg"
    #            ICON_INSTALL_SUCCESSFUL=true # SVG теж вважається успішною установкою
    #        else
    #            echo "Помилка копіювання SVG іконки $(basename "$svg_icon_file_path")"
    #        fi
    #    fi
    # done

else
    echo "Каталог з іконками $ICONS_SOURCE_DIR не знайдено. Іконки не будуть встановлені."
fi


# --- Створення .desktop файлу ---
# Визначення StartupWMClass (рекомендовано вказати вручну)
STARTUP_WM_CLASS="ForwardApp" # <--- ВКАЖІТЬ ТУТ WM_CLASS ВАШОГО ДОДАТКА

DESKTOP_FILE_CONTENT="[Desktop Entry]
Name=${APP_NAME}
Comment=Запускає додаток ${APP_NAME}
Exec=${APPIMAGE_PATH} %U
Terminal=false
Type=Application
Categories=Utility;Application;
MimeType=x-scheme-handler/${URL_SCHEME};
StartupNotify=true
"
if [ "$ICON_INSTALL_SUCCESSFUL" = true ] || [ -n "$DESKTOP_ICON_NAME" ]; then # Додаємо іконку, якщо була успішна установка АБО просто є ім'я
    DESKTOP_FILE_CONTENT="${DESKTOP_FILE_CONTENT}Icon=${DESKTOP_ICON_NAME}
"
fi
if [ -n "$STARTUP_WM_CLASS" ]; then
    DESKTOP_FILE_CONTENT="${DESKTOP_FILE_CONTENT}StartupWMClass=${STARTUP_WM_CLASS}
"
fi

# Запис .desktop файлу
echo "Створення .desktop файлу: $USER_APPLICATIONS_DIR/$DESKTOP_FILE_NAME"
echo -e "${DESKTOP_FILE_CONTENT}" > "$USER_APPLICATIONS_DIR/$DESKTOP_FILE_NAME"
chmod +x "$USER_APPLICATIONS_DIR/$DESKTOP_FILE_NAME"

echo ".desktop файл створено."

# --- Оновлення бази даних MIME та меню ---
echo "Оновлення бази даних MIME та меню для поточного користувача..."
update-desktop-database -q "$USER_APPLICATIONS_DIR"

if [ "$ICON_INSTALL_SUCCESSFUL" = true ]; then
    echo "Спроба оновити кеш іконок..."
    # Оновлення кешу іконок для теми hicolor (найбільш ймовірно)
    if [ -d "$USER_ICONS_DIR_BASE/hicolor" ]; then
        gtk-update-icon-cache -f -q "$USER_ICONS_DIR_BASE/hicolor" || echo "gtk-update-icon-cache не вдалося, але це може бути не критично."
    fi
    # Можна спробувати оновити для всіх тем користувача, але це може бути надлишково
    # for theme_dir in "$USER_ICONS_DIR_BASE"/*/; do
    #     if [ -f "$theme_dir/index.theme" ]; then
    #         # echo "Оновлення кешу іконок для теми: $(basename "$theme_dir")"
    #         gtk-update-icon-cache -f -q "$theme_dir" || true
    #     fi
    # done
fi

echo "--- Завершено ---"
echo "Додаток '${APP_NAME}' (AppImage) налаштовано для локального користувача."
echo "URL-схема '${URL_SCHEME}://' тепер має оброблятися цим AppImage."
echo "Ви можете знайти ярлик в меню додатків (може знадобитися деякий час або перезапуск)."
echo "Щоб перевірити, виконайте: xdg-open \"${URL_SCHEME}://test\""

exit 0
