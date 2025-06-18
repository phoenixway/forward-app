#!/bin/bash

# --- Налаштування ---
APP_NAME="forward-app"
APP_VERSION="1.0.0" # Візьміть з package.json або вкажіть вручну
# Важливо: Замініть на реальну WM_CLASS вашого додатка!
# Дізнатися: запустіть ваш додаток, у терміналі `xprop WM_CLASS` і клікніть по вікну.
# Використовуйте друге значення з виводу.
APP_WM_CLASS="ForwardApp" # <--- ЗАМІНІТЬ ЦЕ ЗНАЧЕННЯ!

PROJECT_ROOT_DIR="$(pwd)/" # Припускаємо, що скрипт запускається з кореня проекту
RPMBUILD_SOURCES_DIR="$HOME/rpmbuild/SOURCES"
RPMBUILD_SPECS_DIR="$HOME/rpmbuild/SPECS"

SOURCE_ARCHIVE_BASE_DIR="${APP_NAME}-${APP_VERSION}"
SOURCE_ARCHIVE_NAME="${SOURCE_ARCHIVE_BASE_DIR}.tar.gz"

# Шляхи до ресурсів у вашому проекті
LINUX_UNPACKED_DIR="${PROJECT_ROOT_DIR}/release_builds/linux-unpacked"
ICONS_SOURCE_DIR_PROJECT="${PROJECT_ROOT_DIR}/buildResources/icons"

# --- Перевірки ---
if [ ! -d "$LINUX_UNPACKED_DIR" ]; then
    echo "Помилка: Каталог '${LINUX_UNPACKED_DIR}' не знайдено."
    echo "Будь ласка, переконайтеся, що ви зібрали додаток за допомогою electron-builder (linux target)."
    exit 1
fi

if [ ! -d "$ICONS_SOURCE_DIR_PROJECT" ]; then
    echo "Помилка: Каталог з іконками '${ICONS_SOURCE_DIR_PROJECT}' не знайдено."
    exit 1
fi

