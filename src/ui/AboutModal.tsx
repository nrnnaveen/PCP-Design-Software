/**
 * FloZ ECA — Official Information, Documentation, FAQ & Support Dialog
 * Contains comprehensive authentic details for:
 * 1. About FloZ ECA
 * 2. About FloZ
 * 3. FloZ AI
 * 4. Features
 * 5. How FloZ ECA Works
 * 6. AI-Generated Design Disclaimer
 * 7. Frequently Asked Questions (FAQ)
 * 8. Contact & Support
 */

import React, { useState, useEffect } from 'react';
import {
  Info,
  Layers,
  Sparkles,
  CheckCircle2,
  GitMerge,
  ShieldAlert,
  HelpCircle,
  Mail,
  X,
  Send,
  ExternalLink,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { siteConfig } from '../config/siteConfig';
import { LogoMark } from '../components/branding/LogoMark';
import {
  GithubIcon,
  LinkedinIcon,
  DiscordIcon,
  InstagramIcon,
} from '../components/common/SocialIcons';

export type AboutTabId =
  | 'about-eca'
  | 'about-floz'
  | 'floz-ai'
  | 'features'
  | 'how-it-works'
  | 'disclaimer'
  | 'faq'
  | 'contact';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AboutTabId;
}

export const AboutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'about-eca',
}) => {
  const [activeTab, setActiveTab] = useState<AboutTabId>(initialTab);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackSubject, setFeedbackSubject] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const TABS = [
    { id: 'about-eca' as AboutTabId, label: 'About FloZ ECA', icon: Info },
    { id: 'about-floz' as AboutTabId, label: 'About FloZ', icon: Layers },
    { id: 'floz-ai' as AboutTabId, label: 'FloZ AI', icon: Sparkles },
    { id: 'features' as AboutTabId, label: 'Features', icon: CheckCircle2 },
    { id: 'how-it-works' as AboutTabId, label: 'How It Works', icon: GitMerge },
    { id: 'disclaimer' as AboutTabId, label: 'AI Disclaimer', icon: ShieldAlert },
    { id: 'faq' as AboutTabId, label: 'FAQ', icon: HelpCircle },
    { id: 'contact' as AboutTabId, label: 'Contact & Support', icon: Mail },
  ];

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubject('');
      setFeedbackMessage('');
      setFeedbackSubmitted(false);
    }, 4000);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="about-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop select-none p-3 sm:p-4"
    >
      <div className="bg-cad-panel border border-cad-border w-[860px] max-w-full h-[85vh] max-h-[700px] rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <LogoMark size={24} />
            <div>
              <div className="flex items-center gap-2">
                <h2 id="about-dialog-title" className="text-sm font-bold text-cad-textHeading leading-none">
                  FloZ ECA
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-blue-500/10 text-blue-500 border border-blue-500/20 font-semibold">
                  v{siteConfig.version}
                </span>
              </div>
              <p className="text-[10px] text-cad-textMuted font-mono mt-0.5">
                AI-Integrated Electronic Design Automation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 hover:bg-cad-surfaceHover rounded-md text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Layout: Sidebar Tabs + Content Pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <nav className="w-full md:w-56 bg-cad-subpanel border-b md:border-b-0 md:border-r border-cad-border p-2 shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-left transition-all duration-fast shrink-0 md:w-full ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-surfaceHover'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-cad-textMuted'} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Content Pane */}
          <main className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6 text-xs text-cad-text leading-relaxed">
            {/* 1. About FloZ ECA */}
            {activeTab === 'about-eca' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">About FloZ ECA</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Electronics design, without the unnecessary headache.</p>
                </div>

                <p className="text-cad-text">
                  FloZ ECA is an AI-integrated electronic design automation platform built to make PCB design more accessible, practical, and less intimidating.
                </p>

                <p className="text-cad-textMuted">
                  Traditional PCB design can involve a lot of things at once — schematic capture, components, connections, footprints, board layout, routing, validation, and finally getting everything into a usable project. That&apos;s great when you already know what you&apos;re doing. It can feel like a completely different language when you&apos;re just getting started.
                </p>

                <p className="text-cad-text font-medium">That&apos;s where FloZ ECA comes in.</p>

                <p className="text-cad-text">
                  With <strong className="text-cad-textHeading font-semibold">FloZ AI</strong>, you can describe what you want to build in plain language. Instead of starting with a completely empty canvas and wondering which symbol to place first, you can explain your idea and let the AI help turn that idea into an editable electronics design.
                </p>

                <p className="text-cad-text italic">
                  And no, we&apos;re not trying to replace engineers. We&apos;re trying to make the first 30 minutes of a project considerably less painful.
                </p>

                <div className="space-y-2 pt-3 border-t border-cad-border">
                  <h4 className="text-xs font-bold text-cad-textHeading uppercase tracking-wider font-mono">
                    What makes FloZ ECA different?
                  </h4>
                  <p className="text-cad-textMuted">
                    FloZ ECA combines a familiar PCB/EDA workflow with AI assistance. You can:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-cad-text pl-1">
                    <li>Create and edit electronic schematics.</li>
                    <li>Work with components and connections.</li>
                    <li>Build PCB designs from your schematic.</li>
                    <li>Ask FloZ AI to create or modify designs using natural language.</li>
                    <li>Review and manually edit AI-generated designs.</li>
                    <li>Continue designing using traditional tools whenever you want.</li>
                    <li>Export your project for further development and manufacturing workflows.</li>
                  </ul>
                  <p className="text-cad-text font-medium pt-1">
                    The important part is that <strong className="text-cad-textHeading font-semibold">you stay in control</strong>. AI can help create the design. You can inspect it, change it, correct it, improve it, and decide what happens next.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-cad-border">
                  <h4 className="text-xs font-bold text-cad-textHeading uppercase tracking-wider font-mono">
                    Built for curious minds and serious projects.
                  </h4>
                  <p className="text-cad-textMuted">
                    Whether you&apos;re learning electronics, building a prototype, experimenting with an embedded system, or working on a more serious hardware project, FloZ ECA is designed to give you a faster starting point.
                  </p>
                  <p className="text-cad-text font-medium">
                    You bring the idea. FloZ helps you turn it into a design. Then you get to do the fun part — making sure it actually works.
                  </p>
                </div>

                <div className="p-3.5 bg-cad-subpanel border border-cad-border rounded-md space-y-1.5">
                  <h5 className="text-xs font-bold text-cad-textHeading">Our Philosophy</h5>
                  <p className="text-cad-textMuted">
                    We believe engineering software shouldn&apos;t require you to fight the software before you can start engineering.
                  </p>
                  <p className="font-bold text-cad-textHeading text-xs">
                    Describe it. Design it. Edit it. Build it.
                  </p>
                  <p className="text-[11px] text-cad-textMuted">
                    No magic promises. No &quot;one prompt will replace an entire engineering team.&quot; Just useful tools, intelligent assistance, and a better way to get from an idea to a PCB design.
                  </p>
                </div>
              </div>
            )}

            {/* 2. About FloZ */}
            {activeTab === 'about-floz' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">About FloZ</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">We build tools for people who like building things.</p>
                </div>

                <p className="text-cad-text">
                  FloZ is a technology-focused product and development brand creating software that makes complex digital and engineering workflows easier to use.
                </p>

                <p className="text-cad-textMuted">
                  Our goal isn&apos;t to make software look complicated just because the technology behind it is complicated. We prefer the opposite. We build products that are powerful underneath, but understandable on the surface.
                </p>

                <p className="text-cad-text font-medium">
                  FloZ ECA is one of those products — bringing AI assistance into electronic design so users can spend less time fighting complicated workflows and more time actually building.
                </p>

                <div className="space-y-2 pt-3 border-t border-cad-border">
                  <h4 className="text-xs font-bold text-cad-textHeading uppercase tracking-wider font-mono">
                    Why FloZ exists
                  </h4>
                  <p className="text-cad-textMuted">
                    Technology keeps getting more powerful. Unfortunately, the interfaces don&apos;t always get friendlier. We think they should.
                  </p>
                  <p className="text-cad-text">
                    FloZ exists to explore that gap — taking powerful technology and turning it into tools that people can actually enjoy using.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 bg-cad-subpanel border border-cad-border rounded text-center">
                      <span className="font-semibold text-blue-500">Sometimes</span> that means AI.
                    </div>
                    <div className="p-2 bg-cad-subpanel border border-cad-border rounded text-center">
                      <span className="font-semibold text-emerald-500">Sometimes</span> it means better design.
                    </div>
                    <div className="p-2 bg-cad-subpanel border border-cad-border rounded text-center">
                      <span className="font-semibold text-purple-500">Sometimes</span> it means the right button.
                    </div>
                  </div>
                  <p className="text-cad-textMuted text-[11px] pt-1">
                    We&apos;re working on all three.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-cad-border">
                  <h4 className="text-xs font-bold text-cad-textHeading uppercase tracking-wider font-mono">
                    Building for the next generation of creators
                  </h4>
                  <p className="text-cad-textMuted">
                    FloZ is particularly interested in tools that help students, developers, makers, engineers, and independent creators turn ideas into working projects.
                  </p>
                  <p className="text-cad-text font-medium">
                    We&apos;re still building. And yes, there will probably be bugs. The important part is that we&apos;re fixing them.
                  </p>
                </div>
              </div>
            )}

            {/* 3. FloZ AI */}
            {activeTab === 'floz-ai' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">FloZ AI</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Tell it what you&apos;re building.</p>
                </div>

                <p className="text-cad-text">
                  FloZ AI is the AI-powered design assistant inside FloZ ECA. Instead of requiring you to know every step before starting a project, you can describe your intended circuit or electronic system using natural language.
                </p>

                <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-md">
                  <span className="text-[10px] font-mono uppercase text-blue-500 font-bold block mb-1">Example Prompt</span>
                  <p className="text-xs font-mono font-medium text-cad-textHeading">
                    &quot;Create a temperature monitoring board using an ESP32, temperature sensor, OLED display and USB-C power.&quot;
                  </p>
                </div>

                <p className="text-cad-textMuted">
                  FloZ AI can use that description to help generate the initial design structure. From there, you can inspect the result and continue editing it inside FloZ ECA.
                </p>

                <div className="space-y-2 pt-3 border-t border-cad-border">
                  <h4 className="text-xs font-bold text-cad-textHeading uppercase tracking-wider font-mono">
                    AI is your assistant. You&apos;re still the engineer.
                  </h4>
                  <p className="text-cad-textMuted">
                    FloZ AI is designed to accelerate the design process, not make engineering decisions on your behalf without review.
                  </p>
                  <p className="text-cad-textMuted">
                    AI-generated designs can contain mistakes, incorrect assumptions, unsuitable components, missing connections, or other issues. That&apos;s why every generated design should be reviewed before it is used in a real hardware project.
                  </p>
                  <p className="text-cad-text font-semibold">
                    Think of FloZ AI as the extremely fast teammate who never gets tired of suggesting things. You should still check their work.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-cad-border">
                  <h4 className="text-xs font-bold text-cad-textHeading uppercase tracking-wider font-mono">
                    From prompt to PCB
                  </h4>
                  <div className="p-2.5 bg-cad-subpanel border border-cad-border rounded-md font-mono text-center text-xs font-bold text-cad-textHeading tracking-wide">
                    Describe → Generate → Review → Edit → Validate → Export
                  </div>
                  <p className="text-cad-textMuted pt-1">
                    You don&apos;t have to accept everything the AI creates. Change it. Delete it. Add components. Move things around. Rewrite the design. Make it yours. That&apos;s the whole point.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Features */}
            {activeTab === 'features' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">Features</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Everything you need to get from idea to board.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <Sparkles size={13} className="text-blue-500" />
                      AI-Assisted Design
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Describe your electronics project in natural language and let FloZ AI help create the initial design.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <Layers size={13} className="text-emerald-500" />
                      Schematic Capture
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Create, connect, inspect, and modify electronic schematics using the FloZ ECA editor.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <GitMerge size={13} className="text-purple-500" />
                      PCB Design
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Continue from your schematic into PCB development and work with your board layout.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <CheckCircle2 size={13} className="text-cyan-500" />
                      Editable AI Designs
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      AI-generated designs aren&apos;t locked screenshots. Open them, inspect them, modify them, and continue working on them yourself.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <Layers size={13} className="text-amber-500" />
                      Component-Based Workflow
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Build your designs around electronic components, symbols, connections, footprints, and board requirements.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <ShieldAlert size={13} className="text-red-500" />
                      Design Validation
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Review your design before taking it further. FloZ ECA helps identify potential issues, but validation results should always be reviewed by the designer.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <ExternalLink size={13} className="text-blue-500" />
                      Project Export
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Export your work into supported project and design formats for continued development.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                      <Sparkles size={13} className="text-emerald-500" />
                      Human + AI Workflow
                    </h5>
                    <p className="text-cad-textMuted text-[11px] leading-relaxed">
                      Use AI when you want it. Use traditional design tools when you want them. Use both when that makes the most sense.
                    </p>
                  </div>
                </div>

                <p className="text-cad-text font-medium text-[11px] italic pt-1">
                  Because sometimes the best AI feature is knowing when to get out of the way.
                </p>
              </div>
            )}

            {/* 5. How FloZ ECA Works */}
            {activeTab === 'how-it-works' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">How It Works</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">From &quot;I have an idea&quot; to &quot;I have a PCB.&quot;</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md flex items-start gap-3">
                    <span className="font-mono font-bold text-sm text-blue-500 shrink-0">01</span>
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-cad-textHeading text-xs">Describe your project</h5>
                      <p className="text-cad-textMuted text-[11px]">
                        Tell FloZ AI what you&apos;re trying to build. You don&apos;t need to write a 14-page specification just to get started.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md flex items-start gap-3">
                    <span className="font-mono font-bold text-sm text-blue-500 shrink-0">02</span>
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-cad-textHeading text-xs">Let FloZ AI build the starting point</h5>
                      <p className="text-cad-textMuted text-[11px]">
                        FloZ AI interprets your request and creates a design based on the information you&apos;ve provided.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md flex items-start gap-3">
                    <span className="font-mono font-bold text-sm text-blue-500 shrink-0">03</span>
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-cad-textHeading text-xs">Inspect the design</h5>
                      <p className="text-cad-textMuted text-[11px]">
                        Take a look at the generated schematic and project structure. Don&apos;t skip this step. Your circuit deserves at least one human pair of eyes.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md flex items-start gap-3">
                    <span className="font-mono font-bold text-sm text-blue-500 shrink-0">04</span>
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-cad-textHeading text-xs">Edit everything</h5>
                      <p className="text-cad-textMuted text-[11px]">
                        Change components, connections, values, layout, and other supported design elements. The AI created a starting point. You own the editing process.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md flex items-start gap-3">
                    <span className="font-mono font-bold text-sm text-blue-500 shrink-0">05</span>
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-cad-textHeading text-xs">Validate your design</h5>
                      <p className="text-cad-textMuted text-[11px]">
                        Check your design carefully before manufacturing or using it in real hardware.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md flex items-start gap-3">
                    <span className="font-mono font-bold text-sm text-blue-500 shrink-0">06</span>
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-cad-textHeading text-xs">Export</h5>
                      <p className="text-cad-textMuted text-[11px]">
                        When your project is ready, export it using the supported formats and continue with your preferred hardware workflow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md text-center">
                  <span className="font-mono font-bold text-xs text-cad-textHeading block">
                    Idea → AI → Schematic → PCB → Review → Export
                  </span>
                  <span className="text-[11px] text-cad-textMuted mt-0.5 block">That&apos;s FloZ ECA.</span>
                </div>
              </div>
            )}

            {/* 6. AI Disclaimer */}
            {activeTab === 'disclaimer' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">AI-Generated Design Disclaimer</h3>
                  <p className="text-xs text-amber-500 font-medium mt-0.5">Important engineering safety notice</p>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-2.5 text-xs">
                  <p className="text-cad-text">
                    FloZ AI can help generate electronic designs from natural-language instructions, but AI-generated output is not guaranteed to be accurate, complete, safe, or suitable for your specific application.
                  </p>
                  <p className="text-cad-textMuted">
                    Generated designs may contain errors such as incorrect components, pin assignments, values, connections, footprints, routing, or other technical assumptions.
                  </p>
                  <p className="text-cad-text font-semibold">
                    You are responsible for reviewing and validating every AI-generated design before using it.
                  </p>
                  <p className="text-cad-textMuted">
                    For real-world hardware, manufacturing, safety-critical, or high-risk applications, perform appropriate engineering review, simulation, electrical testing, and validation.
                  </p>
                </div>

                <div className="p-3.5 bg-cad-subpanel border border-cad-border rounded-md space-y-1 text-center">
                  <p className="font-semibold text-cad-textHeading text-xs">
                    FloZ AI helps you design faster. It does not remove the need to verify your design.
                  </p>
                  <p className="font-mono font-bold text-blue-500 text-xs mt-1">
                    Trust the workflow. Verify the circuit.
                  </p>
                </div>
              </div>
            )}

            {/* 7. FAQ */}
            {activeTab === 'faq' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">Frequently Asked Questions</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Everything you might wonder about FloZ ECA</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">What is FloZ ECA?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      FloZ ECA is an electronic design automation platform that combines traditional PCB design workflows with AI assistance.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">What is FloZ AI?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      FloZ AI is the AI-powered assistant inside FloZ ECA. It can interpret natural-language instructions and help generate or modify electronic design projects.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Do I need PCB design knowledge?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      Not necessarily. FloZ AI is designed to make getting started easier, even if you&apos;re still learning electronics. However, understanding electronics becomes increasingly important as your designs become more complex. AI can help you start. Learning helps you know whether the result makes sense.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Can I edit an AI-generated design?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      Yes. AI-generated designs are intended to be editable so you can inspect, modify, and continue developing them.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Can I export my designs?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      FloZ ECA supports project export through the formats and workflows currently available in the application.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Is FloZ AI always correct?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      No. And we&apos;d rather tell you that directly. AI can make mistakes. Always review and validate generated designs before using them.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Can I use FloZ ECA for real hardware?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      FloZ ECA can be used as part of a real hardware design workflow, but designs should always be properly reviewed, validated, tested, and prepared for manufacturing. For safety-critical applications, professional engineering review is strongly recommended.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Does FloZ own my designs?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      Your project content remains yours, subject to third-party rights and the permissions required to operate the service. See our Terms &amp; Conditions and Privacy Policy for more information.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Why should I use AI for PCB design?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      Because starting from a blank schematic can be surprisingly intimidating. FloZ AI can help turn an idea into a starting point faster, while still allowing you to take control and edit the result.
                    </p>
                  </div>

                  <div className="p-3 bg-cad-subpanel border border-cad-border rounded-md space-y-1">
                    <h5 className="font-semibold text-cad-textHeading text-xs">Is FloZ trying to replace PCB engineers?</h5>
                    <p className="text-cad-textMuted text-[11px]">
                      No. We&apos;re trying to make their tools better. There&apos;s still a human who needs to ask: <strong className="text-cad-textHeading">&quot;Why is this connected to that?&quot;</strong> And honestly, that&apos;s a pretty important person to keep around.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. Contact / Support */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-cad-textHeading">Contact &amp; Support</h3>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Need help? We&apos;re listening.</p>
                </div>

                <p className="text-cad-text">
                  Found a bug? Have an idea? Something behaving like it has a personal grudge against your PCB?
                </p>

                <p className="text-cad-textMuted">
                  Tell us what happened, what you expected to happen, and what actually happened. The more details you provide, the easier it is for us to reproduce and fix the problem.
                </p>

                {feedbackSubmitted ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-center space-y-1 animate-in fade-in duration-200">
                    <CheckCircle2 size={24} className="text-emerald-500 mx-auto" />
                    <h5 className="font-semibold text-cad-textHeading text-xs">Message Sent</h5>
                    <p className="text-[11px] text-cad-textMuted">
                      Thank you for the feedback. We&apos;re building FloZ ECA with users, not just for users.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSendFeedback} className="space-y-3 p-3.5 bg-cad-subpanel border border-cad-border rounded-md">
                    <span className="font-semibold text-cad-textHeading text-xs block">
                      Send Direct Feedback or Report an Issue
                    </span>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-cad-textMuted">Subject</label>
                      <input
                        type="text"
                        value={feedbackSubject}
                        onChange={(e) => setFeedbackSubject(e.target.value)}
                        placeholder="e.g. Wire connection behavior on multi-sheet"
                        className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] text-cad-textMuted">What happened? (Details)</label>
                      <textarea
                        rows={4}
                        required
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Tell us what happened, what you expected to happen, and what actually happened..."
                        className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Send size={13} />
                      <span>Send Feedback</span>
                    </button>
                  </form>
                )}

                <div className="pt-3 border-t border-cad-border space-y-2">
                  <h4 className="text-xs font-semibold text-cad-textHeading">
                    Official Communication &amp; Social Channels
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {siteConfig.contactEmail && (
                      <a
                        href={`mailto:${siteConfig.contactEmail}`}
                        className="p-2.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded flex items-center justify-between text-cad-text transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail size={15} className="text-emerald-500 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-cad-textHeading">Official Email</div>
                            <div className="text-[11px] text-cad-textMuted font-mono truncate">{siteConfig.contactEmail}</div>
                          </div>
                        </div>
                        <ExternalLink size={13} className="text-cad-textMuted shrink-0 ml-1.5" />
                      </a>
                    )}

                    {siteConfig.social.github && (
                      <a
                        href={siteConfig.social.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded flex items-center justify-between text-cad-text transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GithubIcon size={15} className="text-cad-text shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-cad-textHeading">GitHub</div>
                            <div className="text-[11px] text-cad-textMuted truncate">FloZ-Official</div>
                          </div>
                        </div>
                        <ExternalLink size={13} className="text-cad-textMuted shrink-0 ml-1.5" />
                      </a>
                    )}

                    {siteConfig.social.linkedin && (
                      <a
                        href={siteConfig.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded flex items-center justify-between text-cad-text transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <LinkedinIcon size={15} className="text-blue-500 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-cad-textHeading">LinkedIn</div>
                            <div className="text-[11px] text-cad-textMuted truncate">FloZ Hub</div>
                          </div>
                        </div>
                        <ExternalLink size={13} className="text-cad-textMuted shrink-0 ml-1.5" />
                      </a>
                    )}

                    {siteConfig.social.discord && (
                      <a
                        href={siteConfig.social.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded flex items-center justify-between text-cad-text transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <DiscordIcon size={15} className="text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-cad-textHeading">Discord Community</div>
                            <div className="text-[11px] text-cad-textMuted truncate">Join FloZ Server</div>
                          </div>
                        </div>
                        <ExternalLink size={13} className="text-cad-textMuted shrink-0 ml-1.5" />
                      </a>
                    )}

                    {siteConfig.social.instagram && (
                      <a
                        href={siteConfig.social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded flex items-center justify-between text-cad-text transition-colors sm:col-span-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <InstagramIcon size={15} className="text-pink-500 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-cad-textHeading">Instagram</div>
                            <div className="text-[11px] text-cad-textMuted truncate">@floz.official</div>
                          </div>
                        </div>
                        <ExternalLink size={13} className="text-cad-textMuted shrink-0 ml-1.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer */}
        <div className="h-11 bg-cad-header border-t border-cad-border px-4 flex items-center justify-between shrink-0 text-xs">
          <div className="text-[11px] text-cad-textMuted font-mono">
            &copy; {new Date().getFullYear()} {siteConfig.companyName}
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-xs transition-colors duration-fast focus-visible:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
