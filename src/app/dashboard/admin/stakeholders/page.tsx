'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface StakeholderRow {
  id: string;
  reference: string;
  name: string;
  stakeholder_type_id: string;
  email: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
}

interface ListResponse {
  data: StakeholderRow[];
  count: number;
}

const PAGE_SIZE = 50;

export default function StakeholdersRegistryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StakeholderRow[]>([]);
  const [count, setCount] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    if (verified) sp.set('verified', verified);
    if (sort) sp.set('sort', sort);
    if (order) sp.set('order', order);
    sp.set('page', String(page));
    sp.set('pageSize', String(PAGE_SIZE));
    return sp.toString();
  }, [q, status, verified, sort, order, page]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const res = await fetch(`/api/stakeholders?${params}`, {
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        });
        const json: ListResponse = await res.json();
        if (!ignore) {
          setRows(json.data || []);
          setCount(json.count || 0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (user) load();
    return () => { ignore = true; };
  }, [params, user]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (authLoading || !user) return null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Stakeholder Registry</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/admin" className="px-4 py-2 bg-section-subtle border border-section-border rounded-lg">Admin</Link>
          <Link href="/dashboard/admin/stakeholders/create" className="px-4 py-2 bg-accent-primary text-white rounded-lg">Create</Link>
        </div>
      </div>

      <div className="grid gap-3 mb-4 md:grid-cols-4">
        <input className="px-3 py-2 bg-section-subtle border border-section-border rounded"
               placeholder="Search name or email"
               value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="px-3 py-2 bg-section-subtle border border-section-border rounded"
                value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="inactive">inactive</option>
          <option value="suspended">suspended</option>
        </select>
        <select className="px-3 py-2 bg-section-subtle border border-section-border rounded"
                value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }}>
          <option value="">Verified: any</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <div className="flex gap-2">
          <select className="flex-1 px-3 py-2 bg-section-subtle border border-section-border rounded"
                  value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="created_at">created_at</option>
            <option value="name">name</option>
            <option value="status">status</option>
          </select>
          <select className="px-3 py-2 bg-section-subtle border border-section-border rounded"
                  value={order} onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </div>
      </div>

      <div className="bg-section-light border border-section-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-section-subtle">
            <tr>
              <th className="text-left p-3 border-b border-section-border">Reference</th>
              <th className="text-left p-3 border-b border-section-border">Name</th>
              <th className="text-left p-3 border-b border-section-border">Email</th>
              <th className="text-left p-3 border-b border-section-border">Status</th>
              <th className="text-left p-3 border-b border-section-border">Verified</th>
              <th className="text-left p-3 border-b border-section-border">Created</th>
              <th className="text-left p-3 border-b border-section-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-brand-text-muted">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-brand-text-muted">No stakeholders found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-section-subtle/50">
                <td className="p-3 border-b border-section-border">{r.reference}</td>
                <td className="p-3 border-b border-section-border">{r.name}</td>
                <td className="p-3 border-b border-section-border">{r.email || '-'}</td>
                <td className="p-3 border-b border-section-border">{r.status}</td>
                <td className="p-3 border-b border-section-border">{r.is_verified ? 'Yes' : 'No'}</td>
                <td className="p-3 border-b border-section-border">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-3 border-b border-section-border">
                  <div className="flex gap-2 flex-wrap">
                    <Link className="px-2 py-1 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition"
                          href={`/dashboard/admin/stakeholders/${r.id}/view`}>View</Link>
                    <Link className="px-2 py-1 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition"
                          href={`/dashboard/admin/stakeholders/${r.id}/edit`}>Edit</Link>
                    <Link className="px-2 py-1 bg-section-subtle border border-section-border rounded hover:bg-section-emphasis transition"
                          href={`/dashboard/admin/stakeholders/${r.id}/roles`}>Roles</Link>
                    <Link className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded hover:bg-blue-200 transition"
                          href={`/dashboard/admin/stakeholders/${r.id}/relationships`}>Relationships</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div>Showing {(rows.length ? (page - 1) * PAGE_SIZE + 1 : 0)}–{(page - 1) * PAGE_SIZE + rows.length} of {count}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 bg-section-subtle border border-section-border rounded disabled:opacity-50">Prev</button>
          <span className="px-2 py-1">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-section-subtle border border-section-border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}


