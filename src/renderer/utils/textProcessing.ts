// src/renderer/utils/textProcessing.ts

import type { Goal } from '../data/goalListsStore'; // Припускаємо, що тип Goal тут доступний

/**
 * Парсить текст, імпортований користувачем, на окремі цілі.
 * Кожен рядок вважається потенційною ціллю.
 * Видаляє початкові маркери списків Markdown, пробіли та таби.
 * 
 * @param text Багаторядковий текст для імпорту.
 * @returns Масив рядків, де кожен рядок - це очищений текст цілі.
 */
export const parseImportedText = (text: string): string[] => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.split('\n');
  const goals: string[] = [];

  // Регулярний вираз для видалення початкових маркерів списку, пробілів та табів.
  // Захоплює:
  // - пробіли/таби на початку рядка (\s*)
  // - дефіс, зірочку або цифру з крапкою (маркери списку) (?:[-*]|\d+\.)?
  // - опціонально пробіл після маркера списку (\s?)
  // - опціонально квадратні дужки для todo-списків Markdown (?:\[[ xX]?\])?
  // - опціонально пробіл після квадратних дужок (\s?)
  // Це все опціонально і групується разом ^\s*(?:(?:[-*]|\d+\.)?\s?(?:\[[ xX]?\])?\s?)?
  // Краще зробити його простішим і надійнішим:
  // Видаляє пробіли на початку, потім будь-яку з комбінацій "- ", "* ", "число. ", "- [ ] ", "- [x] "
  const cleanupPatterns = [
    /^\s*-\s*\[\s*[xX]?\s*\]\s*/, // Matches "- [ ] " or "- [x] "
    /^\s*-\s+/,                   // Matches "- "
    /^\s*\*\s+/,                  // Matches "* "
    /^\s*\d+\.\s+/,               // Matches "1. ", "2. ", etc.
  ];

  for (const line of lines) {
    let currentLine = line;
    // Послідовно застосовуємо патерни для очищення
    for (const pattern of cleanupPatterns) {
      if (pattern.test(currentLine)) {
        currentLine = currentLine.replace(pattern, '');
        break; // Після першого спрацювання патерна, вважаємо маркер видаленим
      }
    }
    
    // Додаткове очищення від початкових/кінцевих пробілів, які могли залишитися
    const cleanedLine = currentLine.trim();

    if (cleanedLine) { // Додавати тільки не порожні рядки
      goals.push(cleanedLine);
    }
  }
  return goals;
};

/**
 * Форматує масив об'єктів цілей у текстовий рядок для експорту.
 * Кожна ціль буде в новому рядку, з префіксом "- " для Markdown.
 * 
 * @param goals Масив об'єктів цілей.
 * @returns Багаторядковий текст, готовий для експорту.
 */
export const formatGoalsForExport = (goals: Goal[]): string => {
  if (!goals || !Array.isArray(goals)) {
    return '';
  }
  // Експортуємо як Markdown todo-список, зберігаючи стан completed
  return goals.map(goal => `- [${goal.completed ? 'x' : ' '}] ${goal.text}`).join('\n');
};


// Приклади використання (можна розкоментувати для тестування в Node.js середовищі):
/*
const sampleImportText = `
  - ціль 1 #тег @проект
*   ціль 2 з зірочкою
    - [x] завершена ціль 3
  - [ ] не завершена ціль 4
  1. нумерована ціль 5
просто ціль 6 без маркера
  \t  ціль 7 з табом
`;

const parsed = parseImportedText(sampleImportText);
console.log("Parsed Goals:");
parsed.forEach(goal => console.log(`"${goal}"`));

const sampleGoalsForExport: Goal[] = [
  { id: '1', text: 'Експорт ціль 1 #тест', completed: false, createdAt: '' },
  { id: '2', text: 'Експорт ціль 2 @важливо', completed: true, createdAt: '' },
  { id: '3', text: 'Експорт ціль 3', completed: false, createdAt: '' },
];

const exportedText = formatGoalsForExport(sampleGoalsForExport);
console.log("\nExported Text:");
console.log(exportedText);
*/