if [ "$APP_WM_CLASS" == "ForwardApp-WMClass" ]; then
    echo "ПОПЕРЕДЖЕННЯ: Змінна APP_WM_CLASS має значення за замовчуванням 'ForwardApp-WMClass'."
    echo "Будь ласка, відредагуйте скрипт і встановіть правильне значення WM_CLASS для вашого додатка."
    read -p "Продовжити з значенням за замовчуванням? (y/N): " जवाब
    if [[ ! "$jawab" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# --- Створення тимчасового каталогу для архіву ---
TEMP_BUILD_DIR=$(mktemp -d)
echo "Тимчасовий каталог для збірки архіву: ${TEMP_BUILD_DIR}"
TARGET_CONTENT_DIR="${TEMP_BUILD_DIR}/${SOURCE_ARCHIVE_BASE_DIR}"
mkdir -p "$TARGET_CONTENT_DIR"

# --- Копіювання файлів додатка ---
echo "Копіювання файлів з '${LINUX_UNPACKED_DIR}'..."
cp -r "${LINUX_UNPACKED_DIR}" "${TARGET_CONTENT_DIR}/linux-unpacked"

# --- Копіювання іконок ---
echo "Копіювання іконок з '${ICONS_SOURCE_DIR_PROJECT}'..."
mkdir -p "${TARGET_CONTENT_DIR}/buildResources/icons"
cp -r "${ICONS_SOURCE_DIR_PROJECT}"/* "${TARGET_CONTENT_DIR}/buildResources/icons/"

# --- Створення базового .desktop файлу ---
# Цей файл буде модифіковано в .spec файлі
DESKTOP_FILE_CONTENT="[Desktop Entry]
Name=${APP_NAME^}
Comment=Advanced goal management application
Exec=${APP_NAME} %U
Icon=${APP_NAME}
Terminal=false
Type=Application
Categories=Utility;Office;
MimeType=x-scheme-handler/${APP_NAME};"

echo "Створення файлу ${APP_NAME^}.desktop..." # Використовуємо APP_NAME з великої літери для назви файлу
echo -e "${DESKTOP_FILE_CONTENT}" > "${TARGET_CONTENT_DIR}/${APP_NAME^}.desktop"


# --- Створення .spec файлу ---
# Використовуємо APP_NAME та APP_VERSION зі скрипта
SPEC_FILE_CONTENT=$(cat <<EOF
Name:           ${APP_NAME}
Version:        ${APP_VERSION}
Release:        1%{?dist}
Summary:        Advanced goal management application
License:        MIT
URL:            https://github.com/phoenixway/${APP_NAME}
BuildArch:      x86_64
%define debug_package %{nil}
%define _debugsource_template %{nil}


Source0:        %{name}-%{version}.tar.gz

AutoReqProv:    no

Requires:       gtk3 >= 3.20
Requires:       libnotify
Requires:       nss >= 3.28
Requires:       libXScrnSaver
Requires:       libXtst
Requires:       xdg-utils
Requires:       at-spi2-core
Requires:       libuuid
Requires:       alsa-lib
Requires:       cups-libs
Requires:       expat
Requires:       libX11
Requires:       libXcomposite
Requires:       libXdamage
Requires:       libXext
Requires:       libXfixes
Requires:       libXrandr
Requires:       libgbm
Requires:       pango
Requires:       cairo
Requires:       libdrm
Requires:       libxcb
Requires:       libxkbcommon
Requires:       dbus-libs
Requires:       ld-linux-x86-64.so.2()(64bit)
Requires:       ld-linux-x86-64.so.2(GLIBC_2.2.5)(64bit)
Requires:       ld-linux-x86-64.so.2(GLIBC_2.3)(64bit)
Requires:       libatk-1.0.so.0()(64bit)
Requires:       libatk-bridge-2.0.so.0()(64bit)
Requires:       libatspi.so.0()(64bit)
Requires:       libc.so.6()(64bit)
Requires:       libc.so.6(GLIBC_2.10)(64bit)
Requires:       libc.so.6(GLIBC_2.11)(64bit)
Requires:       libc.so.6(GLIBC_2.14)(64bit)
Requires:       libc.so.6(GLIBC_2.15)(64bit)
Requires:       libc.so.6(GLIBC_2.16)(64bit)
Requires:       libc.so.6(GLIBC_2.17)(64bit)
Requires:       libc.so.6(GLIBC_2.2.5)(64bit)
Requires:       libc.so.6(GLIBC_2.3)(64bit)
Requires:       libc.so.6(GLIBC_2.3.2)(64bit)
Requires:       libc.so.6(GLIBC_2.3.3)(64bit)
Requires:       libc.so.6(GLIBC_2.3.4)(64bit)
Requires:       libc.so.6(GLIBC_2.4)(64bit)
Requires:       libc.so.6(GLIBC_2.6)(64bit)
Requires:       libc.so.6(GLIBC_2.7)(64bit)
Requires:       libc.so.6(GLIBC_2.8)(64bit)
Requires:       libc.so.6(GLIBC_2.9)(64bit)
Requires:       libdbus-1.so.3(LIBDBUS_1_3)(64bit)
Requires:       libdl.so.2()(64bit)
Requires:       libdl.so.2(GLIBC_2.2.5)(64bit)
Requires:       libgcc_s.so.1()(64bit)
Requires:       libgcc_s.so.1(GCC_3.0)(64bit)
Requires:       libgio-2.0.so.0()(64bit)
Requires:       libglib-2.0.so.0()(64bit)
Requires:       libgobject-2.0.so.0()(64bit)
Requires:       libm.so.6()(64bit)
Requires:       libm.so.6(GLIBC_2.2.5)(64bit)
Requires:       libnspr4.so()(64bit)
Requires:       libnss3.so(NSS_3.11)(64bit)
Requires:       libnss3.so(NSS_3.12)(64bit)
Requires:       libnss3.so(NSS_3.12.1)(64bit)
Requires:       libnss3.so(NSS_3.13)(64bit)
Requires:       libnss3.so(NSS_3.2)(64bit)
Requires:       libnss3.so(NSS_3.22)(64bit)
Requires:       libnss3.so(NSS_3.3)(64bit)
Requires:       libnss3.so(NSS_3.30)(64bit)
Requires:       libnss3.so(NSS_3.4)(64bit)
Requires:       libnss3.so(NSS_3.5)(64bit)
Requires:       libnss3.so(NSS_3.9.2)(64bit)
Requires:       libnssutil3.so()(64bit)
Requires:       libnssutil3.so(NSSUTIL_3.12.3)(64bit)
Requires:       libpthread.so.0()(64bit)
Requires:       libpthread.so.0(GLIBC_2.12)(64bit)
Requires:       libpthread.so.0(GLIBC_2.2.5)(64bit)
Requires:       libpthread.so.0(GLIBC_2.3.2)(64bit)
Requires:       libpthread.so.0(GLIBC_2.3.3)(64bit)
Requires:       libpthread.so.0(GLIBC_2.3.4)(64bit)
Requires:       libsmime3.so()(64bit)
Requires:       libsmime3.so(NSS_3.10)(64bit)
Requires:       libsmime3.so(NSS_3.2)(64bit)
Requires:       libxkbcommon.so.0(V_0.5.0)(64bit)
Requires:       rtld(GNU_HASH)

Provides:       mimehandler(x-scheme-handler/%{name})
Provides:       application()
Provides:       application(%{name}.desktop)

%description
Advanced goal management application built with Electron.
It helps users to manage their goals and track progress.

%prep
%setup -q

%build
# Prebuilt

%install
rm -rf %{buildroot}

mkdir -p %{buildroot}/opt/%{name}
mkdir -p %{buildroot}%{_datadir}/applications
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/16x16/apps
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/32x32/apps
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/48x48/apps
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/64x64/apps
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/128x128/apps
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/256x256/apps
mkdir -p %{buildroot}%{_datadir}/icons/hicolor/512x512/apps

cp -r %{_builddir}/%{name}-%{version}/linux-unpacked/* %{buildroot}/opt/%{name}/

install -Dm644 %{_builddir}/%{name}-%{version}/${APP_NAME^}.desktop %{buildroot}%{_datadir}/applications/%{name}.desktop

install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/16x16.png   %{buildroot}%{_datadir}/icons/hicolor/16x16/apps/%{name}.png
install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/32x32.png   %{buildroot}%{_datadir}/icons/hicolor/32x32/apps/%{name}.png
install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/48x48.png   %{buildroot}%{_datadir}/icons/hicolor/48x48/apps/%{name}.png
install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/64x64.png   %{buildroot}%{_datadir}/icons/hicolor/64x64/apps/%{name}.png
install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/128x128.png %{buildroot}%{_datadir}/icons/hicolor/128x128/apps/%{name}.png
install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/256x256.png %{buildroot}%{_datadir}/icons/hicolor/256x256/apps/%{name}.png
install -Dm644 %{_builddir}/%{name}-%{version}/buildResources/icons/512x512.png %{buildroot}%{_datadir}/icons/hicolor/512x512/apps/%{name}.png

chmod +x %{buildroot}/opt/%{name}/%{name}

sed -i "s|^Exec=.*|Exec=/opt/%{name}/%{name} %U|" %{buildroot}%{_datadir}/applications/%{name}.desktop
sed -i "s|^Icon=.*|Icon=%{name}|" %{buildroot}%{_datadir}/applications/%{name}.desktop
echo "StartupWMClass=${APP_WM_CLASS}" >> %{buildroot}%{_datadir}/applications/%{name}.desktop


%files
/opt/%{name}/
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/16x16/apps/%{name}.png
%{_datadir}/icons/hicolor/32x32/apps/%{name}.png
%{_datadir}/icons/hicolor/48x48/apps/%{name}.png
%{_datadir}/icons/hicolor/64x64/apps/%{name}.png
%{_datadir}/icons/hicolor/128x128/apps/%{name}.png
%{_datadir}/icons/hicolor/256x256/apps/%{name}.png
%{_datadir}/icons/hicolor/512x512/apps/%{name}.png

%post
update-desktop-database %{_datadir}/applications &> /dev/null || :
gtk-update-icon-cache -q %{_datadir}/icons/hicolor &> /dev/null || :

%postun
if [ \$1 -eq 0 ] ; then
    update-desktop-database %{_datadir}/applications &> /dev/null || :
    gtk-update-icon-cache -q %{_datadir}/icons/hicolor &> /dev/null || :
fi

%changelog
* $(LC_ALL=C date +"%a %b %d %Y") Roman Kozak <cossack.roman@gmail.com> - %{version}-%{release}
- Prepared RPM source archive using script.
EOF
)

SPEC_FILE_PATH="${RPMBUILD_SPECS_DIR}/${APP_NAME}.spec"
echo "Створення файлу ${SPEC_FILE_PATH}..."
mkdir -p "$RPMBUILD_SPECS_DIR"
echo -e "${SPEC_FILE_CONTENT}" > "${SPEC_FILE_PATH}"


# --- Створення архіву .tar.gz ---
echo "Створення архіву ${SOURCE_ARCHIVE_NAME}..."
# Переходимо в тимчасовий каталог, щоб архів мав правильну структуру (без TEMP_BUILD_DIR в шляхах)
(cd "${TEMP_BUILD_DIR}" && tar -czvf "${SOURCE_ARCHIVE_NAME}" "${SOURCE_ARCHIVE_BASE_DIR}")

# --- Копіювання архіву в ~/rpmbuild/SOURCES/ ---
echo "Копіювання архіву ${SOURCE_ARCHIVE_NAME} в ${RPMBUILD_SOURCES_DIR}/"
mkdir -p "$RPMBUILD_SOURCES_DIR"
mv "${TEMP_BUILD_DIR}/${SOURCE_ARCHIVE_NAME}" "${RPMBUILD_SOURCES_DIR}/"

# --- Очищення ---
echo "Очищення тимчасового каталогу ${TEMP_BUILD_DIR}"
rm -rf "${TEMP_BUILD_DIR}"

echo "--- Підготовка завершена ---"
echo "Архів з вихідними файлами: ${RPMBUILD_SOURCES_DIR}/${SOURCE_ARCHIVE_NAME}"
echo ".spec файл: ${RPMBUILD_SPECS_DIR}/${APP_NAME}.spec"
echo ""
echo "Тепер ви можете запустити rpmbuild:"
echo "rpmbuild -ba ${RPMBUILD_SPECS_DIR}/${APP_NAME}.spec"
echo ""
echo "Не забудьте перевірити та виправити APP_WM_CLASS (${APP_WM_CLASS}) та URL в ${SPEC_FILE_PATH}!"
