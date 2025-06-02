// Word filtering functionality

import { ELEMENTS, CSS_CLASSES } from '../app/config.js';
import { getElementById, showElement, hideElement, setHTML, addClass, removeClass } from '../utils/helpers.js';
import { validateDateRange } from '../utils/validation.js';
import { getUniqueColumnValues } from './csvParser.js';

/**
 * Word filter manager class
 */
export class WordFilterManager {
    constructor() {
        this.wordData = [];
        this.filteredData = [];
        this.filters = {
            dateFrom: '',
            dateTo: '',
            grades: new Set(),
            sources: new Set()
        };
        this.onFilterChangeCallback = null;
        this.init();
    }

    /**
     * Initialize word filter manager
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for filter controls
     */
    setupEventListeners() {
        // Date filter listeners
        const dateFromInput = getElementById(ELEMENTS.DATE_FROM);
        const dateToInput = getElementById(ELEMENTS.DATE_TO);

        if (dateFromInput) {
            dateFromInput.addEventListener('change', () => {
                this.filters.dateFrom = dateFromInput.value;
                this.applyFilters();
            });
        }

        if (dateToInput) {
            dateToInput.addEventListener('change', () => {
                this.filters.dateTo = dateToInput.value;
                this.applyFilters();
            });
        }
    }

    /**
     * Set word data and initialize filters
     * @param {Array} wordData - Array of word objects
     */
    setWordData(wordData) {
        this.wordData = wordData || [];
        this.filteredData = [...this.wordData];
        this.initializeFilterOptions();
        this.showFiltersIfNeeded();
        this.applyFilters();
    }

    /**
     * Initialize filter options based on word data
     */
    initializeFilterOptions() {
        this.initializeGradeFilters();
        this.initializeSourceFilters();
    }

