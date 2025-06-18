#!/bin/bash
set -e # Зупинити при першій помилці, якщо не оброблено інакше

# --- Налаштування ---
# Головний ідентифікатор для вашого застосунку.
# Використовується для пошуку файлів, назви RPM пакета тощо.
# МАЄ БУТИ ДОСИТЬ УНІКАЛЬНИМ, ЩОБ НЕ ВИДАЛИТИ ЗАЙВОГО!
APP_NAME_CANONICAL="forward-app" # Наприклад, "forward-app" - використовується для RPM, каталогів
APP_NAME_DISPLAY="ForwardApp"    # Наприклад, "ForwardApp" - може використовуватися в назвах .desktop файлів

# Назва RPM пакета (зазвичай співпадає з APP_NAME_CANONICAL)
RPM_PACKAGE_NAME="${APP_NAME_CANONICAL}"

# Каталог встановлення RPM (якщо встановлювали в /opt)
RPM_INSTALL_DIR="/opt/${APP_NAME_DISPLAY}" # Або /opt/${APP_NAME_CANONICAL}, залежно від .spec

# Шляхи до AppImage (якщо ви знаєте, де він зазвичай зберігається користувачами)
# Це опціонально, скрипт може запитати шлях або ви можете закоментувати.
DEFAULT_APPIMAGE_DIR_USER="$HOME/Applications"
APPIMAGE_NAME_PATTERN="${APP_NAME_DISPLAY}-*.AppImage" # Шаблон для пошуку AppImage

# Каталог конфігурації/даних користувача для Electron-додатків
# Зазвичай ~/.config/НазваДодатку (productName з package.json)
USER_CONFIG_DIR="$HOME/.config/${APP_NAME_DISPLAY}"
# Або, якщо використовується APP_NAME_CANONICAL для каталогу конфігурації:
# USER_CONFIG_DIR="$HOME/.config/${APP_NAME_CANONICAL}"

# --- Системні та користувацькі шляхи ---
SYSTEM_DESKTOP_DIR="/usr/share/applications"
USER_DESKTOP_DIR="$HOME/.local/share/applications"
SYSTEM_ICONS_BASE_DIR="/usr/share/icons"
USER_ICONS_BASE_DIR="$HOME/.local/share/icons"
SYSTEM_MIME_DIR="/usr/share/mime"
USER_MIME_DIR="$HOME/.local/share/mime"

# --- Функції ---
ask_confirmation() {
    local message="$1"
    read -r -p "${message} (y/N): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Скасовано."
        exit 1
    fi
}

remove_files_with_sudo_check() {
    local pattern="$1"
    local dir="$2"
    local use_sudo="$3"
    local cmd_prefix=""

    echo "Пошук файлів за шаблоном '${pattern}' в каталозі '${dir}'..."
    # Спочатку показуємо, що буде видалено
    if [ "$use_sudo" = true ]; then
        cmd_prefix="sudo "
        # shellcheck disable=SC2086
        ${cmd_prefix}find "${dir}" -name "${pattern}" -print -type f
    else
        # shellcheck disable=SC2086
        find "${dir}" -name "${pattern}" -print -type f
    fi

    ask_confirmation "Видалити знайдені вище файли?"

    if [ "$use_sudo" = true ]; then
        # shellcheck disable=SC2086
        ${cmd_prefix}find "${dir}" -name "${pattern}" -type f -delete
    else
        # shellcheck disable=SC2086
        find "${dir}" -name "${pattern}" -type f -delete
    fi
    echo "Файли за шаблоном '${pattern}' в '${dir}' видалено (якщо були знайдені та підтверджено)."
}

remove_directory_with_sudo_check() {
    local dir_to_remove="$1"
    local use_sudo="$2"
    local cmd_prefix=""

    if [ -d "$dir_to_remove" ]; then
        echo "Каталог для видалення: ${dir_to_remove}"
        ask_confirmation "Видалити цей каталог та весь його вміст?"
        if [ "$use_sudo" = true ]; then
            cmd_prefix="sudo "
        fi
        ${cmd_prefix}rm -rf "${dir_to_remove}"
        echo "Каталог ${dir_to_remove} видалено."
    else
        echo "Каталог ${dir_to_remove} не знайдено."
    fi
}


