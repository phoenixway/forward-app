const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development', // Явно встановлюємо режим
  entry: "./src/renderer/renderer.tsx",
  target: "web", // Важливо для Electron renderer процесу
  devtool: process.env.NODE_ENV === 'production' ? false : "source-map", // Source maps тільки для розробки

  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            // Переконайтеся, що шлях до tsconfig.json правильний
            // configFile: path.resolve(__dirname, 'tsconfig.json') // Якщо tsconfig не в корені
            // Якщо tsconfig.json в корені проекту, ця опція може бути не потрібна
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader, // Витягує CSS в окремі файли
          "css-loader",                // Інтерпретує @import та url()
          {                            // Обробляє CSS за допомогою PostCSS (включаючи Tailwind)
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                // Конфігурація PostCSS (tailwind.config.js та postcss.config.js)
                // повинна автоматично підхоплюватися.
              },
            },
          },
        ],
      },
      // Можете додати лоадери для інших типів файлів (зображення, шрифти) тут, якщо потрібно
      // {
      //   test: /\.(png|svg|jpg|jpeg|gif)$/i,
      //   type: 'asset/resource',
      // },
      // {
      //   test: /\.(woff|woff2|eot|ttf|otf)$/i,
      //   type: 'asset/resource',
      // },
    ],
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"], // Додав .json
    fallback: {
      // Ці фолбеки потрібні, якщо ви використовуєте Node.js core модулі в коді рендерера,
      // що зазвичай не є найкращою практикою. Краще перенести таку логіку в main процес
      // і взаємодіяти через IPC.
      path: require.resolve("path-browserify"),
      os: require.resolve("os-browserify/browser"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"), // Додав слеш в кінці, як іноді рекомендують
      process: require.resolve("process/browser"),
      util: require.resolve("util/"),    // Додав слеш
      fs: false, // fs не може бути поліфіллено для браузера/рендерера
      net: false,
      tls: false,
    },
  },

  output: {
    filename: "renderer.js", // Ім'я JavaScript бандлу
    path: path.resolve(__dirname, "dist/renderer"), // Директорія для вихідних файлів рендерера
    publicPath: "./", // Важливо для правильних відносних шляхів у index.html
                      // Це гарантує, що ресурси будуть завантажуватися відносно index.html
    clean: true,      // Очищає папку dist/renderer перед кожною збіркою
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html", // Шлях до вашого HTML шаблону
      filename: "index.html",               // Ім'я вихідного HTML файлу в dist/renderer/
      // inject: true, // true за замовчуванням, додає скрипти/стилі
    }),
    new MiniCssExtractPlugin({
      filename: "styles.css", // Ім'я вихідного CSS файлу в dist/renderer/
      // chunkFilename: "[id].[contenthash].css", // Для оптимізації кешування, якщо є розділення коду CSS
    }),
    new webpack.ProvidePlugin({
      process: "process/browser", // Надає 'process' для коду, який на нього розраховує
      Buffer: ["buffer", "Buffer"], // Надає 'Buffer'
    }),
    // DefinePlugin дозволяє створювати глобальні константи, які можуть бути налаштовані під час компіляції
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      // 'process.env.MY_VARIABLE': JSON.stringify('my_value'), // Приклад іншої змінної
      // global: "globalThis", // Це вже не так актуально з сучасними налаштуваннями
    }),
  ],

  devServer: { // Налаштування для webpack-dev-server (використовується npm run dev)
    static: {
      directory: path.join(__dirname, "dist/renderer"), // Обслуговує файли з dist/renderer
                                                      // або path.join(__dirname, "dist") якщо є інші ресурси
    },
    port: 3000,           // Порт для сервера розробки
    hot: true,            // Вмикає Hot Module Replacement
    historyApiFallback: true, // Для single-page applications, перенаправляє 404 на index.html
    // open: true, // Автоматично відкривати браузер (для Electron це не потрібно)
    // compress: true, // Вмикає gzip стиснення
  },

  // Оптимізація (особливо для продакшн збірки)
  optimization: {
    minimize: process.env.NODE_ENV === 'production', // Мініфікація тільки для продакшн
    // minimizer: [
    //   // Тут можна додати TerserPlugin для JS та CssMinimizerPlugin для CSS,
    //   // якщо стандартної мініфікації недостатньо або потрібні специфічні налаштування.
    //   // new TerserPlugin({...}),
    //   // new CssMinimizerPlugin(),
    // ],
    // splitChunks: { // Для розділення коду на чанки (просунута оптимізація)
    //   chunks: 'all',
    // },
  },

  // Можна додати для вимкнення деяких попереджень Node.js у браузері,
  // але краще уникати використання Node.js специфічних речей у рендерері.
  // node: {
  //   global: false, // або true, якщо дійсно потрібно
  //   __filename: false,
  //   __dirname: false,
  // },

  // Профільування збірки
  // stats: 'verbose', // Для дуже детального виводу
};

