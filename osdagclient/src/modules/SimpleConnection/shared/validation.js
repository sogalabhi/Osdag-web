/**
 * Shared validation utility for simple connection modules.
 * Provides consistent validation logic across all simple connection types.
 */

/**
 * Validates simple connection inputs
 * @param {Object} inputs - Input values object
 * @param {Object} options - Validation options
 * @param {string} options.moduleType - 'bolted' or 'welded'
 * @returns {Object} Validation result with isValid, errors, and message
 */
export function validateSimpleConnectionInputs(inputs, options = {}) {
    const { moduleType = 'bolted' } = options;
    const errors = [];

    // Required fields validation
    if (!inputs.material || inputs.material === 'Select Material' || inputs.material.trim() === '') {
        errors.push({ field: 'material', message: 'Material is required' });
    }

    if (!inputs.plate_width || inputs.plate_width.trim() === '') {
        errors.push({ field: 'plate_width', message: 'Plate width is required' });
    } else {
        const plateWidth = parseFloat(inputs.plate_width);
        if (isNaN(plateWidth) || plateWidth <= 0) {
            errors.push({ field: 'plate_width', message: 'Plate width must be greater than zero' });
        }
    }

    if (!inputs.axial_force || inputs.axial_force.trim() === '') {
        errors.push({ field: 'axial_force', message: 'Axial force is required' });
    } else {
        const axialForce = parseFloat(inputs.axial_force);
        if (isNaN(axialForce) || axialForce <= 0) {
            errors.push({ field: 'axial_force', message: 'Axial force must be greater than zero' });
        }
    }

    if (!inputs.plate1_thickness || 
        (Array.isArray(inputs.plate1_thickness) && inputs.plate1_thickness.length === 0) ||
        (!Array.isArray(inputs.plate1_thickness) && inputs.plate1_thickness.trim() === '')) {
        errors.push({ field: 'plate1_thickness', message: 'Plate 1 thickness is required' });
    } else {
        const plate1Thickness = Array.isArray(inputs.plate1_thickness) 
            ? inputs.plate1_thickness[0] 
            : inputs.plate1_thickness;
        const thickness1 = parseFloat(plate1Thickness);
        if (isNaN(thickness1) || thickness1 <= 0) {
            errors.push({ field: 'plate1_thickness', message: 'Plate 1 thickness must be greater than zero' });
        }
    }

    if (!inputs.plate2_thickness || 
        (Array.isArray(inputs.plate2_thickness) && inputs.plate2_thickness.length === 0) ||
        (!Array.isArray(inputs.plate2_thickness) && inputs.plate2_thickness.trim() === '')) {
        errors.push({ field: 'plate2_thickness', message: 'Plate 2 thickness is required' });
    } else {
        const plate2Thickness = Array.isArray(inputs.plate2_thickness) 
            ? inputs.plate2_thickness[0] 
            : inputs.plate2_thickness;
        const thickness2 = parseFloat(plate2Thickness);
        if (isNaN(thickness2) || thickness2 <= 0) {
            errors.push({ field: 'plate2_thickness', message: 'Plate 2 thickness must be greater than zero' });
        }
    }

    // Module-specific validations
    if (moduleType === 'bolted') {
        // Validate bolt diameter
        if (!inputs.bolt_diameter || 
            (Array.isArray(inputs.bolt_diameter) && inputs.bolt_diameter.length === 0) ||
            (!Array.isArray(inputs.bolt_diameter) && inputs.bolt_diameter === 'All')) {
            errors.push({ field: 'bolt_diameter', message: 'At least one bolt diameter must be selected' });
        }

        // Validate bolt grade
        if (!inputs.bolt_grade || 
            (Array.isArray(inputs.bolt_grade) && inputs.bolt_grade.length === 0) ||
            (!Array.isArray(inputs.bolt_grade) && inputs.bolt_grade === 'All')) {
            errors.push({ field: 'bolt_grade', message: 'At least one bolt grade must be selected' });
        }

        // Validate slip factor range
        if (inputs.bolt_slip_factor) {
            const slipFactor = parseFloat(inputs.bolt_slip_factor);
            if (isNaN(slipFactor) || slipFactor <= 0 || slipFactor > 1.0) {
                errors.push({ field: 'bolt_slip_factor', message: 'Slip factor must be between 0 and 1.0' });
            }
        }
    } else if (moduleType === 'welded') {
        // Validate weld size
        if (!inputs.weld_size || 
            (Array.isArray(inputs.weld_size) && inputs.weld_size.length === 0) ||
            (!Array.isArray(inputs.weld_size) && inputs.weld_size.trim() === '')) {
            errors.push({ field: 'weld_size', message: 'Weld size is required' });
        } else {
            const weldSize = Array.isArray(inputs.weld_size) 
                ? inputs.weld_size[0] 
                : inputs.weld_size;
            const size = parseFloat(weldSize);
            if (isNaN(size) || size <= 0) {
                errors.push({ field: 'weld_size', message: 'Weld size must be greater than zero' });
            }
        }
    }

    // Build error message
    const message = errors.length > 0
        ? errors.map(e => e.message).join('; ')
        : '';

    return {
        isValid: errors.length === 0,
        errors: errors,
        message: message
    };
}

