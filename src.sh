#!/bin/bash

# Переконайтеся, що ви знаходитесь у директорії, де fpm має доступ до linux-unpacked
# Наприклад, можна перейти в /home/roman/studio/public/forward-app/release_builds/
# cd /home/roman/studio/public/forward-app/release_builds/

# Або використовуйте абсолютні шляхи, як нижче

# Шлях до fpm
FPM_PATH="/home/roman/.cache/electron-builder/fpm/fpm-1.9.3-2.3.1-linux-x86_64/fpm"

# Директорія з розпакованим додатком
SOURCE_DIR="/home/roman/studio/public/forward-app/release_builds/linux-unpacked"

# Назва RPM пакету та версія (мінімальні обов'язкові)
PACKAGE_NAME="forward-app-test" # Змінив назву, щоб не конфліктувати з попередніми спробами
PACKAGE_VERSION="1.0.0"

# Куди буде збережено RPM
OUTPUT_RPM="/home/roman/studio/public/forward-app/release_builds/${PACKAGE_NAME}-${PACKAGE_VERSION}.x86_64.rpm"

# Команда
$FPM_PATH \
  -s dir \
  -t rpm \
  -n "$PACKAGE_NAME" \
  -v "$PACKAGE_VERSION" \
  --architecture amd64 \
  --rpm-os linux \
  --prefix /opt/ForwardApp \
  --package "$OUTPUT_RPM" \
  "$SOURCE_DIR/"=/