    /**
     * Initialize grade filter checkboxes
     */
    initializeGradeFilters() {
        const gradeContainer = getElementById(ELEMENTS.GRADE_FILTERS);
        if (!gradeContainer) return;

        const grades = getUniqueColumnValues(this.wordData, 'grade');
        
        if (grades.length === 0) {
            gradeContainer.style.display = 'none';
            return;
        }

        gradeContainer.style.display = 'flex';
        
        const checkboxes = grades.map(grade => {
            const id = `grade-${grade.replace(/[^a-zA-Z0-9]/g, '')}`;
            return `
                <label class="filter-checkbox">
                    <input type="checkbox" id="${id}" value="${grade}" checked>
                    <span>${grade}</span>
                </label>
            `;
        }).join('');

        setHTML(gradeContainer, checkboxes);

        // Add event listeners to grade checkboxes
        grades.forEach(grade => {
            const id = `grade-${grade.replace(/[^a-zA-Z0-9]/g, '')}`;
            const checkbox = getElementById(id);
            if (checkbox) {
                this.filters.grades.add(grade); // Initially all selected
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.filters.grades.add(grade);
                    } else {
                        this.filters.grades.delete(grade);
                    }
                    this.applyFilters();
                });
            }
        });
    }

    /**
     * Initialize source filter checkboxes
     */
    initializeSourceFilters() {
        const sourceContainer = getElementById(ELEMENTS.SOURCE_FILTERS);
        if (!sourceContainer) return;

        const sources = getUniqueColumnValues(this.wordData, 'source');
        
        if (sources.length === 0) {
            sourceContainer.style.display = 'none';
            return;
        }

        sourceContainer.style.display = 'flex';
        
        const checkboxes = sources.map(source => {
            const id = `source-${source.replace(/[^a-zA-Z0-9]/g, '')}`;
            return `
                <label class="filter-checkbox">
                    <input type="checkbox" id="${id}" value="${source}" checked>
                    <span>${source}</span>
                </label>
            `;
        }).join('');

        setHTML(sourceContainer, checkboxes);

        // Add event listeners to source checkboxes
        sources.forEach(source => {
            const id = `source-${source.replace(/[^a-zA-Z0-9]/g, '')}`;
            const checkbox = getElementById(id);
            if (checkbox) {
                this.filters.sources.add(source); // Initially all selected
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.filters.sources.add(source);
                    } else {
                        this.filters.sources.delete(source);
                    }
                    this.applyFilters();
                });
            }
        });
    }

    /**
     * Show filters section if there are filterable options
     */
    showFiltersIfNeeded() {
        const filtersContainer = getElementById(ELEMENTS.WORD_FILTERS);
        if (!filtersContainer) return;

        const hasGrades = getUniqueColumnValues(this.wordData, 'grade').length > 0;
        const hasSources = getUniqueColumnValues(this.wordData, 'source').length > 0;
        const hasDates = this.wordData.some(word => word.date && word.date.trim() !== '');

        if (hasGrades || hasSources || hasDates) {
            showElement(filtersContainer);
        } else {
            hideElement(filtersContainer);
        }
    }

    /**
     * Apply all active filters to word data
     */
    applyFilters() {
        this.filteredData = this.wordData.filter(word => {
            return this.passesDateFilter(word) &&
                   this.passesGradeFilter(word) &&
                   this.passesSourceFilter(word);
        });

        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(this.filteredData);
        }
    }

    /**
     * Check if word passes date filter
     * @param {Object} word - Word object
     * @returns {boolean} - True if passes filter
     */
    passesDateFilter(word) {
        if (!this.filters.dateFrom && !this.filters.dateTo) {
            return true; // No date filter applied
        }

        if (!word.date || word.date.trim() === '') {
            return false; // Word has no date
        }

        const wordDate = new Date(word.date);
        if (isNaN(wordDate.getTime())) {
            return false; // Invalid date
        }

        if (this.filters.dateFrom) {
            const fromDate = new Date(this.filters.dateFrom);
            if (wordDate < fromDate) {
                return false;
            }
        }

        if (this.filters.dateTo) {
            const toDate = new Date(this.filters.dateTo);
            if (wordDate > toDate) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if word passes grade filter
     * @param {Object} word - Word object
     * @returns {boolean} - True if passes filter
     */
    passesGradeFilter(word) {
        if (this.filters.grades.size === 0) {
            return true; // No grade filter applied
        }

        if (!word.grade || word.grade.trim() === '') {
            return this.filters.grades.size === 0; // Include words with no grade only if no filter
        }

        return this.filters.grades.has(word.grade.trim());
    }

    /**
     * Check if word passes source filter
     * @param {Object} word - Word object
     * @returns {boolean} - True if passes filter
     */
    passesSourceFilter(word) {
        if (this.filters.sources.size === 0) {
            return true; // No source filter applied
        }

        if (!word.source || word.source.trim() === '') {
            return this.filters.sources.size === 0; // Include words with no source only if no filter
        }

        return this.filters.sources.has(word.source.trim());
    }

    /**
     * Reset all filters to default state
     */
    resetFilters() {
        // Reset date filters
        const dateFromInput = getElementById(ELEMENTS.DATE_FROM);
        const dateToInput = getElementById(ELEMENTS.DATE_TO);
        
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        
        this.filters.dateFrom = '';
        this.filters.dateTo = '';

        // Reset grade filters
        this.filters.grades.clear();
        const gradeCheckboxes = document.querySelectorAll('#grade-filters input[type="checkbox"]');
        gradeCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.filters.grades.add(checkbox.value);
        });

        // Reset source filters
        this.filters.sources.clear();
        const sourceCheckboxes = document.querySelectorAll('#source-filters input[type="checkbox"]');
        sourceCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.filters.sources.add(checkbox.value);
        });

        this.applyFilters();
    }

    /**
     * Get filtered word data
     * @returns {Array} - Filtered word data
     */
    getFilteredData() {
        return this.filteredData;
    }

    /**
     * Get filter statistics
     * @returns {Object} - Filter statistics
     */
    getFilterStats() {
        return {
            totalWords: this.wordData.length,
            filteredWords: this.filteredData.length,
            filtersActive: this.hasActiveFilters(),
            activeFilters: {
                dateRange: !!(this.filters.dateFrom || this.filters.dateTo),
                grades: this.filters.grades.size > 0 && this.filters.grades.size < getUniqueColumnValues(this.wordData, 'grade').length,
                sources: this.filters.sources.size > 0 && this.filters.sources.size < getUniqueColumnValues(this.wordData, 'source').length
            }
        };
    }

    /**
     * Check if any filters are active
     * @returns {boolean} - True if filters are active
     */
    hasActiveFilters() {
        const stats = this.getFilterStats();
        return stats.activeFilters.dateRange || stats.activeFilters.grades || stats.activeFilters.sources;
    }

    /**
     * Set callback for filter changes
     * @param {Function} callback - Callback function
     */
    setOnFilterChangeCallback(callback) {
        this.onFilterChangeCallback = callback;
    }

    /**
     * Validate current filter settings
     * @returns {Object} - Validation result
     */
    validateFilters() {
        const result = {
            isValid: true,
            errors: []
        };

        // Validate date range
        if (this.filters.dateFrom || this.filters.dateTo) {
            const dateValidation = validateDateRange(this.filters.dateFrom, this.filters.dateTo);
            if (!dateValidation.isValid) {
                result.isValid = false;
                result.errors.push(...dateValidation.errors);
            }
        }

        // Check if any words remain after filtering
        if (this.filteredData.length === 0) {
            result.isValid = false;
            result.errors.push('No words match the current filter criteria');
        }

        return result;
    }
}

// Global word filter manager instance
export const wordFilterManager = new WordFilterManager();
