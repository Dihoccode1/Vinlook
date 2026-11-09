/**
 * @file SearchFilter.tsx
 * @description Bộ lọc danh mục điểm tham quan dạng thẻ tag/pills
 */

import React from 'react';

interface SearchFilterProps {
  categories: Record<string, string>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function SearchFilter({
  categories,
  selectedCategory,
  onSelectCategory
}: SearchFilterProps) {
  return (
    <div className="search-filter-pills" role="tablist" aria-label="Lọc theo danh mục">
      <button
        type="button"
        role="tab"
        className={`filter-pill ${selectedCategory === '' ? 'active' : ''}`}
        aria-selected={selectedCategory === ''}
        onClick={() => onSelectCategory('')}
      >
        Tất cả
      </button>
      {Object.entries(categories).map(([key, name]) => (
        <button
          key={key}
          type="button"
          role="tab"
          className={`filter-pill ${selectedCategory === key ? 'active' : ''}`}
          aria-selected={selectedCategory === key}
          onClick={() => onSelectCategory(key)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
