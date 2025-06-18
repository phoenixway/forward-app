#!/bin/bash
set -e # Зупинити при помилці

# --- КОНФІГУРАЦІЯ ---
APP_EXECUTABLE_PATH_ARG="$1"

# Ключовий ідентифікатор для пошуку файлів, пов'язаних з вашим додатком.
# Це може бути частина назви пакету, назва .desktop файлу тощо.
# БУДЬТЕ ДУЖЕ ОБЕРЕЖНІ З ЦИМ ЗНАЧЕННЯМ!
APP_NAME_IDENTIFIER="forward-app" # Наприклад, "forward-app" або "forwardapp"

# Назва .desktop файлу (без розширення .desktop) для цього ТЕСТОВОГО запуску.
TEST_DESKTOP_FILE_BASENAME="forward-app-test-handler"

APP_DISPLAY_NAME="ForwardApp (Test Protocol)"
APP_COMMENT="Test instance for ForwardApp URL handling"
APP_ICON_NAME="application-x-executable"
URL_SCHEME="forwardapp"
APP_WM_CLASS="ForwardApp" # Перевірте це значення!

TEST_URL="${URL_SCHEME}://open-list?id=3ae8ad55-2b13-4ad0-9263-e9839c85b0d4"
# --- КІНЕЦЬ КОНФІГУРАЦІЇ ---

if [ -z "$APP_EXECUTABLE_PATH_ARG" ]; then
    echo "Usage: $0 <path_to_app_executable_or_appimage>"
    exit 1
fi
if [ ! -f "$APP_EXECUTABLE_PATH_ARG" ] && [ ! -x "$APP_EXECUTABLE_PATH_ARG" ]; then
    echo "Error: Application executable/AppImage not found or not executable at '$APP_EXECUTABLE_PATH_ARG'"
    exit 1
fi

APP_EXECUTABLE_ABS_PATH=$(realpath "$APP_EXECUTABLE_PATH_ARG")

# Системні та користувацькі шляхи
SYSTEM_DESKTOP_DIR="/usr/share/applications"
USER_DESKTOP_DIR="$HOME/.local/share/applications"
SYSTEM_MIME_DIR="/usr/share/mime"
USER_MIME_DIR="$HOME/.local/share/mime"
# Можна додати шляхи до директорій іконок, якщо потрібно їх чистити
# SYSTEM_ICONS_DIR="/usr/share/icons"
# USER_ICONS_DIR="$HOME/.local/share/icons"

# Шлях до тестового .desktop файлу, який ми створимо
TEST_DESKTOP_FILE_PATH="$SYSTEM_DESKTOP_DIR/${TEST_DESKTOP_FILE_BASENAME}.desktop"


full_cleanup() {
    echo ""
    echo "=== Performing FULL Cleanup (System and User) ==="

    # 1. Видалення RPM пакета, якщо встановлено (якщо він має назву, що містить APP_NAME_IDENTIFIER)
    # Потрібно знати точну назву пакета. Припустимо, вона співпадає з APP_NAME_IDENTIFIER
    # Це може бути небезпечно, якщо APP_NAME_IDENTIFIER занадто загальний.
    echo "Attempting to remove RPM package (if name matches '$APP_NAME_IDENTIFIER')..."
    if rpm -q "$APP_NAME_IDENTIFIER" &> /dev/null; then
        echo "Found RPM package '$APP_NAME_IDENTIFIER'. Removing with sudo..."
        sudo rpm -e "$APP_NAME_IDENTIFIER" || echo "Warning: Failed to remove RPM package '$APP_NAME_IDENTIFIER', or it was already removed."
    else
        echo "RPM package '$APP_NAME_IDENTIFIER' not found by exact name."
    fi
    # Можна додати пошук пакетів за шаблоном, але це ще небезпечніше.

    # 2. Видалення .desktop файлів
    echo "Removing .desktop files matching '*${APP_NAME_IDENTIFIER}*' (system and user)..."
    # ПОПЕРЕДЖЕННЯ: Перевірте ці команди з -print замість -delete спочатку!
    sudo find "$SYSTEM_DESKTOP_DIR" -name "*${APP_NAME_IDENTIFIER}*.desktop" -print -delete
    find "$USER_DESKTOP_DIR" -name "*${APP_NAME_IDENTIFIER}*.desktop" -print -delete
    # Також видаляємо наш тестовий файл, якщо він був створений під іншим ім'ям (малоймовірно з поточним скриптом)
    if [ -f "$TEST_DESKTOP_FILE_PATH" ]; then # Це для нашого тестового файлу
        sudo rm -f "$TEST_DESKTOP_FILE_PATH"
    fi

    # 3. Видалення пов'язаних записів з кешу MIME (x-scheme-handler)
    # Це складніше, оскільки вони зберігаються у бінарних файлах кешу.
    # Найпростіший спосіб - оновити бази даних, що має прибрати недійсні записи.
    # Пряме видалення конкретних записів з cache файлів не рекомендується.

    # 4. Оновлення баз даних (після видалення файлів)
    echo "Updating desktop and MIME databases (system and user)..."
    sudo update-desktop-database "$SYSTEM_DESKTOP_DIR" &> /dev/null || echo "Warning: update-desktop-database for system failed or had no changes."
    update-desktop-database "$USER_DESKTOP_DIR" &> /dev/null || echo "Warning: update-desktop-database for user failed or had no changes."

    sudo update-mime-database "$SYSTEM_MIME_DIR" &> /dev/null || echo "Warning: update-mime-database for system failed or had no changes."
    update-mime-database "$USER_MIME_DIR" &> /dev/null || echo "Warning: update-mime-database for user failed or had no changes."

    echo "Full cleanup finished."
}

