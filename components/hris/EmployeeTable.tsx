'use client';

import { useState, useEffect } from 'react';
import { Employee, PaginatedResponse } from '@/../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_STATUS_COLORS,
} from '@/../types/hris';

interface EmployeeTableProps {
  initialData?: PaginatedResponse<Employee>;
}

export function EmployeeTable({ initialData }: EmployeeTableProps) {
  const [employees, setEmployees] = useState<Employee[]>(
    initialData?.data || []
  );
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [isActive, setIsActive] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (departmentId) params.set('department_id', departmentId);
      if (employmentStatus) params.set('employment_status', employmentStatus);
      if (isActive) params.set('is_active', isActive);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const response = await fetch(`/api/hris/employees?${params}`);
      const result = await response.json();

      if (result.data) {
        setEmployees(result.data);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(debounce);
  }, [search, departmentId, employmentStatus, isActive, page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Cari nama, email, atau NIP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={isActive} onValueChange={setIsActive}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Aktif/Non-Aktif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Non-Aktif</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="ml-auto">
          Total: {total} karyawan
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NIP</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Departemen</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal Bergabung</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Belum ada data karyawan
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-mono text-sm">
                    {employee.nip}
                  </TableCell>
                  <TableCell className="font-medium">
                    {employee.full_name}
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>
                    {employee.department?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {employee.job_title?.title || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={EMPLOYMENT_STATUS_COLORS[employee.employment_status]}
                    >
                      {EMPLOYMENT_STATUS_LABELS[employee.employment_status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(employee.join_date).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/dashboard/employees/${employee.id}`}>
                        Detail
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Halaman {page} dari {totalPages} ({total} total)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