// //webpack.renderer.config.js
// const path = require("path");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
// const webpack = require("webpack");

// module.exports = {
//   mode: process.env.NODE_ENV || "development",
//   // Переконайтеся, що тут правильна точка входу, залежно від того, чи потрібен globalPolyfill.ts
//   // entry: ["./src/renderer/globalPolyfill.ts", "./src/renderer/renderer.tsx"], 
//   entry: "./src/renderer/renderer.tsx", // Якщо globalPolyfill.ts не потрібен
  
//   target: "web", 
//   devtool: "source-map", 
  
//   module: {
//     rules: [
//       {
//         test: /\.(ts|tsx)$/,
//         exclude: /node_modules/,
//         use: {
//           loader: "ts-loader",
//           options: {
//             // Явно вказуємо шлях до tsconfig.json
//             // Це допоможе, якщо ts-loader з якихось причин не знаходить його автоматично
//             configFile: path.resolve(__dirname, 'tsconfig.json')
//           }
//         }
//       },
//       {
//         test: /\.css$/,
//         use: [
//           "style-loader", // 3. Вставляє стилі в DOM
//           "css-loader",   // 2. Інтерпретує @import та url() як import/require()
//           {               // 1. Обробляє CSS за допомогою PostCSS (включаючи Tailwind)
//             loader: "postcss-loader",
//             options: {
//               postcssOptions: {
//                 // plugins: [ // Можна вказати плагіни тут, але вони автоматично підхопляться з postcss.config.js
//                 //   require('tailwindcss'),
//                 //   require('autoprefixer'),
//                 // ],
//               }
//             },
//           },
//         ],
//       },
//     ],
//   },
//   resolve: {
//     extensions: [".ts", ".tsx", ".js"],
//     fallback: {
//       path: require.resolve("path-browserify"),
//       os: require.resolve("os-browserify/browser"),
//       crypto: require.resolve("crypto-browserify"),
//       stream: require.resolve("stream-browserify"),
//       buffer: require.resolve("buffer"),
//       process: require.resolve("process/browser"),
//       util: require.resolve("util"),
//       fs: false, 
//       net: false,
//       tls: false,
//     },
//   },
//   output: {
//     filename: "renderer.js",
//     path: path.resolve(__dirname, "dist/renderer"),
//     publicPath: "/", 
//   },
//   plugins: [
//     new HtmlWebpackPlugin({
//       template: "./src/renderer/index.html",
//       filename: "index.html",
//     }),
//     new webpack.ProvidePlugin({
//       process: "process/browser",
//       Buffer: ["buffer", "Buffer"],
//     }),
//     new webpack.DefinePlugin({
//       'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
//       global: "globalThis",
//     }),
//   ],
//   devServer: {
//     static: {
//       directory: path.join(__dirname, "dist/renderer"),
//     },
//     port: 3000,
//     hot: true,
//     historyApiFallback: true, 
//   },
// };