/*
Очікуваний результат парсингу:
"ціль 1 #тег @проект"
"ціль 2 з зірочкою"
"завершена ціль 3"
"не завершена ціль 4"
"нумерована ціль 5"
"просто ціль 6 без маркера"
"ціль 7 з табом"

Очікуваний результат експорту:
- [ ] Експорт ціль 1 #тест
- [x] Експорт ціль 2 @важливо
- [ ] Експорт ціль 3
*/

// src/renderer/utils/textProcessing.ts
// Існуючі функції formatGoalsForExport, parseImportedText ...

export interface ParsedField {
  name: string;
  value: string;
}

export interface GoalParsedData {
  displayableFields: ParsedField[]; 
  rating?: number;
  ratingLabel?: string;
}

export function parseGoalData(text: string): GoalParsedData {
  const fieldRegex = /\[([\w_]+?)::([^\]]+?)\]/g;
  const allParsedFields: ParsedField[] = [];
  // Зберігаємо значення полів для розрахунків, ключі в нижньому регістрі для уніфікованого доступу
  const extractedValues: { [key: string]: { value: number, originalValue: string, fieldName: string } } = {};

  let match;
  while ((match = fieldRegex.exec(text)) !== null) {
    const fieldName = match[1];
    const fieldValue = match[2];
    allParsedFields.push({ name: fieldName, value: fieldValue });

    const numValue = parseFloat(fieldValue);
    if (!isNaN(numValue)) {
      extractedValues[fieldName.toLowerCase()] = { value: numValue, originalValue: fieldValue, fieldName: fieldName };
    }
  }

  let rating: number | undefined;
  let ratingLabel: string | undefined;
  
  // Пріоритетний розрахунок: parent_value * impact / costs
  const pValData = extractedValues['parent_value'];
  const impactData = extractedValues['impact'];
  const costsData = extractedValues['costs'];

  if (pValData && impactData && costsData) {
    if (costsData.value !== 0) {
      rating = (pValData.value * impactData.value) / costsData.value;
      ratingLabel = "Рейтинг (P*I/C)";
    } else {
      // Обробка ділення на нуль
      const numerator = pValData.value * impactData.value;
      rating = numerator > 0 ? Infinity : (numerator < 0 ? -Infinity : 0);
      ratingLabel = "P*I/C (витрати=0)";
    }
  } else {
    // Альтернативний розрахунок: [rating::value], [value::value], [priority::value] або [p::value]
    const directRatingData = extractedValues['rating'] ?? extractedValues['value'] ?? extractedValues['priority'] ?? extractedValues['p'];
    if (directRatingData) {
      rating = directRatingData.value;
      // Використовуємо оригінальну назву поля як мітку, якщо вона одна з стандартних для прямого рейтингу
      const labelKey = Object.keys(extractedValues).find(k => extractedValues[k] === directRatingData);
      ratingLabel = labelKey ? extractedValues[labelKey].fieldName : "Рейтинг";
    } else {
      // Альтернативний розрахунок: impact / costs (якщо є impact)
      // Використовуємо impactData/costsData, якщо вони не були частиною P*I/C
      if (impactData) { 
        if (costsData) { // є impact і costs, але не parent_value
          if (costsData.value !== 0) {
            rating = impactData.value / costsData.value;
            ratingLabel = "Impact/Costs";
          } else {
            rating = impactData.value > 0 ? Infinity : (impactData.value < 0 ? -Infinity : 0);
            ratingLabel = "Impact/Costs (витрати=0)";
          }
        } else { // є тільки impact
          rating = impactData.value;
          ratingLabel = "Impact";
        }
      } else if (costsData) { // є тільки costs (без impact, parent_value)
        // Менші витрати зазвичай краще, тому можна інвертувати значення для рейтингу
        rating = -costsData.value; 
        ratingLabel = `Витрати (інверт.)`;
      }
    }
  }
  
  // displayableFields - це всі поля [name::value], що були знайдені в тексті.
  // Вони будуть показані "як є" у спеціальному блоці при наведенні.
  const displayableFields = allParsedFields;

  return {
    displayableFields,
    rating,
    ratingLabel,
  };
}

// Існуючий код ...
// export const formatGoalsForExport = ...
// export const parseImportedText = ...