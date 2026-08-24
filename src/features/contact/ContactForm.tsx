'use client';

import { useState } from 'react';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-bold text-ink mb-2">ধন্যবাদ!</h2>
        <p className="text-sm text-ink-muted">আপনার বার্তা পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করবো।</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
      className="card p-5 space-y-4"
    >
      <div>
        <label htmlFor="contact_name" className="block text-xs text-ink-muted mb-1">নাম</label>
        <input id="contact_name" name="name" required className="input" />
      </div>
      <div>
        <label htmlFor="contact_email" className="block text-xs text-ink-muted mb-1">ইমেইল</label>
        <input id="contact_email" name="email" type="email" required className="input" style={{ fontFamily: 'var(--font-latin)' }} />
      </div>
      <div>
        <label htmlFor="contact_subject" className="block text-xs text-ink-muted mb-1">বিষয়</label>
        <select id="contact_subject" name="subject" className="input">
          <option value="general">সাধারণ</option>
          <option value="correction">তথ্য সংশোধন</option>
          <option value="partnership">সহযোগিতা</option>
          <option value="feedback">মতামত</option>
          <option value="other">অন্যান্য</option>
        </select>
      </div>
      <div>
        <label htmlFor="contact_message" className="block text-xs text-ink-muted mb-1">বার্তা</label>
        <textarea id="contact_message" name="message" required rows={5} className="input" />
      </div>
      <button type="submit" className="btn btn-primary w-full">বার্তা পাঠান</button>
    </form>
  );
}
