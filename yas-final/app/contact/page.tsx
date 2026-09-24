"use client";

import { useActionState } from "react";
import { SiteNav } from "@/components/navigation/site-nav";
import { SiteFooter } from "@/components/navigation/site-footer";
import { PageHero } from "@/components/ui/page-hero";
import { submitContactFormAction, type ContactFormState } from "@/lib/actions/contact";

const initialState: ContactFormState = {};

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(submitContactFormAction, initialState);

  return (
    <>
      <SiteNav />
      <PageHero
        eyebrow="Get In Touch"
        title="Contact YAS."
        subtitle="For partnership enquiries, media requests, or general questions."
        trail={[{ label: "Contact" }]}
      />
      <section className="px-6 py-18 md:px-10">
        <div className="mx-auto max-w-[560px]">
          {state.success ? (
            <div className="rounded-[2px] border border-navy-deep/20 bg-off-white px-6 py-8">
              <p className="font-serif text-xl text-navy-deep">Message sent.</p>
              <p className="mt-2 text-sm text-ink-soft">
                Thank you for reaching out — we&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-6">
              <div className="border-b border-hairline pb-3">
                <label htmlFor="name" className="sr-only">Name</label>
                <input
                  id="name"
                  name="name"
                  placeholder="Name"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  disabled={isPending}
                />
                {state.fieldErrors?.name && <p className="mt-2 text-xs text-red-600">{state.fieldErrors.name}</p>}
              </div>
              <div className="border-b border-hairline pb-3">
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  disabled={isPending}
                />
                {state.fieldErrors?.email && <p className="mt-2 text-xs text-red-600">{state.fieldErrors.email}</p>}
              </div>
              <div className="border-b border-hairline pb-3">
                <label htmlFor="message" className="sr-only">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="Message"
                  className="w-full resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  disabled={isPending}
                />
                {state.fieldErrors?.message && <p className="mt-2 text-xs text-red-600">{state.fieldErrors.message}</p>}
              </div>

              {state.error && (
                <p className="rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-[2px] bg-navy-deep px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-navy-mid disabled:opacity-60"
              >
                {isPending ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