echo "===== Скрипт повного видалення для ${APP_NAME_DISPLAY} ====="
echo "УВАГА: Цей скрипт спробує видалити всі файли та налаштування, пов'язані з ${APP_NAME_DISPLAY}."
echo "Будь ласка, уважно перевірте налаштування на початку скрипта!"
echo "Ідентифікатор для пошуку: '${APP_NAME_CANONICAL}' та '${APP_NAME_DISPLAY}'"
echo "Каталог конфігурації користувача: '${USER_CONFIG_DIR}'"
if [ -n "$RPM_INSTALL_DIR" ] && [ -d "$RPM_INSTALL_DIR" ]; then
    echo "Каталог встановлення RPM (якщо існує): '${RPM_INSTALL_DIR}'"
fi
ask_confirmation "Продовжити з видаленням?"


# 1. Видалення RPM пакета
echo -e "\n--- Крок 1: Видалення RPM пакета ---"
if rpm -q "$RPM_PACKAGE_NAME" &> /dev/null; then
    echo "Знайдено встановлений RPM пакет '${RPM_PACKAGE_NAME}'."
    ask_confirmation "Видалити RPM пакет '${RPM_PACKAGE_NAME}' (потрібне sudo)?"
    sudo rpm -e "$RPM_PACKAGE_NAME" || echo "Попередження: Не вдалося видалити RPM пакет. Можливо, він вже був видалений або виникла помилка."
else
    echo "RPM пакет '${RPM_PACKAGE_NAME}' не встановлено."
fi


# 2. Видалення каталогу встановлення RPM (якщо він залишився або був встановлений не через RPM)
echo -e "\n--- Крок 2: Видалення каталогу встановлення застосунку (зазвичай з /opt) ---"
if [ -n "$RPM_INSTALL_DIR" ]; then # Перевірка, чи змінна не порожня
    remove_directory_with_sudo_check "$RPM_INSTALL_DIR" true
else
    echo "Шлях до каталогу встановлення RPM (RPM_INSTALL_DIR) не вказано, пропускаємо."
fi


# 3. Видалення .desktop файлів
echo -e "\n--- Крок 3: Видалення .desktop файлів ---"
# Шукаємо файли, що містять APP_NAME_CANONICAL в назві
remove_files_with_sudo_check "*${APP_NAME_CANONICAL}*.desktop" "$SYSTEM_DESKTOP_DIR" true
remove_files_with_sudo_check "*${APP_NAME_CANONICAL}*.desktop" "$USER_DESKTOP_DIR" false
remove_files_with_sudo_check "forwardapp-forwardapp-handler.desktop" "$USER_DESKTOP_DIR" false

# Також можна шукати за APP_NAME_DISPLAY, якщо назви файлів можуть відрізнятися
# remove_files_with_sudo_check "*${APP_NAME_DISPLAY}*.desktop" "$SYSTEM_DESKTOP_DIR" true
# remove_files_with_sudo_check "*${APP_NAME_DISPLAY}*.desktop" "$USER_DESKTOP_DIR" false



# 4. Видалення іконок
echo -e "\n--- Крок 4: Видалення іконок ---"
# Іконки зазвичай називаються як APP_NAME_CANONICAL.png/svg у відповідних підкаталогах hicolor
# Системні іконки
echo "Пошук та видалення системних іконок для '${APP_NAME_CANONICAL}' (потрібне sudo)..."
sudo find "$SYSTEM_ICONS_BASE_DIR/hicolor" -name "${APP_NAME_CANONICAL}.png" -print -delete || true # Додано || true щоб не падати якщо нічого не знайдено
sudo find "$SYSTEM_ICONS_BASE_DIR/hicolor" -name "${APP_NAME_CANONICAL}.svg" -print -delete || true # Додано || true
# Користувацькі іконки
echo "Пошук та видалення користувацьких іконок для '${APP_NAME_CANONICAL}'..."
find "$USER_ICONS_BASE_DIR/hicolor" -name "${APP_NAME_CANONICAL}.png" -print -delete || true # Додано || true
find "$USER_ICONS_BASE_DIR/hicolor" -name "${APP_NAME_CANONICAL}.svg" -print -delete || true # Додано || true


