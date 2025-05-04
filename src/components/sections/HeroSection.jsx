'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FadeIn, ScaleIn, SlideIn, StaggerContainer, StaggerItem, GradientButton } from '@/components/ui/motion';

export default function HeroSection() {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-teal-500/20 opacity-90" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <FadeIn className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            The AI Code Editor
          </h1>
          <SlideIn delay={0.2} className="mb-10">
            <p className="text-lg md:text-xl text-white/80">
              Built to make you extraordinarily productive, Xen.ai is the best way to code with AI.
            </p>
          </SlideIn>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <GradientButton delay={0.3} asChild>
              <Link href="/dashboard">
                <Button className="w-full sm:w-auto flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 1.5c-1.921 0-3.816.111-5.68.327-1.497.174-2.57 1.46-2.57 2.93V21.5h16.5V4.757c0-1.47-1.073-2.756-2.57-2.93A45.911 45.911 0 0012 1.5zm-.97 6.53a.75.75 0 10-1.06-1.06L7.72 9.22a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06l-.97-.97h3.065a1.875 1.875 0 010 3.75H12a.75.75 0 000 1.5h1.125a3.375 3.375 0 100-6.75h-3.065l.97-.97z" />
                  </svg>
                  <span>OPEN EDITOR</span>
                </Button>
              </Link>
            </GradientButton>
            <GradientButton delay={0.4} asChild>
              <Link href="/login">
                <Button variant="outline" className="w-full sm:w-auto uppercase">
                  LOGIN
                </Button>
              </Link>
            </GradientButton>
            <GradientButton delay={0.5} asChild>
              <Link href="/register">
                <Button variant="outline" className="w-full sm:w-auto uppercase">
                  SIGN UP
                </Button>
              </Link>
            </GradientButton>
          </div>
        </FadeIn>
      </div>

      {/* Editor Preview */}
      <div className="container mx-auto px-4 md:px-6 mt-10 relative z-10">
        <ScaleIn delay={0.8} className="max-w-5xl mx-auto">
          <div className="rounded-lg overflow-hidden border border-white/10 shadow-2xl">
            <div className="w-full h-8 bg-zinc-900 flex items-center justify-between px-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex space-x-4">
                <div className="text-xs text-gray-400 px-3 py-1 rounded bg-zinc-800">mod.rs</div>
                <div className="text-xs text-gray-400 px-3 py-1 rounded bg-zinc-800">CHAT</div>
                <div className="text-xs text-gray-400 px-3 py-1 rounded bg-zinc-800">COMPOSER</div>
              </div>
              <div className="flex space-x-2">
                <div className="w-4 h-4 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex bg-zinc-950 w-full">
              <div className="w-1/2 border-r border-white/10">
                <div className="p-4 text-xs text-gray-400 font-mono">
                  <div className="flex">
                    <span className="text-gray-600 mr-4">1</span>
                    <span><span className="text-purple-400">impl</span><span className="text-blue-400">&lt;'a&gt;</span> <span className="text-green-400">TransportStack</span></span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 mr-4">2</span>
                    <span>&nbsp;&nbsp;<span className="text-purple-400">fn</span> <span className="text-yellow-400">upgrade_listeners</span>(<span className="text-blue-400">&amp;mut</span> <span className="text-blue-400">self</span></span>
                  </div>
                  <div className="flex bg-red-900/30">
                    <span className="text-gray-600 mr-4">3</span>
                    <span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-red-400">upgrade_listeners</span>.<span className="text-yellow-400">Optional</span>.<span className="text-yellow-400">listen</span>();</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 mr-4">4</span>
                    <span>&nbsp;&nbsp;</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-600 mr-4">5</span>
                    <span></span>
                  </div>
                </div>
              </div>
              <div className="w-1/2 p-4 bg-zinc-900">
                <div className="mb-2 flex items-center">
                  <span className="text-xs text-gray-400 font-mono mr-2">mod.rs</span>
                  <span className="text-xs text-gray-500">Current File</span>
                </div>
                <div className="mb-4 text-sm text-gray-300">
                  Could you make it easier to switch certificates in the transport listeners?
                </div>
                <div className="p-3 bg-zinc-800 rounded-lg mb-4 text-sm text-gray-300">
                  I'll help modify the code to make certificate switching more flexible. The main changes will be to enhance the <span className="text-blue-400">TransportStack</span> trait and modify how certificates are handled in the <span className="text-blue-400">TLSSettings</span>. Here are the key changes:
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <span>mod.rs</span>
                    <span>•</span>
                    <span>⌘K</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>↑ Copy</span>
                    <span>↓ Apply</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScaleIn>
      </div>
      
      {/* Trusted by section */}
      <div className="container mx-auto px-4 md:px-6 mt-16 relative z-10">
        <SlideIn delay={0.5} direction="up" className="text-center">
          <p className="text-sm text-white/60 mb-6">Trusted by engineers at</p>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-5 gap-8 items-center justify-items-center max-w-3xl mx-auto">
            {[
              { name: "OpenAI" },
              { name: "Perplexity" },
              { name: "Samsung" },
              { name: "Apple" },
              { name: "Ramp" }
            ].map((logo, index) => (
              <StaggerItem key={logo.name} delay={0.1 * index}>
                <div className="h-7 w-auto opacity-70 hover:opacity-100 transition-opacity font-bold text-white/70">
                  {logo.name}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </SlideIn>
      </div>
    </section>
  );
}