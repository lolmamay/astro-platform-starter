import { useState } from 'react';

type NavItem = { linkText: string; href: string };

export default function NavMenu({ items }: { items: NavItem[] }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="md:hidden">
            <button
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                className="p-2 text-ink-light hover:text-brand-blue transition-colors"
            >
                {open ? (
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                )}
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 bg-cream border-b border-parchment shadow-lg px-6 py-5 flex flex-col gap-4 z-50">
                    {items.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className="text-base font-medium text-ink-light hover:text-brand-blue transition-colors no-underline"
                            onClick={() => setOpen(false)}
                        >
                            {item.linkText}
                        </a>
                    ))}
                    <a href="/book" className="btn text-center" onClick={() => setOpen(false)}>
                        Host a Meetup
                    </a>
                </div>
            )}
        </div>
    );
}
