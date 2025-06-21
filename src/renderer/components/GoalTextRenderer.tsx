// src/renderer/components/GoalTextRenderer.tsx
import React, { useCallback } from "react";
import { OBSIDIAN_SCHEME_PREFIX } from "../../constants";

interface IconMarkerConfig {
  icon: string;
  markers: string[];
  className?: string;
  isSuffixOnly?: boolean;
}

const ICON_CONFIGS: IconMarkerConfig[] = [
  {
    icon: "❗",
    markers: ["#critical", "! ", "!"],
    className: "text-red-500 mr-1",
    isSuffixOnly: true,
  },
  { icon: "☀️", markers: ["#day", "+ "], className: "text-yellow-500 mr-1" },
  { icon: "🗓️", markers: ["#week", "++ "], className: "text-blue-500 mr-1" },
  {
    icon: "🎯",
    markers: ["#middle-term", "+++ "],
    className: "text-green-500 mr-1",
  },
  {
    icon: "🔭",
    markers: ["#long-term", "~ ", "~"],
    className: "text-purple-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "📱",
    markers: ["#device"],
    className: "text-purple-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "🛠️",
    markers: ["#manual"],
    className: "text-purple-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "🧠",
    markers: ["mental", "pm"],
    className: "text-purple-500 mr-1",
    isSuffixOnly: true,
  },
];

interface GoalTextRendererProps {
  text: string;
  stripFields?: boolean;
  obsidianVaultName?: string;
  onTagClick?: (filterTerm: string) => void;
}