# 5. Видалення каталогу конфігурації/даних користувача
echo -e "\n--- Крок 5: Видалення каталогу конфігурації/даних користувача ---"
# echo "Skipping.." # Розкоментовано для реального видалення
# remove_directory_with_sudo_check "$USER_CONFIG_DIR" false


# 6. Видалення AppImage файлів (опціонально, з підтвердженням)
echo -e "\n--- Крок 6: Видалення AppImage файлів (опціонально) ---"
echo "Скрипт може спробувати знайти AppImage файли за шаблоном '${APPIMAGE_NAME_PATTERN}' в '${DEFAULT_APPIMAGE_DIR_USER}'."

read -r -p "Спробувати знайти та запропонувати видалення AppImage файлів? (y/N): " find_appimages_response
if [[ "$find_appimages_response" =~ ^[Yy]$ ]]; then
    if [ -d "$DEFAULT_APPIMAGE_DIR_USER" ]; then # <--- ДОДАНО ПЕРЕВІРКУ
        echo "Пошук AppImage файлів в '${DEFAULT_APPIMAGE_DIR_USER}'..."
        # shellcheck disable=SC2038
        find "$DEFAULT_APPIMAGE_DIR_USER" -name "$APPIMAGE_NAME_PATTERN" -print0 | xargs -0 -r ls -lH

        # shellcheck disable=SC2038
        found_appimages=$(find "$DEFAULT_APPIMAGE_DIR_USER" -name "$APPIMAGE_NAME_PATTERN" -print)
        if [ -n "$found_appimages" ]; then
            echo "Знайдено наступні AppImage файли:"
            echo "$found_appimages"
            ask_confirmation "Видалити ці знайдені AppImage файли?"
            # shellcheck disable=SC2038
            find "$DEFAULT_APPIMAGE_DIR_USER" -name "$APPIMAGE_NAME_PATTERN" -delete
            echo "AppImage файли видалено."
        else
            echo "AppImage файли за шаблоном не знайдено в ${DEFAULT_APPIMAGE_DIR_USER}."
        fi
    else
        echo "Каталог для пошуку AppImage ('${DEFAULT_APPIMAGE_DIR_USER}') не знайдено. Пропускаємо пошук AppImage." # <--- ПОВІДОМЛЕННЯ
    fi
fi

# 7. Оновлення системних баз даних
echo -e "\n--- Крок 7: Оновлення системних баз даних ---"
echo "Оновлення баз даних desktop та MIME (може знадобитися sudo)..."
if command -v update-desktop-database &> /dev/null; then
    sudo update-desktop-database "$SYSTEM_DESKTOP_DIR" &> /dev/null || echo "Попередження: sudo update-desktop-database для системи не вдалося або не було змін."
    update-desktop-database "$USER_DESKTOP_DIR" &> /dev/null || echo "Попередження: update-desktop-database для користувача не вдалося або не було змін."
else
    echo "Команда update-desktop-database не знайдена."
fi

if command -v gtk-update-icon-cache &> /dev/null; then
    # Оновлюємо кеш для hicolor, де зазвичай лежать іконки додатків
    if [ -d "$SYSTEM_ICONS_BASE_DIR/hicolor" ]; then
        sudo gtk-update-icon-cache -f -q "$SYSTEM_ICONS_BASE_DIR/hicolor" || echo "Попередження: sudo gtk-update-icon-cache для системи не вдалося."
    fi
    if [ -d "$USER_ICONS_BASE_DIR/hicolor" ]; then
        gtk-update-icon-cache -f -q "$USER_ICONS_BASE_DIR/hicolor" || echo "Попередження: gtk-update-icon-cache для користувача не вдалося."
    fi
else
    echo "Команда gtk-update-icon-cache не знайдена."
fi

if command -v update-mime-database &> /dev/null; then
    sudo update-mime-database "$SYSTEM_MIME_DIR" &> /dev/null || echo "Попередження: sudo update-mime-database для системи не вдалося або не було змін."
    update-mime-database "$USER_MIME_DIR" &> /dev/null || echo "Попередження: update-mime-database для користувача не вдалося або не було змін."
else
    echo "Команда update-mime-database не знайдена."
fi

echo -e "\n===== Повне видалення ${APP_NAME_DISPLAY} завершено ====="
echo "Можливо, знадобиться перезавантаження сесії або системи, щоб всі зміни вступили в силу."

exit 0
