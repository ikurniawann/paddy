"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  JobStatus,
  JobPositionOption as PositionOption,
  JobOpening,
} from "../types";
import { useJobOpenings, useJobBrands, useJobPositions, useJobDepartments } from "../queries";
import { useSaveJobOpening, useDeleteJobOpening } from "../mutations";

type JobForm = {
  id?: string;
  position_id: string;
  brand_id: string;
  department_id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  employment_type: string;
  work_mode: string;
  headcount: number;
  description: string;
  requirements: string;
  benefits: string;
  status: JobStatus;
  closing_date: string;
};

const emptyForm: JobForm = {
  position_id: "",
  brand_id: "",
  department_id: "",
  title: "",
  slug: "",
  department: "Operations",
  location: "Jakarta, ID",
  employment_type: "Full-time",
  work_mode: "On-site",
  headcount: 1,
  description: "",
  requirements: "",
  benefits: "",
  status: "draft",
  closing_date: "",
};

const statusMeta: Record<JobStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-red-100 text-red-700",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function JobPortalPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<JobStatus | "all">("all");

  const jobsQuery = useJobOpenings();
  const brandsQuery = useJobBrands();
  const positionsQuery = useJobPositions();
  const departmentsQuery = useJobDepartments();

  const jobs = jobsQuery.data ?? [];
  const brands = brandsQuery.data ?? [];
  const positions = positionsQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const loading = jobsQuery.isLoading;

  const saveMutation = useSaveJobOpening();
  const deleteMutation = useDeleteJobOpening();
  const saving = saveMutation.isPending;

  const filteredJobs = useMemo(() => {
    if (filterStatus === "all") return jobs;
    return jobs.filter((job) => job.status === filterStatus);
  }, [filterStatus, jobs]);

  const publishedCount = jobs.filter((job) => job.status === "published").length;
  const draftCount = jobs.filter((job) => job.status === "draft").length;
  const closedCount = jobs.filter((job) => job.status === "closed").length;

  function openCreateDialog() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(job: JobOpening) {
    setForm({
      id: job.id,
      position_id: job.position_id || "",
      brand_id: job.brand_id || "",
      department_id: job.department_id || "",
      title: job.title,
      slug: job.slug,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      work_mode: job.work_mode,
      headcount: job.headcount,
      description: job.description || "",
      requirements: job.requirements || "",
      benefits: job.benefits || "",
      status: job.status,
      closing_date: job.closing_date || "",
    });
    setDialogOpen(true);
  }

  function updateField<K extends keyof JobForm>(key: K, value: JobForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handlePositionChange(positionId: string) {
    const position = positions.find((item) => item.id === positionId);
    const matchedDepartment = departments.find(
      (department) => department.name.toLowerCase() === (position?.department || "").toLowerCase()
    );

    setForm((current) => ({
      ...current,
      position_id: positionId,
      title: current.title || position?.title || "",
      slug: current.slug || slugify(position?.title || ""),
      department_id: matchedDepartment?.id || current.department_id,
      department: matchedDepartment?.name || current.department || position?.department || "Operations",
    }));
  }

  async function handleSave() {
    setError(null);

    const { id, ...rest } = form;
    const payload = {
      ...rest,
      slug: form.slug || slugify(form.title),
      position_id: form.position_id || null,
      brand_id: form.brand_id || null,
      department_id: form.department_id || null,
      closing_date: form.closing_date || null,
    };

    try {
      await saveMutation.mutateAsync({ payload, id });
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan lowongan");
    }
  }

  async function handleDelete(job: JobOpening) {
    const confirmed = window.confirm(`Hapus lowongan "${job.title}"?`);
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus lowongan");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Portal</h1>
          <p className="mt-1 text-sm text-gray-500">
            Atur lowongan yang tampil di halaman career publik.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/career"
            target="_blank"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview Career
          </Link>
          <Button onClick={openCreateDialog} className="h-9 bg-pink-600 text-white hover:bg-pink-700">
            <Plus className="h-4 w-4" />
            Tambah Lowongan
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Total Lowongan" value={jobs.length} />
        <SummaryCard label="Published" value={publishedCount} />
        <SummaryCard label="Draft" value={draftCount} />
        <SummaryCard label="Closed" value={closedCount} />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value as JobStatus | "all")}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="all">Semua</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span>Lowongan</span>
          <span>Brand / Posisi</span>
          <span>Lokasi</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat lowongan...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Belum ada lowongan untuk filter ini.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="grid grid-cols-1 gap-3 border-b border-gray-100 px-4 py-4 last:border-0 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] md:items-center"
            >
              <div>
                <div className="font-semibold text-gray-900">{job.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.department_ref?.name || job.department}
                  </span>
                  <span>{job.employment_type}</span>
                  <span>{job.work_mode}</span>
                  <span>{job.headcount} orang</span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <div>{job.brand?.name || "Semua Brand"}</div>
                <div className="text-xs text-gray-400">{job.position?.title || "Tanpa master posisi"}</div>
              </div>
              <div className="inline-flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                {job.location}
              </div>
              <div className="space-y-1">
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusMeta[job.status]}`}>
                  {job.status}
                </span>
                {job.closing_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {job.closing_date}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(job)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(job)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {form.id ? "Edit Lowongan" : "Tambah Lowongan"}
              </h2>
              <p className="text-sm text-gray-500">Data published akan tampil di halaman /career.</p>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              <FormField label="Master Posisi">
                <select
                  value={form.position_id}
                  onChange={(event) => handlePositionChange(event.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">Pilih posisi</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Brand / Outlet">
                <select
                  value={form.brand_id}
                  onChange={(event) => updateField("brand_id", event.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">Semua brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Judul Lowongan">
                <Input
                  value={form.title}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      title: value,
                      slug: current.slug ? current.slug : slugify(value),
                    }));
                  }}
                />
              </FormField>

              <FormField label="Slug">
                <Input value={form.slug} onChange={(event) => updateField("slug", slugify(event.target.value))} />
              </FormField>

              <FormField label="Department">
                <select
                  value={form.department_id}
                  onChange={(event) => {
                    const department = departments.find((item) => item.id === event.target.value);
                    setForm((current) => ({
                      ...current,
                      department_id: event.target.value,
                      department: department?.name || "",
                    }));
                  }}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="">Pilih department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Lokasi">
                <Input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
              </FormField>

              <FormField label="Employment Type">
                <select
                  value={form.employment_type}
                  onChange={(event) => updateField("employment_type", event.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </FormField>

              <FormField label="Work Mode">
                <select
                  value={form.work_mode}
                  onChange={(event) => updateField("work_mode", event.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option>On-site</option>
                  <option>Hybrid</option>
                  <option>Remote</option>
                </select>
              </FormField>

              <FormField label="Headcount">
                <Input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(event) => updateField("headcount", Number(event.target.value || 1))}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value as JobStatus)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </FormField>

              <FormField label="Closing Date">
                <Input
                  type="date"
                  value={form.closing_date}
                  onChange={(event) => updateField("closing_date", event.target.value)}
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Deskripsi">
                  <Textarea
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    rows={4}
                  />
                </FormField>
              </div>

              <div className="md:col-span-2">
                <FormField label="Requirements">
                  <Textarea
                    value={form.requirements}
                    onChange={(event) => updateField("requirements", event.target.value)}
                    rows={4}
                  />
                </FormField>
              </div>

              <div className="md:col-span-2">
                <FormField label="Benefits">
                  <Textarea
                    value={form.benefits}
                    onChange={(event) => updateField("benefits", event.target.value)}
                    rows={3}
                  />
                </FormField>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-pink-600 text-white hover:bg-pink-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
