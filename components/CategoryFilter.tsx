'use client'

import { Filter } from 'lucide-react'

interface CategoryFilterProps {
  categories: string[]
  departments: string[]
  selectedCategory: string
  selectedDepartment: string
  onCategoryChange: (category: string) => void
  onDepartmentChange: (department: string) => void
}

export default function CategoryFilter({
  categories,
  departments,
  selectedCategory,
  selectedDepartment,
  onCategoryChange,
  onDepartmentChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <select
          value={selectedDepartment}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="all">All Departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}