const GoalTextRenderer: React.FC<GoalTextRendererProps> = ({
  text,
  stripFields = false,
  obsidianVaultName,
  onTagClick,
}) => {
  const handleWikiLinkClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>, linkContent: string) => {
      event.preventDefault(); //
      event.stopPropagation(); //

      console.log(
        "[GoalTextRenderer] handleWikiLinkClick called for link content:",
        linkContent,
      );

      // 1. Перевірка, чи налаштована назва Obsidian Vault
      if (!obsidianVaultName) {
        //
        const errorMessage =
          "Назва Obsidian Vault не налаштована. Будь ласка, перевірте налаштування.";
        console.warn(`[GoalTextRenderer] ${errorMessage}`);
        alert(errorMessage);
        return;
      }

      // 2. Формування URL-схеми для Obsidian
      const obsidianUrl = `${OBSIDIAN_SCHEME_PREFIX}open?vault=${encodeURIComponent(
        obsidianVaultName,
      )}&file=${encodeURIComponent(linkContent)}`; //

      console.log(
        "[GoalTextRenderer] OBSIDIAN_SCHEME_PREFIX:",
        OBSIDIAN_SCHEME_PREFIX,
      );
      console.log(
        "[GoalTextRenderer] Attempting to open Obsidian URL:",
        obsidianUrl,
      );

      // 3. Виклик API головного процесу Electron для відкриття зовнішнього посилання
      if (
        window.electronAPI &&
        typeof window.electronAPI.openExternal === "function"
      ) {
        //
        console.log(
          "[GoalTextRenderer] window.electronAPI.openExternal is a function. Calling it...",
        );
        try {
          const result = await window.electronAPI.openExternal(obsidianUrl); //

          // 4. Обробка результату виклику
          if (result && result.success) {
            //
            console.log(
              `[GoalTextRenderer] Successfully initiated opening of ${obsidianUrl} via preload.`,
            );
          } else if (result && !result.success) {
            //
            const preloadErrorMessage =
              result.error || "Невідома помилка в preload-скрипті."; //
            console.error(
              `[GoalTextRenderer] Preload script failed to open link: ${preloadErrorMessage}`,
            );
            alert(`Не вдалося відкрити посилання: ${preloadErrorMessage}`);
          } else if (typeof result === "undefined") {
            console.log(
              `[GoalTextRenderer] Link opening initiated (void return from preload for ${obsidianUrl}).`,
            );
          } else {
            const unexpectedResponseMessage = `Неочікувана відповідь від preload-скрипта: ${JSON.stringify(result)}`;
            console.warn(`[GoalTextRenderer] ${unexpectedResponseMessage}`);
            alert(
              `Не вдалося відкрити посилання: ${unexpectedResponseMessage}`,
            );
          }
        } catch (error) {
          const callErrorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            "[GoalTextRenderer] Error calling window.electronAPI.openExternal:",
            error,
          );
          alert(
            `Помилка під час спроби відкрити посилання: ${callErrorMessage}`,
          );
        }
      } else {
        const apiUnavailableMessage =
          "window.electronAPI or window.electronAPI.openExternal is NOT available.";
        console.error(`[GoalTextRenderer] ${apiUnavailableMessage}`);
        alert("API для відкриття зовнішніх посилань недоступне.");
      }
    },
    [obsidianVaultName],
  );

  // --- ЗМІНЕНО: Функція parseTextAndExtractData тепер знаходить [icon::...] ---
  const parseTextAndExtractData = useCallback(
    (inputText: string) => {
      let currentText = inputText;
      const fields: Array<{ name: string; value: string }> = [];
      const iconsToRender: IconMarkerConfig[] = [];

      // +++ ДОДАНО: Змінна для збереження кастомної іконки +++
      let customIcon: string | null = null;

      // 1. Спочатку шукаємо і витягуємо кастомну іконку
      const customIconRegex = /\[icon::\s*([^\]]+?)\s*\]/g;
      let iconMatch;
      while ((iconMatch = customIconRegex.exec(currentText)) !== null) {
        if (!customIcon) {
          // Беремо тільки першу знайдену іконку
          customIcon = iconMatch[1].trim();
        }
      }
      // Видаляємо всі поля [icon::...] з тексту
      currentText = currentText.replace(customIconRegex, "").trim();

      // 2. Обробляємо стандартні іконки, як і раніше
      for (const config of ICON_CONFIGS) {
        for (const marker of config.markers) {
          let markerFound = false;
          if (
            config.isSuffixOnly &&
            (marker === "!" || marker === "~") &&
            currentText.endsWith(marker)
          ) {
            if (
              currentText.length === marker.length ||
              (currentText.length > marker.length &&
                currentText[currentText.length - marker.length - 1] === " ")
            ) {
              markerFound = true;
            }
          } else if (currentText.includes(marker)) {
            markerFound = true;
          }

          if (markerFound) {
            if (
              !iconsToRender.find((iconConf) => iconConf.icon === config.icon)
            ) {
              iconsToRender.push(config);
            }
            if (
              config.isSuffixOnly &&
              (marker === "!" || marker === "~") &&
              currentText.endsWith(marker) &&
              !marker.endsWith(" ")
            ) {
              currentText = currentText
                .substring(0, currentText.length - marker.length)
                .trim();
            } else {
              currentText = currentText.replace(marker, "").trim();
            }
          }
        }
      }
      iconsToRender.sort(
        (a, b) => ICON_CONFIGS.indexOf(a) - ICON_CONFIGS.indexOf(b),
      );

      // 3. Обробляємо решту полів [key::value]
      const fieldRegex = /\[([^\]]+?)::([^\]]+?)\]/g;
      if (stripFields) {
        currentText = currentText.replace(fieldRegex, "").trim();
      } else {
        let matchWhile;
        fieldRegex.lastIndex = 0;
        const tempTextForFieldStripping = currentText;
        while (
          (matchWhile = fieldRegex.exec(tempTextForFieldStripping)) !== null
        ) {
          fields.push({
            name: matchWhile[1].trim(),
            value: matchWhile[2].trim(),
          });
        }
        currentText = currentText.replace(fieldRegex, "").trim();
      }

      currentText = currentText.replace(/\s\s+/g, " ").trim();

      // +++ ДОДАНО: Повертаємо кастомну іконку разом з іншими даними +++
      return {
        mainText: currentText,
        fields,
        icons: iconsToRender,
        customIcon,
      };
    },
    [stripFields],
  );

  // renderStyledText тепер використовує onTagClick з пропсів
  // @ts-expegct-error
  //@ts-ignore
  const renderStyledText = (textToRender: string): JSX.Element => {
    const combinedRegex =
      /(\[\[([^|\]]+)(?:\|([^\]]+))?\]\])|(@([a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+))|((?:\B|^)#([a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+)\b)/g;
    // @ghts-expect-error
    // @ts-ignore
    const parts: Array<string | JSX.Element> = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(textToRender)) !== null) {
      const fullMatchedSegment = match[0];

      if (match.index > lastIndex) {
        parts.push(textToRender.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Вікі-посилання
        const linkTarget = match[2];
        const linkText = match[3] || linkTarget;
        parts.push(
          <a
            href="#"
            key={`wikilink-${linkTarget}-${match.index}`}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
              handleWikiLinkClick(e, linkTarget)
            }
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            title={`Відкрити "${linkTarget}" в Obsidian`}
          >
            {linkText}
          </a>,
        );
      } else if (match[4]) {
        // @-теги / @мета_цілі
        const atSign = "@";
        const tagTextWithoutPrefix = match[5];
        const fullTagText = atSign + tagTextWithoutPrefix;
        parts.push(
          <span
            key={`at-tag-${tagTextWithoutPrefix}-${match.index}`}
            className="text-pink-700 dark:text-pink-500 font-semibold cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation(); // Запобігаємо спливанню події
              if (onTagClick) {
                onTagClick(fullTagText); // Передаємо тег з префіксом @
              }
            }}
            title={`Фільтрувати за ${fullTagText}`}
          >
            {tagTextWithoutPrefix} {/* Відображаємо текст БЕЗ @ */}
          </span>,
        );
      } else if (match[6]) {
        // #-хештеги
        const hashSign = "#";
        const tagTextWithoutPrefix = match[7];
        const fullTagText = hashSign + tagTextWithoutPrefix;
        parts.push(
          <span
            key={`hash-tag-${tagTextWithoutPrefix}-${match.index}`}
            className="text-green-900 dark:text-green-500 font-medium cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation(); // Запобігаємо спливанню події
              if (onTagClick) {
                onTagClick(fullTagText); // Передаємо тег з префіксом #
              }
            }}
            title={`Фільтрувати за ${fullTagText}`}
          >
            {tagTextWithoutPrefix} {/* Відображаємо текст БЕЗ # */}
          </span>,
        );
      }
      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < textToRender.length) {
      parts.push(textToRender.substring(lastIndex));
    }

    return (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={`part-${index}`}>{part}</React.Fragment>
        ))}
      </>
    );
  };

  // --- ЗМІНЕНО: Отримуємо `customIcon` з результату парсингу ---
  const {
    mainText: processedText,
    icons,
    customIcon,
  } = parseTextAndExtractData(text);

  return (
    // --- ЗМІНЕНО: Оновлюємо логіку рендерингу іконок ---
    <div className="goal-text-renderer break-words flex items-center">
      {(customIcon || icons.length > 0) && (
        <span className="icons-container mr-1 flex items-center">
          {/* Спочатку рендеримо кастомну іконку, якщо вона є */}
          {customIcon && (
            <span className="custom-icon mr-1" title={`Іконка: ${customIcon}`}>
              {customIcon}
            </span>
          )}
          {/* Потім рендеримо стандартні іконки */}
          {icons.map((iconConfig) => (
            <span
              key={iconConfig.icon}
              className={iconConfig.className || "mr-1"}
              title={iconConfig.markers.join(", ")}
            >
              {iconConfig.icon}
            </span>
          ))}
        </span>
      )}
      <span className="text-content">{renderStyledText(processedText)}</span>
    </div>
  );
};

export default GoalTextRenderer;
