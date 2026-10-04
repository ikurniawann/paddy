"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { AppSidebarNavIcon } from "@/components/shared/app-sidebar-nav-icons";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogFooter,
  DialogPanel,
  DialogPanelBody,
  DialogPanelDescription,
  DialogPanelForm,
  DialogPanelHeader,
  DialogPanelTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { NavIconName } from "@/lib/iam/types";
import { MENU_ICON_OPTIONS } from "../constants/menu-icons";
import { useMenuDetail } from "../queries";
import type { CreateMenuPayload, MenuItem } from "../types";
import { generateMenuCode } from "../utils/menu-code";
import { PermissionActionPicker } from "./permission-action-picker";

const MENU_TYPE_OPTIONS = [
  { value: "sidebar", label: "Sidebar", description: "Navigation link shown in the sidebar." },
  { value: "group", label: "Group", description: "Expandable module folder with child menus." },
] as const;

export interface MenuFormValues {
  parentId: string | null;
  code: string;
  menuName: string;
  description: string;
  routePath: string;
  module: string;
  menuType: "sidebar" | "group";
  icon: string;
  orderNumber: number;
  isVisible: boolean;
  isActive: boolean;
  openInNewTab: boolean;
  permissionActions: string[];
}

function defaultFormValues(defaultParentId?: string | null): MenuFormValues {
  return {
    parentId: defaultParentId ?? null,
    code: "",
    menuName: "",
    description: "",
    routePath: "",
    module: "",
    menuType: "sidebar",
    icon: "clipboard",
    orderNumber: 0,
    isVisible: true,
    isActive: true,
    openInNewTab: false,
    permissionActions: ["read"],
  };
}

function collectDescendantIds(id: string, items: MenuItem[]): Set<string> {
  const ids = new Set<string>();
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const item of items) {
      if (item.parentId === current && !ids.has(item.id)) {
        ids.add(item.id);
        queue.push(item.id);
      }
    }
  }

  return ids;
}

function buildParentOptions(menus: MenuItem[], excludeId?: string | null) {
  const exclude = new Set<string>();
  if (excludeId) {
    exclude.add(excludeId);
    for (const id of collectDescendantIds(excludeId, menus)) {
      exclude.add(id);
    }
  }

  return menus
    .filter((menu) => !exclude.has(menu.id))
    .sort(
      (a, b) =>
        a.level - b.level || a.orderNumber - b.orderNumber || a.menuName.localeCompare(b.menuName)
    )
    .map((menu) => ({
      id: menu.id,
      label: `${menu.level > 0 ? "— ".repeat(menu.level) : ""}${menu.menuName}`,
    }));
}

function toFormValues(detail: {
  parentId: string | null;
  code: string;
  menuName: string;
  description: string | null;
  routePath: string | null;
  module: string | null;
  menuType: string;
  icon: string | null;
  orderNumber: number;
  isVisible: boolean;
  isActive: boolean;
  openInNewTab: boolean;
  permissionContext: { actions?: string[] };
}): MenuFormValues {
  return {
    parentId: detail.parentId,
    code: detail.code,
    menuName: detail.menuName,
    description: detail.description ?? "",
    routePath: detail.routePath ?? "",
    module: detail.module ?? "",
    menuType: detail.menuType === "group" ? "group" : "sidebar",
    icon: detail.icon ?? "clipboard",
    orderNumber: detail.orderNumber,
    isVisible: detail.isVisible,
    isActive: detail.isActive,
    openInNewTab: detail.openInNewTab,
    permissionActions:
      detail.permissionContext?.actions && detail.permissionContext.actions.length > 0
        ? detail.permissionContext.actions
        : ["read"],
  };
}

