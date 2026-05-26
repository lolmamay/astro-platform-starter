import { useState } from 'react';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
    const [status, setStatus] = useState<Status>('idle');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus('sending');
        const form = e.currentTarget;
        const data = new FormData(form);
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.get('name'),
                    email: data.get('email'),
                    message: data.get('message'),
                }),
            });
            if (res.ok) {
                setStatus('success');
                form.reset();
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    }

    if (status === 'success') {
        return (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-8 text-center">
                <div className="text-4xl mb-3">💌</div>
                <p className="font-semibold text-green-800 mb-1">Message sent!</p>
                <p className="text-green-700 text-sm">Thank you for reaching out — we'll be in touch soon.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="contact-name">Your name</label>
                <input id="contact-name" name="name" type="text" required placeholder="Jane Smith" className="input" />
            </div>
            <div>
                <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="contact-email">Email address</label>
                <input id="contact-email" name="email" type="email" required placeholder="jane@example.com" className="input" />
            </div>
            <div>
                <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="contact-message">Message</label>
                <textarea id="contact-message" name="message" rows={5} required placeholder="How can we help?" className="input resize-none" />
            </div>

            {status === 'error' && (
                <p className="text-red-600 text-sm bg-red-50 rounded-xl p-4">
                    Something went wrong. Please try emailing us directly at <a href="mailto:hello@hellobyhand.org" className="underline">hello@hellobyhand.org</a>.
                </p>
            )}

            <button type="submit" disabled={status === 'sending'} className="btn btn-lg w-full">
                {status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
        </form>
    );
}
