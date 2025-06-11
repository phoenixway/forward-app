/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Переконайтеся, що це тут, якщо ви використовуєте dark: префікси
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}", // Сканує всі .js, .jsx, .ts, .tsx файли
    "./src/renderer/index.html",          // Сканує ваш HTML
        "./src/renderer/App.tsx", // Явно вкажіть файл, де є тестовий h1

  ],
  theme: {
    extend: {},
  },
  plugins: [],
}



// // tailwind.config.js
// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [
//     "./src/renderer/**/*.{js,ts,jsx,tsx,html}", // Всі файли в src/renderer
//     "./src/renderer/index.html", // Явно вказуємо index.html
//   ],
//   darkMode: "class", // Або 'media' для системних налаштувань, але 'class' дає більше контролю

//   theme: {
//     extend: {
//       // Тут ви можете розширювати стандартну тему Tailwind
//       // наприклад, додати власні кольори, шрифти, брекпоінти тощо
//       // colors: {
//       //   'brand-blue': '#1DA1F2',
//       // },
//       "slate-850": "#171E2E", // Приклад трохи темнішого slate
//       "slate-950": "#0B0F1A", // Приклад ще темнішого
//     },
//   },
//   plugins: [
//     // Можна додати плагіни Tailwind, наприклад, для типографії або форм
//     // require('@tailwindcss/typography'),
//     // require('@tailwindcss/forms'),
//   ],
// };
