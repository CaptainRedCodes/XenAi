'use client';

import { FadeIn, SlideIn } from '@/components/ui/motion';

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-24">
        <FadeIn className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
            Contact Us
          </h1>
          <SlideIn delay={0.2}>
            <p className="text-lg md:text-xl text-white/80 mb-6">
              Have questions, feedback, or need support? We're here to help!
            </p>
            <p className="text-lg text-white/70">
              Email us at <a href="mailto:mdzub7@gmail.com" className="underline text-blue-400">mdzub7@gmail.com</a> and our team will get back to you as soon as possible.
            </p>
          </SlideIn>
        </FadeIn>
      </div>
    </div>
  );
} 