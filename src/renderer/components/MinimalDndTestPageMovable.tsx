// src/renderer/components/MinimalDndTestPageMovable.tsx
import React, { useState } from "react";
import { List, arrayMove } from "react-movable";

interface Item {
  id: string; // react-movable не вимагає id, але він корисний для key
  name: string;
  // Можна додати інші властивості, якщо потрібно для стилізації
  isDragged?: boolean;
}

const initialItems: Item[] = [
  { id: "item-1", name: "Елемент А" },
  { id: "item-2", name: "Елемент Б" },
  { id: "item-3", name: "Елемент В" },
  { id: "item-4", name: "Елемент Г" },
  { id: "item-5", name: "Елемент Д" },
];

function MinimalDndTestPageMovable() {
  const [items, setItems] = useState<Item[]>(initialItems);

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        width: "300px",
        margin: "0 auto",
      }}
    >
      <h1>Тест react-movable</h1>
      <List
        values={items}
        onChange={({ oldIndex, newIndex }) =>
          setItems((prevItems) => arrayMove(prevItems, oldIndex, newIndex))
        }
        renderList={({ children, props, isDragged }) => (
          <ul
            {...props}
            style={{
              listStyleType: "none",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: isDragged ? "#e0e7ff" : "#f9fafb", // Фон списку при перетягуванні
            }}
          >
            {children}
          </ul>
        )}
        renderItem={({ value, props, index, isDragged, isSelected }) => (
          <li
            {...props}
            key={value.id} // Важливо для React
            style={{
              ...props.style, // Стилі від react-movable (для transform, etc.)
              padding: "12px 15px",
              margin: "0 0 8px 0",
              backgroundColor: isDragged
                ? "#4f46e5"
                : isSelected
                  ? "#c7d2fe"
                  : "white",
              color: isDragged ? "white" : "black",
              border: `1px solid ${isDragged ? "#4f46e5" : "#e5e7eb"}`,
              borderRadius: "4px",
              boxShadow: isDragged
                ? "0 4px 6px rgba(0,0,0,0.1)"
                : "0 1px 2px rgba(0,0,0,0.05)",
              userSelect: "none",
              cursor: isDragged ? "grabbing" : "grab",
            }}
          >
            {value.name}
            {isDragged && (
              <span style={{ marginLeft: "10px", fontStyle: "italic" }}>
                (перетягується)
              </span>
            )}
          </li>
        )}
      />
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#555" }}>
        <p>Поточний порядок:</p>
        <ol>
          {items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default MinimalDndTestPageMovable;
