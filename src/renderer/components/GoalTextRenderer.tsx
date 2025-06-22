// src/renderer/components/GoalTextRenderer.tsx
import React, { useCallback } from "react";
import { OBSIDIAN_SCHEME_PREFIX } from "../../constants";

// Категорії та конфігурація іконок
enum IconCategory {
  IMPORTANCE = 1,
  SCALE = 2,
  ACTIVITY = 3,
  CUSTOM = 4,
}

interface IconConfig {
  icon: string;
  markers: string[];
  category: IconCategory;
  className?: string;
  isSuffixOnly?: boolean;
}

const ICON_CONFIGS: IconConfig[] = [
  {
    icon: "🔥",
    markers: ["#critical", "! ", "!"],
    category: IconCategory.IMPORTANCE,
    className: "text-red-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "⭐",
    markers: ["#day", "+"],
    category: IconCategory.IMPORTANCE,
    className: "text-yellow-500 mr-1",
  },
  {
    icon: "📌",
    markers: ["#week", "++"],
    category: IconCategory.SCALE,
    className: "text-blue-500 mr-1",
  },
  {
    icon: "🗓️",
    markers: ["#month"],
    category: IconCategory.SCALE,
    className: "text-sky-500 mr-1",
  },
  {
    icon: "🎯",
    markers: ["#middle-term", "+++ "],
    category: IconCategory.SCALE,
    className: "text-green-500 mr-1",
  },
  {
    icon: "🔭",
    markers: ["#long-term", "~ ", "~"],
    category: IconCategory.SCALE,
    className: "text-purple-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "✨",
    markers: ["#str"],
    category: IconCategory.SCALE,
    className: "text-indigo-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "🛠️",
    markers: ["#manual"],
    category: IconCategory.ACTIVITY,
    className: "text-gray-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "🧠",
    markers: ["#mental", "#pm"],
    category: IconCategory.ACTIVITY,
    className: "text-orange-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "📱",
    markers: ["#device"],
    category: IconCategory.ACTIVITY,
    className: "text-teal-500 mr-1",
    isSuffixOnly: true,
  },
  {
    icon: "🌫️",
    markers: ["#unclear"],
    category: IconCategory.CUSTOM,
    className: "text-teal-500 mr-1",
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
      event.preventDefault();
      event.stopPropagation();

      console.log(
        "[GoalTextRenderer] handleWikiLinkClick called for link content:",
        linkContent,
      );

      if (!obsidianVaultName) {
        const errorMessage =
          "Назва Obsidian Vault не налаштована. Будь ласка, перевірте налаштування.";
        console.warn(`[GoalTextRenderer] ${errorMessage}`);
        alert(errorMessage);
        return;
      }

      const obsidianUrl = `${OBSIDIAN_SCHEME_PREFIX}open?vault=${encodeURIComponent(
        obsidianVaultName,
      )}&file=${encodeURIComponent(linkContent)}`;

      if (
        window.electronAPI &&
        typeof window.electronAPI.openExternal === "function"
      ) {
        try {
          const result = await window.electronAPI.openExternal(obsidianUrl);
          if (result && result.success) {
            console.log(
              `[GoalTextRenderer] Successfully initiated opening of ${obsidianUrl} via preload.`,
            );
          } else if (result && !result.success) {
            const preloadErrorMessage =
              result.error || "Невідома помилка в preload-скрипті.";
            console.error(
              `[GoalTextRenderer] Preload script failed to open link: ${preloadErrorMessage}`,
            );
            alert(`Не вдалося відкрити посилання: ${preloadErrorMessage}`);
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
        alert("API для відкриття зовнішніх посилань недоступне.");
      }
    },
    [obsidianVaultName],
  );

  const parseTextAndExtractData = useCallback(
    (inputText: string) => {
      let currentText = inputText;
      const fields: Array<{ name: string; value: string }> = [];
      const foundIcons: (
        | IconConfig
        | { icon: string; category: IconCategory }
      )[] = [];

      // --- Допоміжна функція для екранування символів в рег. виразах ---
      const escapeRegex = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      // 1. Обробка кастомних іконок [icon::...]
      const customIconRegex = /\[icon::\s*([^\]]+?)\s*\]/g;
      currentText = currentText.replace(
        customIconRegex,
        (match, iconContent) => {
          foundIcons.push({
            icon: iconContent.trim(),
            category: IconCategory.CUSTOM,
          });
          return "";
        },
      ); // ПОКИ НЕ ВИКОРИСТОВУЄМО .trim()!

      // 2. Обробка стандартних іконок статусів
      for (const config of ICON_CONFIGS) {
        for (const marker of config.markers) {
          // Створюємо рег. вираз, який шукає маркер як окреме "слово"
          // (^|\\s) - початок рядка або пробіл
          // (\\s|$) - пробіл або кінець рядка
          const escapedMarker = escapeRegex(marker);
          const regex = new RegExp(`(^|\\s)(${escapedMarker})(\\s|$)`, "g");

          let matchOccurred = false;
          currentText = currentText.replace(regex, (match, p1, p2, p3) => {
            matchOccurred = true;
            // Повертаємо пробіли, які були до або після маркера, щоб не "злипати" слова
            return p1 + p3;
          });

          if (matchOccurred) {
            if (
              !foundIcons.some(
                (found) => "markers" in found && found.icon === config.icon,
              )
            ) {
              foundIcons.push(config);
            }
          }
        }
      }

      foundIcons.sort((a, b) => a.category - b.category);

      // 3. Обробка полів [key::value]
      const fieldRegex = /\[([^\]]+?)::([^\]]+?)\]/g;
      currentText = currentText.replace(fieldRegex, (match, name, value) => {
        if (stripFields) return "";
        fields.push({ name: name.trim(), value: value.trim() });
        return "";
      });

      // 4. Фінальна очистка тексту від зайвих пробілів
      currentText = currentText.replace(/\s\s+/g, " ").trim();

      return { mainText: currentText, fields, icons: foundIcons };
    },
    [stripFields],
  );

  // @ts-ignore
  const renderStyledText = (textToRender: string): JSX.Element => {
    const combinedRegex =
      /(\[\[([^|\]]+)(?:\|([^\]]+))?\]\])|(@([a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+))|((?:\B|^)#([a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+)\b)/g;
    // @ts-ignore
    const parts: Array<string | JSX.Element> = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(textToRender)) !== null) {
      if (match.index > lastIndex) {
        parts.push(textToRender.substring(lastIndex, match.index));
      }

      const fullMatchedSegment = match[0];
      if (match[1]) {
        const linkTarget = match[2];
        const linkText = match[3] || linkTarget;
        parts.push(
          <a
            href="#"
            key={`wikilink-${linkTarget}-${match.index}`}
            onClick={(e) => handleWikiLinkClick(e, linkTarget)}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            title={`Відкрити "${linkTarget}" в Obsidian`}
          >
            {linkText}
          </a>,
        );
      } else if (match[4]) {
        const atSign = "@";
        const tagTextWithoutPrefix = match[5];
        const fullTagText = atSign + tagTextWithoutPrefix;
        parts.push(
          <span
            key={`at-tag-${tagTextWithoutPrefix}-${match.index}`}
            className="text-pink-700 dark:text-pink-500 font-semibold cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (onTagClick) onTagClick(fullTagText);
            }}
            title={`Фільтрувати за ${fullTagText}`}
            data-tag-name={fullTagText}
          >
            {tagTextWithoutPrefix}
          </span>,
        );
      } else if (match[6]) {
        const hashSign = "#";
        const tagTextWithoutPrefix = match[7];
        const fullTagText = hashSign + tagTextWithoutPrefix;
        parts.push(
          <span
            key={`hash-tag-${tagTextWithoutPrefix}-${match.index}`}
            className="text-green-900 dark:text-green-500 font-medium cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (onTagClick) onTagClick(fullTagText);
            }}
            title={`Фільтрувати за ${fullTagText}`}
            data-tag-name={fullTagText}
          >
            {tagTextWithoutPrefix}
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

  const { mainText: processedText, icons } = parseTextAndExtractData(text);

  return (
    <div className="goal-text-renderer break-words flex items-center">
      {icons.length > 0 && (
        <span className="icons-container mr-1.5 flex items-center space-x-1">
          {icons.map((iconData, index) => {
            const isCustom = !("markers" in iconData);
            const icon = iconData.icon;
            const className = "className" in iconData ? iconData.className : "";
            const title = isCustom
              ? `Іконка: ${icon}`
              : "markers" in iconData
                ? iconData.markers.join(", ")
                : "";

            return (
              <span
                key={`${icon}-${index}`}
                className={className}
                title={title}
              >
                {icon}
              </span>
            );
          })}
        </span>
      )}
      <span className="text-content">{renderStyledText(processedText)}</span>
    </div>
  );
};

export default GoalTextRenderer;