# Встановлюємо пастку для повного очищення при виході або перериванні
trap full_cleanup EXIT SIGINT SIGTERM

echo "=== Test Environment Setup ==="
echo "Application Executable: $APP_EXECUTABLE_ABS_PATH"
echo "Unique Test Desktop File will be: $TEST_DESKTOP_FILE_PATH"
echo "Identifier for cleanup: '$APP_NAME_IDENTIFIER'"
echo "URL Scheme: $URL_SCHEME"
echo "Test URL: $TEST_URL"
read -p "CAUTION: This script will attempt to remove files and packages matching '${APP_NAME_IDENTIFIER}'. Review the script. Press Enter to continue, or Ctrl+C to abort."


echo ""
echo "--- Step 1: Performing full initial cleanup ---"
full_cleanup # Запускаємо очищення перед тестом

echo ""
echo "--- Step 2: Creating and installing temporary .desktop file for testing ---"
echo "Creating .desktop file content for '${TEST_DESKTOP_FILE_BASENAME}.desktop'..."
DESKTOP_CONTENT="[Desktop Entry]
Name=${APP_DISPLAY_NAME}
Comment=${APP_COMMENT}
Exec=${APP_EXECUTABLE_ABS_PATH} %U
Terminal=false
Type=Application
Icon=${APP_ICON_NAME}
Categories=Utility;Development;
MimeType=x-scheme-handler/${URL_SCHEME};
StartupWMClass=${APP_WM_CLASS}
NoDisplay=true
"

echo "Writing test .desktop file to $TEST_DESKTOP_FILE_PATH (requires sudo)..."
echo "$DESKTOP_CONTENT" | sudo tee "$TEST_DESKTOP_FILE_PATH" > /dev/null
sudo chmod 644 "$TEST_DESKTOP_FILE_PATH"

echo "Updating system desktop database (requires sudo)..."
sudo update-desktop-database "$SYSTEM_DESKTOP_DIR"

echo "Desktop file created and database updated."
echo "Waiting a moment for system to recognize changes..."
sleep 2

echo ""
echo "--- Step 3: Running test with xdg-open ---"
echo "Launching: xdg-open \"$TEST_URL\""
echo "----------------------------------------------------------------------"
echo " WATCH YOUR APPLICATION'S CONSOLE OUTPUT AND BEHAVIOR NOW! "
echo " (Ensure your app is launched from a terminal to see its logs) "
echo "----------------------------------------------------------------------"

xdg-open "$TEST_URL"

echo "Waiting for 10 seconds for the app to process the URL..."
sleep 10

echo ""
echo "--- Step 4: Test finished ---"
echo "Please check your application's state and logs for correctness."
echo "Cleanup will occur automatically on script exit."

exit 0
