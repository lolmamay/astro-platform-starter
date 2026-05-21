import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TIME_SLOTS = [
    '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '5:00 PM',
];

const TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (no DST)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'America/Halifax', label: 'Atlantic Time (AT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central Europe (CET)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'UTC', label: 'UTC / GMT' },
];

const MAX_BOOKINGS_PER_DAY = 10;
const MONTHS_AHEAD = 2;

type Step = 'date' | 'time' | 'details' | 'confirm' | 'success';

interface BookingData {
    date: string;
    time: string;
    timezone: string;
    location: string;
    name: string;
    email: string;
    phone: string;
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function BookingFlow() {
    const today = new Date();
    const [step, setStep] = useState<Step>('date');
    const [calYear, setCalYear] = useState(today.getFullYear());
    const [calMonth, setCalMonth] = useState(today.getMonth());
    const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
    const [booking, setBooking] = useState<BookingData>({
        date: '', time: '', timezone: TIMEZONES[0].value,
        location: '', name: '', email: '', phone: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadCounts() {
            const from = formatDate(calYear, calMonth, 1);
            const to = formatDate(calYear, calMonth, getDaysInMonth(calYear, calMonth));
            const { data } = await supabase
                .from('bookings')
                .select('date')
                .gte('date', from)
                .lte('date', to);
            if (data) {
                const counts: Record<string, number> = {};
                data.forEach(({ date }) => { counts[date] = (counts[date] ?? 0) + 1; });
                setBookingCounts(counts);
            }
        }
        loadCounts();
    }, [calYear, calMonth]);

    const maxMonth = today.getMonth() + MONTHS_AHEAD;
    const maxYear = today.getFullYear() + Math.floor(maxMonth / 12);
    const clampedMaxMonth = maxMonth % 12;

    function prevMonth() {
        if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
        else setCalMonth(calMonth - 1);
    }

    function nextMonth() {
        if (calYear > maxYear || (calYear === maxYear && calMonth >= clampedMaxMonth)) return;
        if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
        else setCalMonth(calMonth + 1);
    }

    function isPast(year: number, month: number, day: number) {
        const d = new Date(year, month, day);
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return d < t;
    }

    function isFull(dateStr: string) {
        return (bookingCounts[dateStr] ?? 0) >= MAX_BOOKINGS_PER_DAY;
    }

    function getDayStatus(year: number, month: number, day: number) {
        const dateStr = formatDate(year, month, day);
        const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
        if (isPast(year, month, day)) return 'past';
        if (isFull(dateStr)) return 'full';
        if (isToday) return 'today';
        const count = bookingCounts[dateStr] ?? 0;
        if (count > 0) return 'some';
        return 'available';
    }

    async function handleSubmit() {
        setSubmitting(true);
        setError('');
        const { error: err } = await supabase.from('bookings').insert([{
            date: booking.date,
            time: booking.time,
            timezone: booking.timezone,
            location: booking.location,
            name: booking.name,
            email: booking.email,
            phone: booking.phone || null,
            session_type: 'meetup',
        }]);
        setSubmitting(false);
        if (err) {
            setError('Something went wrong. Please try again or email us directly.');
        } else {
            setStep('success');
        }
    }

    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);