function toPayload(values: MenuFormValues): CreateMenuPayload {
  return {
    parentId: values.parentId,
    code: values.code.trim(),
    menuName: values.menuName.trim(),
    description: values.description.trim() || undefined,
    routePath: values.routePath.trim() || undefined,
    module: values.module.trim() || undefined,
    menuType: values.menuType,
    icon: values.icon.trim() || undefined,
    orderNumber: values.orderNumber,
    isVisible: values.isVisible,
    isActive: values.isActive,
    openInNewTab: values.openInNewTab,
    permissionContext: {
      actions: values.permissionActions.length > 0 ? values.permissionActions : ["read"],
    },
  };
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200/70 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function IconSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const iconOptions = useMemo(
    () =>
      MENU_ICON_OPTIONS.map((icon) => ({
        value: icon,
        label: icon,
      })),
    []
  );

  const selectedIcon = MENU_ICON_OPTIONS.includes(value as NavIconName)
    ? (value as NavIconName)
    : "clipboard";

  return (
    <div className="space-y-2">
      <Combobox
        options={iconOptions}
        value={value || "clipboard"}
        onChange={onChange}
        placeholder="Select icon..."
        searchPlaceholder="Search icons..."
        emptyMessage="No icon found."
        className="h-9"
      />
      <div className="flex items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm">
          <AppSidebarNavIcon name={selectedIcon} className="h-4 w-4" isActive={false} />
        </span>
        <span className="font-mono text-xs text-gray-600">{selectedIcon}</span>
      </div>
    </div>
  );
}

interface MenuFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  menuId?: string | null;
  defaultParentId?: string | null;
  menus: MenuItem[];
  isSubmitting: boolean;
  onSubmit: (payload: CreateMenuPayload) => void;
}

