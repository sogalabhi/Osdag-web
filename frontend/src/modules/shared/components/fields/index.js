import { SelectField } from './SelectField';
import { ListSelectField } from './ListSelectField';
import { CustomizableField } from './CustomizableField';
import { SectionProfileListField } from './SectionProfileListField';
import { DynamicSelectField } from './DynamicSelectField';
import { ImageField } from './ImageField';
import { OptimizedNumberField } from './OptimizedNumberField';
import { NumberField, TextField } from './NumericField';

/**
 * The component that renders each field type. Every component takes `{ field, ctx }`, where `ctx` is
 * the state and callbacks the input section passes to its fields.
 */
export const FIELD_COMPONENTS = {
  text: TextField,
  number: NumberField,
  optimized_number: OptimizedNumberField,
  select: SelectField,
  connectivitySelect: ListSelectField,
  endPlateSelect: ListSelectField,
  customizable: CustomizableField,
  sectionProfileList: SectionProfileListField,
  dynamicSelect: DynamicSelectField,
  image: ImageField,
};

/**
 * The component for a field type. An unknown type throws in development and has no component
 * (nothing is rendered) in production.
 */
export function fieldComponentFor(type, fieldKey) {
  const component = Object.prototype.hasOwnProperty.call(FIELD_COMPONENTS, type) ? FIELD_COMPONENTS[type] : null;
  if (!component && import.meta.env.DEV) {
    throw new Error(`Unknown field type "${type}" for input "${fieldKey}"`);
  }
  return component;
}