    if (step === 'success') {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-6">💌</div>
                <h2 className="font-display text-3xl text-ink mb-3">You're booked!</h2>
                <p className="text-ink-muted max-w-sm mx-auto leading-relaxed mb-2">
                    Your card-making meetup is confirmed for <strong>{formatDisplayDate(booking.date)}</strong> at <strong>{booking.time}</strong>.
                </p>
                <p className="text-ink-muted max-w-sm mx-auto leading-relaxed mb-8">
                    We'll be in touch at <strong>{booking.email}</strong> with more details.
                </p>
                <a href="/" className="btn btn-lg">Back to Home</a>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-10 justify-center">
                {(['date', 'time', 'details', 'confirm'] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                            s === step ? 'bg-brand-blue text-white' :
                            (['date', 'time', 'details', 'confirm'] as Step[]).indexOf(step) > i ? 'bg-brand-blue/20 text-brand-blue' :
                            'bg-parchment text-ink-muted'
                        }`}>
                            {i + 1}
                        </div>
                        {i < 3 && <div className="w-8 h-px bg-parchment" />}
                    </div>
                ))}
            </div>

            {step === 'date' && (
                <div>
                    <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-5 mb-8 flex gap-3">
                        <span className="text-xl">🌷</span>
                        <p className="text-sm text-ink-muted leading-relaxed">
                            Choose a date to host your card-making meetup. Add your venue so attendees know where to go!
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-ink-muted mb-5">
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-parchment inline-block bg-white" /> Available</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded inline-block bg-brand-blue" /> Today</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded inline-block bg-teal-100" /> Some bookings</span>
                        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-parchment inline-block bg-cream-dark opacity-60" /> Full</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-parchment shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={prevMonth}
                                disabled={calYear === today.getFullYear() && calMonth <= today.getMonth()}
                                className="w-9 h-9 rounded-full border border-parchment flex items-center justify-center text-ink-muted hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-30"
                            >
                                ←
                            </button>
                            <span className="font-display font-semibold text-ink">{MONTH_NAMES[calMonth]} {calYear}</span>
                            <button
                                onClick={nextMonth}
                                disabled={calYear === maxYear && calMonth >= clampedMaxMonth}
                                className="w-9 h-9 rounded-full border border-parchment flex items-center justify-center text-ink-muted hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-30"
                            >
                                →
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DAY_NAMES.map((d) => (
                                <div key={d} className="text-center text-xs font-semibold text-ink-muted py-1">{d}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const dateStr = formatDate(calYear, calMonth, day);
                                const status = getDayStatus(calYear, calMonth, day);
                                const selected = booking.date === dateStr;

                                return (
                                    <button
                                        key={day}
                                        onClick={() => { if (status !== 'past' && status !== 'full') { setBooking({ ...booking, date: dateStr }); setStep('time'); } }}
                                        disabled={status === 'past' || status === 'full'}
                                        className={`rounded-lg py-2 text-sm font-medium transition-all ${
                                            selected ? 'bg-brand-pink text-white' :
                                            status === 'today' ? 'bg-brand-blue text-white' :
                                            status === 'some' ? 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100' :
                                            status === 'full' ? 'bg-cream-dark text-ink-muted opacity-50 cursor-not-allowed' :
                                            status === 'past' ? 'text-ink-muted/40 cursor-not-allowed' :
                                            'hover:bg-brand-blue/10 hover:text-brand-blue'
                                        }`}
                                    >
                                        {day}
                                        {status === 'full' && <div className="text-[10px] leading-none mt-0.5 opacity-70">Full</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {step === 'time' && (
                <div>
                    <button onClick={() => setStep('date')} className="text-sm text-ink-muted hover:text-brand-blue mb-6 flex items-center gap-1 no-underline">
                        ← Back
                    </button>
                    <h3 className="font-display text-2xl text-ink mb-1">Pick a time</h3>
                    <p className="text-ink-muted mb-6">For your meetup on <strong>{formatDisplayDate(booking.date)}</strong></p>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
                        {TIME_SLOTS.map((slot) => (
                            <button
                                key={slot}
                                onClick={() => setBooking({ ...booking, time: slot })}
                                className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                                    booking.time === slot
                                        ? 'bg-brand-blue text-white border-brand-blue'
                                        : 'border-parchment text-ink hover:border-brand-blue hover:text-brand-blue'
                                }`}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="timezone">Your timezone</label>
                        <select
                            id="timezone"
                            value={booking.timezone}
                            onChange={(e) => setBooking({ ...booking, timezone: e.target.value })}
                            className="input"
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setStep('details')}
                        disabled={!booking.time}
                        className="btn btn-lg w-full"
                    >
                        Continue
                    </button>
                </div>
            )}

            {step === 'details' && (
                <div>
                    <button onClick={() => setStep('time')} className="text-sm text-ink-muted hover:text-brand-blue mb-6 flex items-center gap-1 no-underline">
                        ← Back
                    </button>
                    <h3 className="font-display text-2xl text-ink mb-1">Your details</h3>
                    <p className="text-ink-muted mb-6">Tell us about yourself and where the meetup will be.</p>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="name">Your name *</label>
                            <input
                                id="name" type="text" required
                                value={booking.name}
                                onChange={(e) => setBooking({ ...booking, name: e.target.value })}
                                placeholder="Jane Smith"
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="email">Email address *</label>
                            <input
                                id="email" type="email" required
                                value={booking.email}
                                onChange={(e) => setBooking({ ...booking, email: e.target.value })}
                                placeholder="jane@example.com"
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="phone">Phone number <span className="text-ink-muted font-normal">(optional)</span></label>
                            <input
                                id="phone" type="tel"
                                value={booking.phone}
                                onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="location">Venue / location *</label>
                            <input
                                id="location" type="text" required
                                value={booking.location}
                                onChange={(e) => setBooking({ ...booking, location: e.target.value })}
                                placeholder="e.g. Main Street Library, Meeting Room B"
                                className="input"
                            />
                            <p className="text-xs text-ink-muted mt-1.5">Where will the meetup be held? Include the address if possible.</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setStep('confirm')}
                        disabled={!booking.name || !booking.email || !booking.location}
                        className="btn btn-lg w-full mt-8"
                    >
                        Review Booking
                    </button>
                </div>
            )}

            {step === 'confirm' && (
                <div>
                    <button onClick={() => setStep('details')} className="text-sm text-ink-muted hover:text-brand-blue mb-6 flex items-center gap-1 no-underline">
                        ← Back
                    </button>
                    <h3 className="font-display text-2xl text-ink mb-1">Confirm your meetup</h3>
                    <p className="text-ink-muted mb-8">Looks great! Here's a summary before you submit.</p>

                    <div className="bg-white rounded-2xl border border-parchment p-8 space-y-4 mb-8">
                        <div className="flex justify-between text-sm">
                            <span className="text-ink-muted">Date</span>
                            <span className="font-medium text-ink">{formatDisplayDate(booking.date)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-parchment pt-4">
                            <span className="text-ink-muted">Time</span>
                            <span className="font-medium text-ink">{booking.time} ({TIMEZONES.find(t => t.value === booking.timezone)?.label})</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-parchment pt-4">
                            <span className="text-ink-muted">Location</span>
                            <span className="font-medium text-ink text-right max-w-xs">{booking.location}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-parchment pt-4">
                            <span className="text-ink-muted">Name</span>
                            <span className="font-medium text-ink">{booking.name}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-parchment pt-4">
                            <span className="text-ink-muted">Email</span>
                            <span className="font-medium text-ink">{booking.email}</span>
                        </div>
                        {booking.phone && (
                            <div className="flex justify-between text-sm border-t border-parchment pt-4">
                                <span className="text-ink-muted">Phone</span>
                                <span className="font-medium text-ink">{booking.phone}</span>
                            </div>
                        )}
                    </div>

                    {error && <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-xl p-4">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn btn-lg w-full"
                    >
                        {submitting ? 'Submitting...' : 'Confirm Meetup'}
                    </button>
                </div>
            )}
        </div>
    );
}
