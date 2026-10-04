"use client";

import { usePathname } from "next/navigation";
import { BreadcrumbItem, PURCHASING_ROUTES } from "../../config";

/** Hook: build breadcrumbs for the current router pathname */
export function usePurchasingBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();
  return buildBreadcrumbs(PURCHASING_ROUTES, pathname);
}

// ─── Internal breadcrumb builder ─────────────────────────────────────────────

function buildBreadcrumbs(
  group: typeof PURCHASING_ROUTES,
  pathname: string
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: group.groupLabel, href: `${group.basePath}` },
  ];

  // Walk all routes (including children)
  function findItem(items: typeof group.routes, pathParts: string[]): { item: any; depth: number } | null {
    for (const route of items) {
      const fullPath = route.path;
      // Handle dynamic segments like [id]
      const routeParts = fullPath.split("/");
      const match = pathParts.length >= routeParts.length &&
        pathParts.every((p, i) => routeParts[i] === p || routeParts[i].startsWith("["));
      if (match) {
        return { item: route, depth: pathParts.length - routeParts.length };
      }
      if (route.children) {
        const subPath = pathParts.slice(1); // strip "purchasing"
        const found = findItem(route.children as any, subPath);
        if (found) return { item: found.item, depth: found.depth + 1 };
      }
    }
    return null;
  }

  // Extract path after /dashboard/purchasing/
  const afterPrefix = pathname.replace(/^\/dashboard\/purchasing\/?/, "");
  if (!afterPrefix) return crumbs;

  const pathParts = afterPrefix.split("/");

  // Try top-level routes first
  let found = findItem(group.routes as any, pathParts);

  // If not found at top level, search children
  if (!found) {
    for (const route of group.routes as any) {
      if (route.children) {
        const childFound = findItem(route.children, pathParts);
        if (childFound) {
          found = { item: childFound.item, depth: childFound.depth + 1 };
          // Add parent crumb
          crumbs.push({ label: route.label, href: `${group.basePath}/${route.path}` });
          break;
        }
      }
    }
  }

  if (found) {
    crumbs.push({ label: found.item.label });
  }

  return crumbs;
}
