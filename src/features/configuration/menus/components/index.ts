/**
 * Feature-local barrel for configuration UI blocks.
 *
 * Mirrors `@/features/master-data-branches/components` — re-export shared
 * table/form blocks when available in the project.
 */
export {
  DataTableBlock,
  DataTableBlockCardGrid,
  DataTableBlockPageHeader,
  DataTableBlockDetailPanel,
  DataTableBlockDeleteDialog,
  DataTableBlockStatusBadge,
  DataTableBlockCodeBadge,
  DataTableBlockNumericText,
  codeColumn,
  nameColumn,
  statusColumn,
  textColumn,
  DetailField,
  DetailSection,
  type DataTableBlockColumnDef,
  type DataTableBlockDetailPanelProps,
  type BlockCardColumnDef,
  type BlockCardColumnDef as ColumnDef,
} from "@/components/blocks/data-table";

export {
  FormBlockSheet,
  FormBlockFormSheetFooter,
  FormBlockFormSection,
  FormField,
  FormSection,
  FormGrid,
  FormFieldStack,
  type FormBlockFormSectionIcon,
} from "@/components/blocks/form";

export {
  FormSheet,
  FormSheetFooter,
  type FormSheetProps,
  type FormSheetVariant,
} from "@/components/shared/form-sheet";
