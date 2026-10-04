"use client";

import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Package, Truck, Users, DollarSign, FileText } from "lucide-react";

export function TestActivityLogPage() {
  const logger = useActivityLogger();

  const testActivities = [
    {
      label: "Create PO",
      icon: FileText,
      action: () => logger.createPO("PO Created", "PO-TEST-001", { supplier: "PT Test Supplier", total: 5000000 }),
      color: "bg-blue-500",
    },
    {
      label: "Update PO Status",
      icon: FileText,
      action: () => logger.statusChangePO("PO Status Changed", "Draft", "Sent", "PO-TEST-001"),
      color: "bg-orange-500",
    },
    {
      label: "Create GRN",
      icon: Truck,
      action: () => logger.createGRN("GRN Created", "GRN-TEST-001", { po: "PO-TEST-001", items: 5 }),
      color: "bg-green-500",
    },
    {
      label: "GRN Received",
      icon: Truck,
      action: () => logger.statusChangeGRN("GRN Received", "Pending", "Received", "GRN-TEST-001"),
      color: "bg-purple-500",
    },
    {
      label: "Create Supplier",
      icon: Users,
      action: () => logger.createSupplier("New Supplier Added", "SUP-TEST-001", { city: "Jakarta", pic: "John Doe" }),
      color: "bg-indigo-500",
    },
    {
      label: "Update Supplier",
      icon: Users,
      action: () => logger.updateSupplier("Supplier Updated", "SUP-TEST-001", "Contact information updated"),
      color: "bg-cyan-500",
    },
    {
      label: "Create Raw Material",
      icon: Package,
      action: () => logger.createRawMaterial("Raw Material Created", "BHN-TEST-001", { name: "Test Material", category: "BAHAN_PANGAN" }),
      color: "bg-emerald-500",
    },
    {
      label: "Create Product",
      icon: Package,
      action: () => logger.createProduct("Product Created", "PRD-TEST-001", { name: "Test Product", price: 25000 }),
      color: "bg-teal-500",
    },
    {
      label: "Create Price List",
      icon: DollarSign,
      action: () => logger.createPriceList("Price List Created", "PL-TEST-001", { supplier: "PT Test", material: "Gula Pasir" }),
      color: "bg-yellow-500",
    },
    {
      label: "Approve PO",
      icon: FileText,
      action: () => logger.logApprove("PO", "PO Approved", undefined, "PO-TEST-001", { approvedBy: "Manager" }),
      color: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Bell className="w-8 h-8 text-pink-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log - Test Page</h1>
          <p className="text-sm text-gray-500">Click buttons below to test activity logging</p>
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📋 How to Test</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>1. Click any button below to create an activity log</p>
          <p>2. Look at the <strong>🔔 bell icon</strong> in the header (top right)</p>
          <p>3. Click the bell to see your activity notifications</p>
          <p>4. Activities are saved in <strong>localStorage</strong> (persistent)</p>
          <p>5. Unread count will increase with each new activity</p>
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testActivities.map((test, index) => {
          const Icon = test.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <Button
                  onClick={test.action}
                  className="w-full justify-start gap-2 h-auto py-3 px-4"
                  variant="outline"
                >
                  <div className={`w-8 h-8 rounded-full ${test.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{test.label}</span>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Activity Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-600">10</p>
              <p className="text-xs text-gray-500">Test Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">6</p>
              <p className="text-xs text-gray-500">Modules</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">∞</p>
              <p className="text-xs text-gray-500">Possibilities</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🔧 Integration Example</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-mono bg-gray-100 p-3 rounded">
            {`// In your component
const logger = useActivityLogger();

// After successful CRUD operation
await createPO(data);
logger.createPO('PO Created', poNumber, { total: totalPrice });`}
          </p>
          <p className="text-gray-600">
            This will automatically log the activity and show notification in the bell icon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
