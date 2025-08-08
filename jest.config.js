// jest.config.js
module.exports = {
  // `preset` є хорошим початком, але `transform` дає більше контролю
  preset: 'ts-jest',
  
  // Вказує, що тести будуть запускатися в середовищі, подібному до Node.js
  testEnvironment: 'node',

  // --- ВАЖЛИВА ЧАСТИНА: Явно вказуємо, як обробляти файли ---
  // Цей блок каже Jest: "Знайдеш файл, що закінчується на .ts або .tsx?
  // Використовуй 'ts-jest' для його перетворення на JavaScript."
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Опції для ts-jest, якщо вони потрібні в майбутньому
      // Наприклад, вказати інший tsconfig для тестів:
      // tsconfig: 'tsconfig.spec.json'
    }],
  },

  // Якщо у вас є шляхи, налаштовані в tsconfig.json (paths),
  // вам може знадобитися налаштувати moduleNameMapper
  // moduleNameMapper: { ... }
};