export function MenuFormDialog({
  open,
  onOpenChange,
  mode,
  menuId,
  defaultParentId,
  menus,
  isSubmitting,
  onSubmit,
}: MenuFormDialogProps) {
  const [form, setForm] = useState<MenuFormValues>(() => defaultFormValues(defaultParentId));

  const { data: detailData, isLoading: detailLoading } = useMenuDetail(
    mode === "edit" && open && menuId ? menuId : null
  );

  const parentOptions = useMemo(
    () => buildParentOptions(menus, mode === "edit" ? menuId : null),
    [menus, mode, menuId]
  );

  const parentComboboxOptions = useMemo((): ComboboxOption[] => {
    const menuById = new Map(menus.map((menu) => [menu.id, menu]));
    const items: ComboboxOption[] = [
      { value: "root", label: "Root (no parent)", description: "Top-level menu" },
      ...parentOptions.map((option) => {
        const menu = menuById.get(option.id);
        return {
          value: option.id,
          label: option.label.trim() || menu?.menuName || option.id,
          description: menu?.code,
        };
      }),
    ];

    if (form.parentId && !items.some((item) => item.value === form.parentId)) {
      const parent = menus.find((menu) => menu.id === form.parentId);
      if (parent) {
        items.push({
          value: parent.id,
          label: `${parent.level > 0 ? "— ".repeat(parent.level) : ""}${parent.menuName}`.trim(),
          description: parent.code,
        });
      }
    }

    return items;
  }, [parentOptions, form.parentId, menus]);

  const existingCodes = useMemo(() => new Set(menus.map((menu) => menu.code)), [menus]);

  const generatedCode = useMemo(() => {
    if (mode === "edit") return form.code;

    return generateMenuCode({
      menuName: form.menuName,
      module: form.module,
      routePath: form.routePath,
      parentId: form.parentId,
      menus,
      existingCodes,
    });
  }, [
    mode,
    form.code,
    form.menuName,
    form.module,
    form.routePath,
    form.parentId,
    menus,
    existingCodes,
  ]);

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      setForm(defaultFormValues(defaultParentId));
    }
  }, [open, mode, defaultParentId]);

  useEffect(() => {
    if (!open || mode !== "edit" || !detailData) return;
    setForm(toFormValues(detailData));
  }, [open, mode, detailData]);

  useEffect(() => {
    if (mode !== "create" || !open) return;
    setForm((prev) => (prev.code === generatedCode ? prev : { ...prev, code: generatedCode }));
  }, [generatedCode, mode, open]);

  useEffect(() => {
    if (mode !== "create" || !form.parentId) return;

    const parent = menus.find((menu) => menu.id === form.parentId);
    if (parent?.module && !form.module) {
      setForm((prev) => ({ ...prev, module: parent.module ?? "" }));
    }
  }, [form.parentId, form.module, mode, menus]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!form.menuName.trim()) return;

    const payload = toPayload({
      ...form,
      code: mode === "create" ? generatedCode : form.code,
    });

    onSubmit(payload);
  }

  const isEditLoading = mode === "edit" && detailLoading;
  const displayCode = mode === "create" ? generatedCode : form.code;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPanel size="md" style={{ "--dialog-panel-max-height": "92vh" } as CSSProperties}>
        <DialogPanelHeader>
          <DialogPanelTitle>{mode === "edit" ? "Edit Menu" : "Add Menu"}</DialogPanelTitle>
          <DialogPanelDescription>
            {mode === "edit"
              ? "Update IAM sidebar menu configuration"
              : "Add a new menu to the sidebar hierarchy"}
          </DialogPanelDescription>
        </DialogPanelHeader>

        {isEditLoading ? (
          <DialogPanelBody className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
          </DialogPanelBody>
        ) : (
          <DialogPanelForm onSubmit={handleSubmit}>
            <DialogPanelBody className="space-y-4 bg-gray-50/40">
              <FormSection
                title="Basic Information"
                description="Menu code is generated automatically by the system."
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="menu-parent">Parent Menu</Label>
                    <Combobox
                      options={parentComboboxOptions}
                      value={form.parentId ?? "root"}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          parentId: !value || value === "root" ? null : value,
                        }))
                      }
                      placeholder="Root (no parent)"
                      searchPlaceholder="Search parent menu..."
                      emptyMessage="No parent menu found."
                      className="h-9 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Code</Label>
                    <div className="rounded-lg border border-gray-200/70 bg-gray-50/80 px-3 py-2.5">
                      <p className="font-mono text-sm text-gray-900">
                        {displayCode || "—"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {mode === "create"
                          ? "Auto-generated from parent, module, route, and menu name."
                          : "System code cannot be changed after creation."}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="menu-name">
                        Menu Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="menu-name"
                        value={form.menuName}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, menuName: e.target.value }))
                        }
                        placeholder="Menu Management"
                        required
                        className="h-9 bg-white text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="menu-type">Menu Type</Label>
                      <Select
                        value={form.menuType}
                        onValueChange={(value) =>
                          setForm((prev) => ({
                            ...prev,
                            menuType: value as MenuFormValues["menuType"],
                          }))
                        }
                      >
                        <SelectTrigger id="menu-type" className="h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MENU_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {
                          MENU_TYPE_OPTIONS.find((option) => option.value === form.menuType)
                            ?.description
                        }
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="menu-order">Order</Label>
                      <Input
                        id="menu-order"
                        type="number"
                        min={0}
                        value={form.orderNumber}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            orderNumber: Number(e.target.value) || 0,
                          }))
                        }
                        className="h-9 bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Route & Module">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="menu-route">URL Path</Label>
                    <Input
                      id="menu-route"
                      value={form.routePath}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, routePath: e.target.value }))
                      }
                      placeholder="/dashboard/settings/menus"
                      className="h-9 bg-white font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="menu-module">Module</Label>
                    <Input
                      id="menu-module"
                      value={form.module}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, module: e.target.value }))
                      }
                      placeholder="settings"
                      className="h-9 bg-white text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="menu-icon">Icon</Label>
                    <IconSelect
                      value={form.icon}
                      onChange={(icon) => setForm((prev) => ({ ...prev, icon }))}
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Permission Actions"
                description="Pick suggested actions or add custom ones such as approval, import, or reconcile."
              >
                <PermissionActionPicker
                  value={form.permissionActions}
                  onChange={(permissionActions) =>
                    setForm((prev) => ({ ...prev, permissionActions }))
                  }
                />
              </FormSection>

              <FormSection title="Description">
                <Textarea
                  id="menu-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional description for this menu..."
                  rows={3}
                  className="min-h-20 resize-none border-gray-200/70 bg-white text-sm focus-visible:ring-1 focus-visible:ring-gray-200"
                />
              </FormSection>

              <FormSection title="Status">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200/70 bg-white px-3 py-2.5">
                    <Label htmlFor="menu-active" className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id="menu-active"
                      checked={form.isActive}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200/70 bg-white px-3 py-2.5">
                    <Label htmlFor="menu-visible" className="text-sm">
                      Visible
                    </Label>
                    <Switch
                      id="menu-visible"
                      checked={form.isVisible}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, isVisible: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200/70 bg-white px-3 py-2.5">
                    <Label htmlFor="menu-new-tab" className="text-sm">
                      New Tab
                    </Label>
                    <Switch
                      id="menu-new-tab"
                      checked={form.openInNewTab}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, openInNewTab: checked }))
                      }
                    />
                  </div>
                </div>
              </FormSection>
            </DialogPanelBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isEditLoading || !form.menuName.trim()}
                className="bg-pink-600 text-white hover:bg-pink-700"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogPanelForm>
        )}
      </DialogPanel>
    </Dialog>
  );
}
