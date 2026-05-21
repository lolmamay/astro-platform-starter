import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Booking = {
    id: string;
    date: string;
    time: string;
    timezone: string | null;
    location: string | null;
    name: string;
    email: string;
    phone: string | null;
    session_type: string | null;
    created_at: string;
};

type AuthState = 'checking' | 'logged-out' | 'logged-in';

export default function AdminDashboard() {
    const [authState, setAuthState] = useState<AuthState>('checking');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [rescheduling, setRescheduling] = useState<Booking | null>(null);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [rescheduleLoading, setRescheduleLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setAuthState(data.session ? 'logged-in' : 'logged-out');
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setAuthState(session ? 'logged-in' : 'logged-out');
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (authState === 'logged-in') loadBookings();
    }, [authState]);

    async function loadBookings() {
        setLoading(true);
        let q = supabase.from('bookings').select('*').order('date', { ascending: true });
        if (dateFrom) q = q.gte('date', dateFrom);
        if (dateTo) q = q.lte('date', dateTo);
        const { data } = await q;
        setBookings(data ?? []);
        setLoading(false);
    }

    async function login() {
        setLoggingIn(true);
        setLoginError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoggingIn(false);
        if (error) setLoginError('Invalid login credentials. Check your email and password.');
    }

    async function logout() {
        await supabase.auth.signOut();
    }

    async function handleReschedule() {
        if (!rescheduling || !newDate || !newTime) return;
        setRescheduleLoading(true);
        await supabase.from('bookings').update({ date: newDate, time: newTime }).eq('id', rescheduling.id);
        setRescheduling(null);
        setRescheduleLoading(false);
        loadBookings();
    }

    async function handleDelete(id: string) {
        await supabase.from('bookings').delete().eq('id', id);
        setDeletingId(null);
        loadBookings();
    }

    function exportCSV() {
        const rows = [
            ['Date', 'Time', 'Timezone', 'Name', 'Email', 'Phone', 'Location', 'Type', 'Booked At'],
            ...filtered.map(b => [b.date, b.time, b.timezone ?? '', b.name, b.email, b.phone ?? '', b.location ?? '', b.session_type ?? '', b.created_at]),
        ];
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click();
        URL.revokeObjectURL(url);
    }

    const filtered = bookings.filter(b =>
        !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.email.toLowerCase().includes(search.toLowerCase())
    );

    if (authState === 'checking') {
        return <div className="py-20 text-center text-ink-muted">Loading...</div>;
    }

    if (authState === 'logged-out') {
        return (
            <div className="max-w-sm mx-auto py-16 px-6">
                <div className="bg-white rounded-2xl border border-parchment shadow-sm p-10 text-center">
                    <div className="text-5xl mb-4">🔐</div>
                    <h2 className="font-display text-2xl text-ink mb-1">Admin Login</h2>
                    <p className="text-ink-muted text-sm mb-8">Hello by Hand team access only</p>
                    <div className="space-y-4 text-left">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="admin-email">Admin email</label>
                            <input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className="input" onKeyDown={(e) => e.key === 'Enter' && login()} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="admin-password">Password</label>
                            <input id="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" onKeyDown={(e) => e.key === 'Enter' && login()} />
                        </div>
                    </div>
                    {loginError && <p className="text-red-600 text-sm mt-3 text-left">{loginError}</p>}
                    <button onClick={login} disabled={loggingIn || !email || !password} className="btn btn-lg w-full mt-6">
                        {loggingIn ? 'Signing in...' : 'Sign In'}
                    </button>
                    <p className="text-xs text-ink-muted mt-6">Admins are set up in Supabase Auth. See README for instructions.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-8">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h2 className="font-display text-2xl text-ink">Bookings Dashboard</h2>
                    <p className="text-ink-muted text-sm">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={exportCSV} className="btn btn-outline text-sm" style={{ '--btn-py': '0.5rem', '--btn-px': '1rem' } as React.CSSProperties}>⬇ Export CSV</button>
                    <button onClick={logout} className="text-sm text-ink-muted hover:text-brand-blue transition-colors">Sign out</button>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-parchment p-4 mb-6 flex flex-wrap gap-3">
                <input type="text" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1 min-w-48" style={{ padding: '0.5rem 0.875rem' }} />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-auto" style={{ padding: '0.5rem 0.875rem' }} />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-auto" style={{ padding: '0.5rem 0.875rem' }} />
                <button onClick={loadBookings} className="btn text-sm" style={{ '--btn-py': '0.5rem', '--btn-px': '1rem' } as React.CSSProperties}>Filter</button>
            </div>
            {loading ? (
                <div className="text-center py-12 text-ink-muted">Loading bookings...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-ink-muted bg-white rounded-2xl border border-parchment">No bookings found.</div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((b) => (
                        <div key={b.id} className="bg-white rounded-xl border border-parchment p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="shrink-0 text-center">
                                <div className="bg-brand-pink text-white rounded-lg py-2 px-3 inline-block">
                                    <div className="text-xs font-semibold uppercase">{b.date.split('-')[1] ? new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }) : ''}</div>
                                    <div className="font-display text-xl font-bold">{b.date.split('-')[2]}</div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-ink">{b.name}</p>
                                <p className="text-sm text-ink-muted">{b.email}{b.phone ? ` · ${b.phone}` : ''}</p>
                                <p className="text-sm text-ink-muted mt-0.5">{b.time}{b.timezone ? ` (${b.timezone.split('/').pop()?.replace('_', ' ')})` : ''} · {b.location}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button onClick={() => { setRescheduling(b); setNewDate(b.date); setNewTime(b.time); }} className="text-sm text-brand-blue hover:underline">✏️ Reschedule</button>
                                <button onClick={() => setDeletingId(b.id)} className="text-sm text-red-500 hover:underline ml-2">🗑 Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {rescheduling && (
                <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-2xl border border-parchment shadow-xl p-8 w-full max-w-sm">
                        <h3 className="font-display text-xl text-ink mb-1">Reschedule</h3>
                        <p className="text-ink-muted text-sm mb-6">For {rescheduling.name}</p>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-ink mb-1.5">New date</label><input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input" /></div>
                            <div><label className="block text-sm font-medium text-ink mb-1.5">New time</label><input type="text" value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder="e.g. 2:00 PM" className="input" /></div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleReschedule} disabled={rescheduleLoading} className="btn flex-1">{rescheduleLoading ? 'Saving...' : 'Save'}</button>
                            <button onClick={() => setRescheduling(null)} className="btn btn-outline flex-1">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {deletingId && (
                <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-2xl border border-parchment shadow-xl p-8 w-full max-w-sm text-center">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h3 className="font-display text-xl text-ink mb-2">Delete this booking?</h3>
                        <p className="text-ink-muted text-sm mb-6">This can't be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => handleDelete(deletingId)} className="btn flex-1 bg-red-500 hover:bg-red-600">Delete</button>
                            <button onClick={() => setDeletingId(null)} className="btn btn-outline flex-1">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
